"""
NetVigil Configuration & Environment Settings
Problem Statement: SIH26155 (NTRO)
"""
import secrets
from pathlib import Path
from typing import Any, List, Union
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
    SECRET_KEY: str = "netvigil-soc-mission-control-secure-prod-key-9f8a7b6c5d4e3f2a1b0c"
    ALLOWED_HOSTS: Union[List[str], str] = ["*"]
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://ai-driven-multi-vendor-network-secu.vercel.app",
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

    # AI Provider Settings (OpenRouter / Gemini abstraction)
    AI_PROVIDER: str = "openrouter"  # "openrouter", "gemini", "mock", "local"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    GEMINI_API_KEY: str = ""
    AI_MODEL: str = "google/gemini-3.5"
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
        insecure_keys = [
            "dev-insecure-secret-key-replace-in-production-sih26155",
            "secret",
            "changeme",
            "default",
            "",
        ]
        if not v or v in insecure_keys:
            # Fallback to a cryptographically secure 256-bit hex token
            return secrets.token_hex(32)
        return v

    @field_validator("DEBUG", mode="before")
    @classmethod
    def validate_debug(cls, v: Any, info) -> bool:
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        if env == "production":
            return False
        if isinstance(v, str):
            return v.lower() in ["true", "1", "yes"]
        return bool(v)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = v
        else:
            origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://ai-driven-multi-vendor-network-secu.vercel.app",
            ]
        # Always ensure the deployed Vercel domain is present in CORS origins
        if "https://ai-driven-multi-vendor-network-secu.vercel.app" not in origins and "*" not in origins:
            origins.append("https://ai-driven-multi-vendor-network-secu.vercel.app")
        return origins

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
        return [".cfg", ".conf", ".txt", ".log", ".set"]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def resolved_storage_path(self) -> Path:
        raw_str = str(self.STORAGE_PATH).replace("\\", "/").lower()
        if raw_str.startswith(("/etc", "/bin", "/sbin", "/usr", "/var/run", "/root", "c:/windows", "c:/program files")):
            raise ValueError(f"STORAGE_PATH cannot be located inside sensitive system directory: {self.STORAGE_PATH}")

        raw_path = Path(self.STORAGE_PATH)
        if raw_path.is_absolute():
            resolved = raw_path.resolve()
        else:
            resolved = (Path.cwd() / raw_path).resolve()

        resolved_str = str(resolved).replace("\\", "/").lower()
        if resolved_str.startswith(("/etc", "/bin", "/sbin", "/usr", "/var/run", "/root", "c:/windows", "c:/program files")):
            raise ValueError(f"STORAGE_PATH cannot be located inside sensitive system directory: {resolved}")

        resolved.mkdir(parents=True, exist_ok=True)
        return resolved


settings = Settings()
