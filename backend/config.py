"""
FilmMatch AI — Backend Configuration
Loads environment settings securely via Pydantic BaseSettings.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Root directory of the repository
ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App Information
    PROJECT_NAME: str = "FilmMatch AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,*"

    # TMDB Credentials
    TMDB_API_KEY: str = ""
    TMDB_READ_ACCESS_TOKEN: str = ""
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p"

    # Database (Target: PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/filmmatch"

    # Hybrid Recommendation Weights (Approved Baseline)
    DEFAULT_CONTENT_WEIGHT: float = 0.50
    DEFAULT_SENTIMENT_WEIGHT: float = 0.20
    DEFAULT_COLLAB_WEIGHT: float = 0.30

    # Cold Start Weights (Approved Baseline)
    COLD_START_CONTENT_WEIGHT: float = 0.65
    COLD_START_SENTIMENT_WEIGHT: float = 0.35
    COLD_START_COLLAB_WEIGHT: float = 0.00

    # Paths
    DATA_DIR: Path = ROOT_DIR / "data" / "movielens"

    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
