from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PHOTO_SELECTOR_", env_file=".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "info"

    # Where downloaded model weights are cached.
    model_cache_dir: Path = Path.home() / ".cache" / "photo-selector" / "models"

    # CORS origins permitted to call the backend during dev.
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
settings.model_cache_dir.mkdir(parents=True, exist_ok=True)
