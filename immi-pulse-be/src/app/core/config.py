from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "IMMI-PULSE"
    environment: str = "development"
    api_key: str = "change-me"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/immi_pulse"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 10
    db_pool_recycle: int = 1800
    db_pool_pre_ping: bool = True

    @property
    def async_database_url(self) -> str:
        """Convert database URL to async format for Heroku compatibility."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    # --- AWS Bedrock ---
    # Region is Sydney for data residency. Models use cross-region inference profiles
    # so the actual inference can route to whichever region has capacity.
    # `global.*` is cheaper (~10%) and available in more regions; `apac.*` keeps
    # routing inside Asia-Pacific only. Override via env in any region-sensitive deploy.
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-southeast-2"
    bedrock_analyzer_model: str = "global.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_drafter_model: str = "apac.anthropic.claude-sonnet-4-5-20250929-v1:0"

    # --- AWS S3 (document storage) ---
    aws_s3_bucket: str | None = None
    aws_s3_region: str | None = None  # Defaults to aws_region when unset
    local_upload_dir: str = "./uploads"

    # --- Client Portal Auth ---
    # Secrets must be overridden via .env in any non-dev environment.
    portal_secret_key: str = "change-me-portal-secret-at-least-32-chars-long"
    portal_token_max_age_days: int = 7
    portal_session_jwt_secret: str = "change-me-session-jwt-secret-at-least-32-chars"
    portal_session_ttl_minutes: int = 15
    portal_pin_max_attempts: int = 5

    # --- Console JWT (multi-tenant Owner/Seat auth) ---
    # Dedicated secret. Falls back to portal_session_jwt_secret in dev only.
    jwt_secret: str = ""

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.portal_session_jwt_secret

    # --- Microsoft 365 ---
    microsoft_client_id: str | None = None
    microsoft_client_secret: str | None = None
    microsoft_tenant_id: str | None = None

    @property
    def microsoft_configured(self) -> bool:
        return bool(
            self.microsoft_client_id
            and self.microsoft_client_secret
            and self.microsoft_tenant_id
        )

    @property
    def microsoft_app_configured(self) -> bool:
        """Check if Azure AD app credentials are set (tenant_id not required for OAuth flow)."""
        return bool(self.microsoft_client_id and self.microsoft_client_secret)

    # --- Frontend ---
    frontend_url: str = "http://localhost:3000"

    # --- Encryption ---
    encryption_key: str = "change-me-encryption-key"

    # --- Scheduler ---
    timezone: str = "Australia/Sydney"
    polling_interval_minutes: int = 5
    polling_lookback_minutes: int = 10

    # --- Mailbox Config ---
    monitored_mailboxes: str = ""
    excluded_mailboxes: str = ""

    # --- Webhook ---
    public_webhook_base_url: str | None = None

    # --- CORS ---
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def effective_cors_origins(self) -> list[str]:
        if self.cors_allowed_origins:
            return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]
        return ["http://localhost:3000"]

    @property
    def monitored_mailbox_list(self) -> list[str]:
        if not self.monitored_mailboxes:
            return []
        return [m.strip().lower() for m in self.monitored_mailboxes.split(",") if m.strip()]

    @property
    def excluded_mailbox_list(self) -> list[str]:
        if not self.excluded_mailboxes:
            return []
        return [m.strip().lower() for m in self.excluded_mailboxes.split(",") if m.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
