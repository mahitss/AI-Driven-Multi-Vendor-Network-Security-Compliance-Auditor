"""
NetVigil Configuration & Environment Settings
Problem Statement: SIH26155 (NTRO)
"""
import os
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
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Security
    # Security Defaults (Production-Hardened, overridable by environment variables)
    SECRET_KEY: str = "EvDSD_Xz0YYkx5SAboXswWEi45BmYT7d24byW7BlL0znwkyRVrxggTvkME8PbbD3"
    ALLOWED_HOSTS: Union[List[str], str] = [
        "localhost",
        "127.0.0.1",
        "::1",
        "ai-driven-multi-vendor-network-security.onrender.com",
        "*.onrender.com",
        "*.vercel.app",
        "*.a.run.app",
        "*.run.app",
        "testserver",
        "testclient",
    ]
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://ai-driven-multi-vendor-network-security.vercel.app",
        "https://ai-driven-multi-vendor-network-secu.vercel.app",
        "https://ai-driven-multi-vendor-network-security.onrender.com",
    ]

    # Proxy & Network Rate Limiting Trust
    TRUSTED_PROXIES: Union[List[str], str] = ["127.0.0.1", "::1", "localhost"]
    TRUST_FORWARDED_HEADERS: bool = False

    # Database
    # Default: SQLite async database for development/testing if PostgreSQL is not active
    DATABASE_URL: str = "sqlite+aiosqlite:///./netvigil.db"
    SYNC_DATABASE_URL: str = "sqlite:///./netvigil.db"
    DB_ECHO: bool = False

    # Storage & Upload Rules
    STORAGE_PATH: str = "./storage/uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: Union[List[str], str] = [".cfg", ".conf", ".txt", ".log", ".set"]
    MAX_CONFIG_LINES: int = 50000
    MAX_LINE_LENGTH_BYTES: int = 32768
    MAX_UNKNOWN_ITEMS_DETAILED: int = 1000
    MAX_UPLOAD_FILENAME_LENGTH: int = 255

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
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        insecure_keys = [
            "dev-insecure-secret-key-replace-in-production-sih26155",
            "secret",
            "changeme",
            "default",
            "short-key",
            "",
        ]
        if env == "production":
            if not v or v in insecure_keys or len(v) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: A strong, unguessable SECRET_KEY (minimum 32 characters) "
                    "must be explicitly configured via environment variable in production mode. Development default secret keys are strictly prohibited."
                )
            return v
        # In development/test mode, fallback to standard key if not provided
        if not v:
            return "netvigil-dev-secret-key-ntro-sih26155-isolated-testing-token"
        return v

    @field_validator("SUPABASE_URL", mode="after")
    @classmethod
    def validate_supabase_url(cls, v: str, info) -> str:
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        auth_enabled = info.data.get("AUTH_ENABLED", True) if info.data else True
        if env == "production" and auth_enabled and not v:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SUPABASE_URL must be explicitly configured via environment variable in production mode."
            )
        if not v:
            return "https://cveymgeivgnjnwnxfveu.supabase.co"
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_database_url(cls, v: str) -> str:
        if not v:
            for persistent_candidate in ["/var/data", "/data", "/app/storage"]:
                cand_path = Path(persistent_candidate)
                try:
                    if cand_path.exists() and cand_path.is_dir():
                        cand_db = cand_path / "netvigil.db"
                        return f"sqlite+aiosqlite:///{cand_db.as_posix()}"
                except Exception:
                    pass
            return "sqlite+aiosqlite:///./netvigil.db"
        val = str(v).strip()
        if val.startswith("postgres://"):
            val = val.replace("postgres://", "postgresql+asyncpg://", 1)
        elif val.startswith("postgresql://") and not val.startswith("postgresql+asyncpg://"):
            val = val.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg requires ssl= parameter instead of libpq's sslmode=
        if "postgresql+asyncpg://" in val and "sslmode=" in val:
            val = val.replace("sslmode=", "ssl=")
        return val

    @field_validator("SYNC_DATABASE_URL", mode="before")
    @classmethod
    def assemble_sync_database_url(cls, v: str, info=None) -> str:
        async_url = info.data.get("DATABASE_URL", "") if (info is not None and getattr(info, "data", None)) else ""
        if not v and async_url:
            if "postgresql" in async_url:
                sync_candidate = async_url.replace("postgresql+asyncpg://", "postgresql://")
                if "ssl=" in sync_candidate and "sslmode=" not in sync_candidate:
                    sync_candidate = sync_candidate.replace("ssl=", "sslmode=")
                return sync_candidate
            if "sqlite" in async_url:
                return async_url.replace("sqlite+aiosqlite:///", "sqlite:///")
        if not v:
            for persistent_candidate in ["/var/data", "/data", "/app/storage"]:
                cand_path = Path(persistent_candidate)
                try:
                    if cand_path.exists() and cand_path.is_dir():
                        cand_db = cand_path / "netvigil.db"
                        return f"sqlite:///{cand_db.as_posix()}"
                except Exception:
                    pass
            return "sqlite:///./netvigil.db"
        val = str(v).strip()
        if val.startswith("postgres://"):
            val = val.replace("postgres://", "postgresql://", 1)
        elif val.startswith("postgresql+asyncpg://"):
            val = val.replace("postgresql+asyncpg://", "postgresql://", 1)
        if "postgresql://" in val and "ssl=" in val and "sslmode=" not in val:
            val = val.replace("ssl=", "sslmode=")
        return val

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
                "https://ai-driven-multi-vendor-network-security.vercel.app",
                "https://ai-driven-multi-vendor-network-secu.vercel.app",
                "https://ai-driven-multi-vendor-network-security.onrender.com",
            ]
        return origins

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def validate_cors_origins_production(cls, v: List[str], info) -> List[str]:
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        if env == "production":
            if not v or "*" in v:
                raise ValueError("CRITICAL SECURITY ERROR: Wildcard '*' in CORS_ORIGINS is strictly prohibited in production mode. Explicit allowed origins must be configured.")
        return v

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "localhost",
            "127.0.0.1",
            "::1",
            "ai-driven-multi-vendor-network-security.onrender.com",
            "*.onrender.com",
            "*.vercel.app",
            "*.a.run.app",
            "*.run.app",
            "testserver",
            "testclient",
        ]

    @field_validator("ALLOWED_HOSTS", mode="after")
    @classmethod
    def validate_allowed_hosts_production(cls, v: List[str], info) -> List[str]:
        env = info.data.get("ENVIRONMENT", "development").lower() if info.data else "development"
        if env == "production":
            if not v or "*" in v or ["*"] == v:
                raise ValueError("CRITICAL SECURITY ERROR: Wildcard '*' in ALLOWED_HOSTS is strictly prohibited in production mode. Explicit domain hostnames must be configured.")
        return v

    @field_validator("TRUSTED_PROXIES", mode="before")
    @classmethod
    def assemble_trusted_proxies(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["127.0.0.1", "::1", "localhost"]

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

        # Check for persistent volume mounts on container platforms
        for candidate in ["/app/storage/uploads", "/var/data/uploads", "/data/uploads"]:
            cand = Path(candidate)
            try:
                if cand.parent.exists() and cand.parent.is_dir():
                    cand.mkdir(parents=True, exist_ok=True)
                    return cand
            except Exception:
                pass

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

    @property
    def is_persistent_database(self) -> bool:
        """Indicates whether DATABASE_URL is configured for a durable database engine (PostgreSQL or persistent disk SQLite)."""
        url = str(self.DATABASE_URL).lower()
        if "postgresql" in url or "postgres" in url:
            return True
        if "sqlite" in url and any(p in url for p in ["/var/data", "/data", "/app/storage", "/mnt/data"]):
            return True
        return False

    @property
    def storage_architecture_mode(self) -> str:
        """Human-readable description of the storage architecture."""
        url = str(self.DATABASE_URL).lower()
        if "postgresql" in url or "postgres" in url:
            return "persistent_postgresql"
        if "sqlite" in url and any(p in url for p in ["/var/data", "/data", "/app/storage", "/mnt/data"]):
            return "persistent_disk_sqlite"
        return "ephemeral_container_sqlite"


settings = Settings()
