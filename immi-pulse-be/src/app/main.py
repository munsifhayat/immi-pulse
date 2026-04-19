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
        title="IMMI-PULSE API",
        description="AI-powered immigration consulting platform.",
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
            {"name": "Cases", "description": "Case management (consultant-facing)"},
            {"name": "Client Portal", "description": "Secure document upload portal (no auth)"},
            {"name": "Marketplace", "description": "Agents directory, applications, and approvals"},
            {"name": "Community", "description": "Threads, comments, and moderation"},
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
        }

    @app.get(f"{settings.api_v1_prefix}/config", tags=["System"])
    async def get_config():
        return {
            "monitored_mailboxes": settings.monitored_mailbox_list,
            "excluded_mailboxes": settings.excluded_mailbox_list,
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

    # Immigration domain — cases + client portal + marketplace + community
    from app.agents.immigration.cases.router import router as cases_router
    from app.agents.immigration.cases.portal_router import router as client_portal_router
    from app.agents.immigration.community.router import router as community_router
    from app.agents.immigration.marketplace.router import router as marketplace_router

    app.include_router(cases_router, prefix=settings.api_v1_prefix)
    app.include_router(client_portal_router, prefix=settings.api_v1_prefix)
    app.include_router(marketplace_router, prefix=settings.api_v1_prefix)
    app.include_router(community_router, prefix=settings.api_v1_prefix)

    # Activity log & metrics
    from app.agents.shared.activity_router import router as activity_router
    app.include_router(activity_router, prefix=settings.api_v1_prefix)

    # E2E testing
    from app.testing.router import router as test_router
    app.include_router(test_router, prefix=settings.api_v1_prefix)

    # Lawyer showcase demo endpoints
    from app.demo.router import router as demo_router
    app.include_router(demo_router, prefix=settings.api_v1_prefix)

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
