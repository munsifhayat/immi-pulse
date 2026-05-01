"""
API Key Authentication Middleware

Validates X-API-Key header on all non-public endpoints.
Replaces JWT auth from AgentOS — single API key for Atlas integration.
"""

import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """Validates X-API-Key header for all protected endpoints."""

    PUBLIC_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/api/v1/integrations/microsoft/callback",
        "/api/v1/auth/signup",
        "/api/v1/auth/login",
        "/api/v1/public/invites/accept",
    }

    PUBLIC_PREFIXES = (
        "/api/v1/webhooks/",
        "/api/v1/client-portal/",
        "/api/v1/marketplace/public/",
        "/api/v1/community/public/",
        "/api/v1/public/q/",
    )

    async def dispatch(self, request: Request, call_next):
        # Skip auth for OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for public endpoints
        path = request.url.path
        if path in self.PUBLIC_PATHS or path.startswith(self.PUBLIC_PREFIXES):
            return await call_next(request)

        # Validate API key
        settings = get_settings()
        api_key = request.headers.get("X-API-Key")

        if not api_key:
            logger.warning(f"Missing API key for {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "X-API-Key header required"},
            )

        if api_key != settings.api_key:
            logger.warning(f"Invalid API key for {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Invalid API key"},
            )

        return await call_next(request)
