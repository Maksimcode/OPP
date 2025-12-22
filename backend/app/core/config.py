from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), env_file_encoding="utf-8")

    app_name: str = "Reverse Gantt"
    secret_key: str = "super-secret-change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    # Use /tmp on Hugging Face Spaces (writable directory)
    # Can be overridden via DATABASE_URL environment variable
    database_url: str = "sqlite:///./app.db"
    frontend_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
