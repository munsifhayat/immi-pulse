"""Server entry point — Heroku and local development."""

import logging
import os

import uvicorn

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def main():
    settings = get_settings()

    if os.environ.get("DYNO"):
        # Heroku: TLS terminated at load balancer
        config = {
            "host": "0.0.0.0",
            "port": int(os.environ.get("PORT", 8000)),
            "log_level": "info",
            "access_log": True,
            "use_colors": False,
            "server_header": False,
            "forwarded_allow_ips": "*",
            "proxy_headers": True,
            "workers": 1,
            "limit_concurrency": 1000,
            "limit_max_requests": 10000,
            "timeout_keep_alive": 65,
        }
    else:
        # Local development
        config = {
            "host": "0.0.0.0",
            "port": 8000,
            "log_level": settings.log_level.lower(),
            "access_log": True,
            "reload": True,
            "reload_dirs": ["src"],
        }

    logger.info(f"Starting Property Pulse server in {settings.environment} mode")
    uvicorn.run("app.main:app", **config)


if __name__ == "__main__":
    main()
