import os
from dataclasses import dataclass, field
from functools import lru_cache


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, str(default))))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    openrouter_api_key: str = field(default_factory=lambda: _env("OPENROUTER_API_KEY"))
    openrouter_base_url: str = field(default_factory=lambda: _env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"))
    openrouter_vision_model: str = field(default_factory=lambda: _env("OPENROUTER_VISION_MODEL", "openrouter/free"))
    openrouter_embedding_model: str = field(default_factory=lambda: _env("OPENROUTER_EMBEDDING_MODEL"))
    use_openrouter: bool = field(default_factory=lambda: _env("BRIAN_AI_USE_OPENROUTER").lower() in {"1", "true", "yes"})
    neo4j_uri: str = field(default_factory=lambda: _env("NEO4J_URI"))
    neo4j_user: str = field(default_factory=lambda: _env("NEO4J_USER", "neo4j"))
    neo4j_password: str = field(default_factory=lambda: _env("NEO4J_PASSWORD"))
    allow_origins: str = field(default_factory=lambda: _env("ALLOW_ORIGINS", "http://localhost:5173"))
    environment: str = field(default_factory=lambda: _env("ENVIRONMENT", "development"))
    frontend_public_url: str = field(default_factory=lambda: _env("FRONTEND_PUBLIC_URL"))
    backend_public_url: str = field(default_factory=lambda: _env("BACKEND_PUBLIC_URL"))
    write_token: str = field(default_factory=lambda: _env("BRIAN_AI_WRITE_TOKEN"))
    query_rate_limit: int = field(default_factory=lambda: _env_int("BRIAN_AI_QUERY_RATE_LIMIT", 30))
    write_rate_limit: int = field(default_factory=lambda: _env_int("BRIAN_AI_WRITE_RATE_LIMIT", 10))
    max_document_bytes: int = field(default_factory=lambda: _env_int("BRIAN_AI_MAX_DOCUMENT_BYTES", 10 * 1024 * 1024))
    max_image_bytes: int = field(default_factory=lambda: _env_int("BRIAN_AI_MAX_IMAGE_BYTES", 5 * 1024 * 1024))

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allow_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
