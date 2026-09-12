from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AudioCoach AI"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/audiocoach"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # File storage (S3-compatible — works with Cloudflare R2)
    storage_backend: str = "local"  # "local" | "s3"
    upload_dir: str = "uploads"
    s3_endpoint_url: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "audiocoach-uploads"
    s3_region: str = "auto"
    max_file_size_mb: int = 200

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Credits
    free_analyses_per_day: int = 1
    signup_bonus_credits: int = 5

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    cors_origin_regex: str = r"^https://.*\.vercel\.app$"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_s3_storage(self) -> bool:
        return self.storage_backend.lower() == "s3" or bool(self.s3_access_key and self.s3_secret_key)

    def _normalize_redis_url(self, url: str) -> str:
        if not url:
            return url
        # Upstash Redis only supports database 0
        if "upstash.io" in url or url.startswith("rediss://"):
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(url)
            return urlunparse((parsed.scheme, parsed.netloc, "/0", parsed.params, parsed.query, parsed.fragment))
        return url

    @property
    def effective_celery_broker_url(self) -> str:
        url = self.celery_broker_url
        if not url or url in ("redis://localhost:6379/1", "redis://redis:6379/1"):
            if self.redis_url and self.redis_url not in ("redis://localhost:6379/0", "redis://redis:6379/0"):
                url = self.redis_url
        return self._normalize_redis_url(url or self.redis_url)

    @property
    def effective_celery_result_backend(self) -> str:
        url = self.celery_result_backend
        if not url or url in ("redis://localhost:6379/2", "redis://redis:6379/2"):
            if self.redis_url and self.redis_url not in ("redis://localhost:6379/0", "redis://redis:6379/0"):
                url = self.redis_url
        return self._normalize_redis_url(url or self.redis_url)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
