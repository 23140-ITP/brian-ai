import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openrouter_vision_model: str = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash")
    use_openrouter: bool = os.getenv("BRIAN_AI_USE_OPENROUTER", "").lower() in {"1", "true", "yes"}
    neo4j_uri: str = os.getenv("NEO4J_URI", "")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "")
    chroma_path: str = os.getenv("CHROMA_PATH", "/data/chroma")
    allow_origins: str = os.getenv("ALLOW_ORIGINS", "http://localhost:5173")
    environment: str = os.getenv("ENVIRONMENT", "development")
    frontend_public_url: str = os.getenv("FRONTEND_PUBLIC_URL", "")
    backend_public_url: str = os.getenv("BACKEND_PUBLIC_URL", "")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allow_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
