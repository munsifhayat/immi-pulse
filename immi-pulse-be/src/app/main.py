import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.api_key_auth import APIKeyAuthMiddleware

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(
        title="Property Pulse API",
        description="AI-powered email processing and automation for property management.",
        version="0.1.0",
        servers=[
            {"url": "http://localhost:8000", "description": "Development"},
        ],
        swagger_ui_parameters={
            "defaultModelsExpandDepth": 1,
            "displayRequestDuration": True,
            "filter": True,
            "tryItOutEnabled": True,
            "persistAuthorization": True,
        },
        openapi_tags=[
            {"name": "System", "description": "Health and configuration"},
            {"name": "Microsoft Integration", "description": "Microsoft 365 connection management"},
            {"name": "Invoice Agent", "description": "Invoice detection and folder management"},
            {"name": "P1 Classifier", "description": "Priority classification and SLA tracking"},
            {"name": "Emergent Work", "description": "Out-of-scope work detection"},
            {"name": "Compliance", "description": "Compliance radar and obligation tracking"},
            {"name": "Activity", "description": "Agent activity log and metrics"},
        ],
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.effective_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API Key auth middleware
    app.add_middleware(APIKeyAuthMiddleware)

    # Validation error handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        error_details = []
        for error in exc.errors():
            error_details.append({
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": str(error.get("msg")),
            })
        logger.error(f"Validation error on {request.method} {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": error_details},
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(request: Request, exc: ValidationError):
        error_details = []
        for error in exc.errors():
            error_details.append({
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": str(error.get("msg")),
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": error_details},
        )

    # --- Health & Config endpoints ---

    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "ok",
            "app": settings.app_name,
            "environment": settings.environment,
            "agents": {
                "invoice": True,
                "p1_classifier": True,
                "emergent_work": True,
                "compliance": True,
            },
        }

    @app.get(f"{settings.api_v1_prefix}/config", tags=["System"])
    async def get_config():
        return {
            "monitored_mailboxes": settings.monitored_mailbox_list,
            "excluded_mailboxes": settings.excluded_mailbox_list,
            "invoice_folder_name": settings.invoice_folder_name,
            "maintenance_inbox": settings.maintenance_inbox,
            "p1_summary_time": settings.p1_summary_time,
            "emergent_work_interval_hours": settings.emergent_work_interval_hours,
            "timezone": settings.timezone,
            "microsoft_configured": settings.microsoft_app_configured,
            "aws_configured": bool(
                settings.aws_access_key_id
                and settings.aws_secret_access_key
                and settings.aws_access_key_id not in ("placeholder", "change-me")
                and settings.aws_secret_access_key not in ("placeholder", "change-me")
            ),
        }

    # --- Include routers ---
    from app.integrations.microsoft.router import router as microsoft_router
    from app.integrations.microsoft.router import webhook_router

    app.include_router(microsoft_router, prefix=settings.api_v1_prefix)
    app.include_router(webhook_router, prefix=settings.api_v1_prefix)

    # Agent routers
    from app.agents.invoice.router import router as invoice_router
    app.include_router(invoice_router, prefix=settings.api_v1_prefix)

    from app.agents.p1_classifier.router import router as p1_router
    app.include_router(p1_router, prefix=settings.api_v1_prefix)

    from app.agents.emergent_work.router import router as emergent_work_router
    app.include_router(emergent_work_router, prefix=settings.api_v1_prefix)

    from app.agents.compliance.router import router as compliance_router
    app.include_router(compliance_router, prefix=settings.api_v1_prefix)

    # Activity log & metrics
    from app.agents.shared.activity_router import router as activity_router
    app.include_router(activity_router, prefix=settings.api_v1_prefix)

    # E2E testing
    from app.testing.router import router as test_router
    app.include_router(test_router, prefix=settings.api_v1_prefix)

    # --- Startup: seed mailboxes + scheduler ---
    from app.scheduler.jobs import shutdown_scheduler, start_scheduler

    async def _seed_mailboxes_from_env():
        """Auto-seed monitored mailboxes from env var if DB has none."""
        from app.db.session import get_async_session
        from app.integrations.microsoft.connection_service import ConnectionService

        if not settings.monitored_mailbox_list:
            return

        try:
            async with get_async_session() as db:
                existing = await ConnectionService.get_monitored_mailboxes(db)
                if existing:
                    return  # DB already has mailboxes

                if not settings.microsoft_tenant_id:
                    return

                connection = await ConnectionService.get_or_create_connection(db)
                for email in settings.monitored_mailbox_list:
                    await ConnectionService.add_mailbox(db, connection.id, email)
                    logger.info(f"Auto-seeded mailbox from env: {email}")
        except Exception as e:
            logger.warning(f"Failed to seed mailboxes from env: {e}")

    @app.on_event("startup")
    async def on_startup():
        await _seed_mailboxes_from_env()
        app.state.scheduler = start_scheduler()

    @app.on_event("shutdown")
    async def on_shutdown():
        shutdown_scheduler(getattr(app.state, "scheduler", None))

    return app


app = create_app()
