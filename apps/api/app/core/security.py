"""
NetVigil Security Utilities
Provides cryptographic hashing, filename sanitization, and path traversal prevention.
"""
import hashlib
import os
import re
from pathlib import Path
from typing import Tuple
from app.core.config import settings
from app.core.errors import FileSizeExceededError, InvalidFileTypeError


def compute_sha256(content: bytes) -> str:
    """Compute the hexadecimal SHA-256 digest of arbitrary bytes."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize an uploaded filename to prevent directory traversal or malicious injection.
    Strips directory paths and special characters.
    """
    # Extract only the base name
    clean_name = os.path.basename(filename.strip().replace("\\", "/"))
    # Remove any dangerous characters, keep only alphanumeric, dots, underscores, dashes
    clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", clean_name)
    # Avoid hidden files or empty filenames
    if not clean_name or clean_name.startswith("."):
        clean_name = f"config_{clean_name.lstrip('.')}"
    return clean_name


def validate_file_metadata(filename: str, size: int) -> Tuple[str, str]:
    """
    Validate file extension and size constraints.
    Returns sanitized filename and normalized extension.
    """
    sanitized = sanitize_filename(filename)
    ext = Path(sanitized).suffix.lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise InvalidFileTypeError(
            message=f"File extension '{ext}' is not permitted. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            details={"filename": filename, "extension": ext, "allowed": settings.ALLOWED_EXTENSIONS},
        )

    if size > settings.max_file_size_bytes:
        raise FileSizeExceededError(
            message=f"File size {size} bytes exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB.",
            details={"file_size": size, "max_bytes": settings.max_file_size_bytes},
        )

    return sanitized, ext


# -------------------------------------------------------------
# Sensitive Data Redaction Utilities
# -------------------------------------------------------------
SENSITIVE_PATTERNS = [
    # Cisco secrets & passwords
    (re.compile(r"(enable\s+secret\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(enable\s+password\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(password\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(secret\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(username\s+\S+\s+(?:secret|password)\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(snmp-server\s+community\s+)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(wpa-psk\s+ascii\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),

    # Juniper secrets
    (re.compile(r'(encrypted-password\s+)"[^"]+"', re.IGNORECASE), r'\1"[REDACTED]"'),
    (re.compile(r'(secret\s+)"[^"]+"', re.IGNORECASE), r'\1"[REDACTED]"'),
    (re.compile(r'(community\s+)"?[a-zA-Z0-9_\-]+"?(;|\s)', re.IGNORECASE), r'\1"[REDACTED]"\2'),

    # Fortinet secrets
    (re.compile(r"(set\s+password\s+ENC\s+)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(set\s+passphrase\s+ENC\s+)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(set\s+private-key\s+)\"[^\"]+\"", re.IGNORECASE), r'\1"[REDACTED]"'),

    # Generic Tokens & Keys
    (re.compile(r"(api[_-]?key\s*[:=]\s*)['\"]?[a-zA-Z0-9_\-\.]{8,}['\"]?", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(bearer\s+)[a-zA-Z0-9_\-\.]{15,}", re.IGNORECASE), r"\1[REDACTED]"),
]


def redact_sensitive_data(text: str) -> str:
    """
    Redacts cleartext passwords, password hashes, SNMP community strings,
    and private keys from raw configurations or log messages.
    """
    if not text:
        return ""
    
    redacted = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted
