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

    # --- OpenAI (primary AI provider) ---
    # Analyzer = fast/cheap model used for classification + triage.
    # Drafter  = larger model used for summaries, analysis, and longer drafts.
    openai_api_key: str | None = None
    openai_analyzer_model: str = "gpt-4o-mini"
    openai_drafter_model: str = "gpt-4o"
    openai_request_timeout_seconds: float = 30.0

    @property
    def openai_configured(self) -> bool:
        return bool(self.openai_api_key)

    # --- AWS (S3 only — Bedrock retired) ---
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-southeast-2"

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

    # Persistent client-portal *account* sessions (the account flow that replaces
    # the per-action PIN). Longer-lived than the PIN session.
    portal_account_session_ttl_hours: int = 12
    portal_account_max_login_attempts: int = 8

    # --- Console JWT (multi-tenant Owner/Seat auth) ---
    # Dedicated secret. Falls back to portal_session_jwt_secret in dev only.
    jwt_secret: str = ""

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.portal_session_jwt_secret

    # --- Password storage hardening ---
    # Server-side pepper kept OUT of the database. A DB-only leak with the pepper
    # absent yields hashes that are useless for offline cracking. Rotate by
    # adding a new value, lazy rehash takes care of users at next login.
    password_pepper: str = ""
    password_bcrypt_rounds: int = 12
    # Block known-breached passwords (NIST SP 800-63B 5.1.1.2).
    # Uses Pwned Passwords k-anonymity: only the first 5 chars of a SHA-1 leave
    # the server, the password itself never does. Disable for offline / air-gapped
    # deployments.
    breach_check_enabled: bool = True
    breach_check_timeout_seconds: float = 2.5

    # --- Resend (transactional email) ---
    resend_api_key: str | None = None
    resend_from_email: str = "IMMI-PULSE <onboarding@resend.dev>"
    resend_reply_to: str | None = None

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key)

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
