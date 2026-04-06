from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "Property Pulse"
    environment: str = "development"
    api_key: str = "change-me"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/property_pulse"
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
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-southeast-2"
    bedrock_analyzer_model: str = "anthropic.claude-3-5-haiku-20241022-v1:0"
    bedrock_drafter_model: str = "anthropic.claude-sonnet-4-6"

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
    p1_summary_time: str = "16:00"
    emergent_work_interval_hours: int = 2
    timezone: str = "Australia/Sydney"
    polling_interval_minutes: int = 5
    polling_lookback_minutes: int = 10

    # --- Mailbox Config ---
    monitored_mailboxes: str = ""
    excluded_mailboxes: str = ""
    invoice_folder_name: str = "Invoice Folder #1"
    maintenance_inbox: str = ""
    invoice_auto_move_enabled: bool = False

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

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
