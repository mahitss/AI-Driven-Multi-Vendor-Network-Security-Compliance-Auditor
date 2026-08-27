"""
NetVigil Configuration & Environment Settings
Problem Statement: SIH26155 (NTRO)
"""
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Core Application Metadata
    PROJECT_NAME: str = "NetVigil"
    PROJECT_DESCRIPTION: str = "AI-Driven Multi-Vendor Network Security Compliance Auditor"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-insecure-secret-key-replace-in-production-sih26155"
    ALLOWED_HOSTS: Union[List[str], str] = ["*"]
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Database
    # Default: SQLite async database for development/testing if PostgreSQL is not active
    DATABASE_URL: str = "sqlite+aiosqlite:///./netvigil.db"
    SYNC_DATABASE_URL: str = "sqlite:///./netvigil.db"
    DB_ECHO: bool = False

    # Storage & Upload Rules
    STORAGE_PATH: str = "./storage/uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: Union[List[str], str] = [".cfg", ".conf", ".txt", ".log", ".set"]

    # AI Provider Settings (OpenRouter abstraction)
    AI_PROVIDER: str = "openrouter"  # "openrouter", "mock", "local"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    AI_MODEL: str = "anthropic/claude-3.5-sonnet"
    AI_TEMPERATURE: float = 0.0
    AI_MAX_TOKENS: int = 1500
    AI_TIMEOUT_SECONDS: int = 30
    CONFIDENCE_HIGH_THRESHOLD: float = 0.90
    CONFIDENCE_REVIEW_THRESHOLD: float = 0.70

    # Supabase Authentication & Identity Gateway Settings
    SUPABASE_URL: str = "https://cveymgeivgnjnwnxfveu.supabase.co"
    SUPABASE_ANON_KEY: str = "sb_publishable_-OjNhAi0G1ARbRjZEuZ3zQ_TM5pS0hN"
    SUPABASE_JWT_SECRET: str = ""
    AUTH_ENABLED: bool = True
    AUTH_AUDIENCE: str = "authenticated"

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        insecure_keys = [
            "dev-insecure-secret-key-replace-in-production-sih26155",
            "secret",
            "changeme",
            "default",
            "",
        ]
        if env == "production":
            if not v or v in insecure_keys or len(v) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: A strong, unguessable SECRET_KEY (minimum 32 characters) "
                    "must be explicitly configured via environment variable in production mode. Development default secret keys are strictly prohibited."
                )
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def assemble_allowed_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip().lower() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [i.strip().lower() for i in v]
        return [".cfg", ".conf", ".txt", ".log"]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def resolved_storage_path(self) -> Path:
        p = Path(self.STORAGE_PATH).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
