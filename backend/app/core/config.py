from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # Application
    app_name: str = "TripGuard"
    app_env: str = "development"

    # Security
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    access_token_expire_minutes: int = Field(
        default=30,
        ge=1,
        le=1440,
    )

    # Database
    database_url: str = "sqlite:///./tripguard.db"

    # Frontend / CORS
    frontend_url: str = "http://localhost:5173"

    # External API configuration
    api_timeout_seconds: float = Field(
        default=8.0,
        gt=0,
        le=60,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("app_env")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("SECRET_KEY cannot be empty")

        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("DATABASE_URL cannot be empty")

        return value.strip()

    @field_validator("frontend_url")
    @classmethod
    def validate_frontend_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")

        parsed = urlsplit(value)

        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "FRONTEND_URL must be a valid HTTP or HTTPS origin"
            )

        return value

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.app_env == "production":

            if self.secret_key == "CHANGE-ME-IN-PRODUCTION":
                raise ValueError(
                    "Set a strong SECRET_KEY before production deployment"
                )

            if len(self.secret_key) < 32:
                raise ValueError(
                    "Production SECRET_KEY must contain at least 32 characters"
                )

            if self.database_url.startswith("sqlite"):
                raise ValueError(
                    "Production must use a persistent PostgreSQL database"
                )

            if not self.frontend_url.startswith("https://"):
                raise ValueError(
                    "Production FRONTEND_URL must use HTTPS"
                )

        return self


settings = Settings()
