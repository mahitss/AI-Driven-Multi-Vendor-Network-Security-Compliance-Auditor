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

    if not ext:
        sanitized = f"{sanitized}.cfg"
        ext = ".cfg"

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


def validate_configuration_content(content_bytes: bytes, filename: str = "") -> None:
    """
    Inspect raw content bytes for hostile executable/binary headers and dangerous shell payloads.
    Ensures network configurations are readable text and not compiled binaries or scripts.
    """
    # 1. Check for binary executable magic signatures
    executable_magic = [
        b"\x7fELF",       # ELF (Linux/Unix executable)
        b"MZ",            # PE/COFF (Windows .exe / .dll)
        b"\xfe\xed\xfa",  # Mach-O 32-bit
        b"\xfeedfacf",    # Mach-O 64-bit
        b"\xcafebabe",    # Mach-O universal binary / Java class
        b"\x1f\x8b",      # Gzip / tarball
        b"PK\x03\x04",    # Zip archive / Jar
        b"%PDF",          # PDF document
    ]
    for magic in executable_magic:
        if content_bytes.startswith(magic):
            raise InvalidFileTypeError(
                message="Uploaded file contains binary or executable content, which cannot be parsed as a network configuration.",
                details={"filename": filename, "magic": magic.hex()},
            )

    # 2. Reject binary null bytes in initial sample
    if b"\x00" in content_bytes[:4096]:
        raise InvalidFileTypeError(
            message="Uploaded file contains binary null bytes and is not valid plain-text configuration.",
            details={"filename": filename},
        )

    # 3. Reject hostile standalone shell script shebangs when not a legitimate network config
    first_line = content_bytes[:128].split(b"\n")[0].strip().lower()
    if first_line.startswith(b"#!"):
        if any(sh in first_line for sh in [b"bash", b"sh", b"python", b"perl", b"ruby", b"zsh", b"dash", b"node", b"php"]):
            raise InvalidFileTypeError(
                message="Uploaded file appears to be an executable script (shebang detected), not a network device configuration.",
                details={"filename": filename, "header": first_line.decode("utf-8", errors="ignore")},
            )


# -------------------------------------------------------------
# Sensitive Data Redaction Utilities
# -------------------------------------------------------------
SENSITIVE_PATTERNS = [
    # Multi-line Private Keys (must run before single-line matches)
    (re.compile(r"-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----", re.IGNORECASE), r"[REDACTED_PRIVATE_KEY_BLOCK]"),

    # Fortinet secrets
    (re.compile(r"(set\s+password\s+(?:ENC\s+)?)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(set\s+passphrase\s+(?:ENC\s+)?)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(set\s+private-key\s+)\"[^\"]+\"", re.IGNORECASE), r'\1"[REDACTED]"'),

    # Juniper secrets
    (re.compile(r'(encrypted-password\s+)"[^"]+"', re.IGNORECASE), r'\1"[REDACTED]"'),
    (re.compile(r'(secret\s+)"[^"]+"', re.IGNORECASE), r'\1"[REDACTED]"'),
    (re.compile(r'(community\s+)"?[a-zA-Z0-9_\-]+"?(;|\s)', re.IGNORECASE), r'\1"[REDACTED]"\2'),

    # Cisco secrets & compound commands
    (re.compile(r"(enable\s+secret\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(enable\s+password\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(username\s+\S+\s+(?:secret|password)\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(snmp-server\s+community\s+)\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(wpa-psk\s+ascii\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),

    # Generic Tokens & Keys
    (re.compile(r"(api[_-]?key\s*[:=]\s*)['\"]?[a-zA-Z0-9_\-\.]{8,}['\"]?", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(bearer\s+)[a-zA-Z0-9_\-\.]{15,}", re.IGNORECASE), r"\1[REDACTED]"),

    # Bare fallback generic password/secret
    (re.compile(r"(password\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(secret\s+)(?:\d\s+)?\S+", re.IGNORECASE), r"\1[REDACTED]"),
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
