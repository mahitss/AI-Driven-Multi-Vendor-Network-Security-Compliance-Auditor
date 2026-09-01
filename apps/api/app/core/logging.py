"""
NetVigil Structured Logging Configuration
Ensures sensitive tokens, passwords, authorization headers, and secrets are sanitized from logs.
"""
import logging
import re
import sys

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----", re.IGNORECASE),
    re.compile(r"(postgres(?:ql)?(?:\+[a-z0-9]+)?://[^:]+:)([^@]+)(@)", re.IGNORECASE),
    re.compile(r"(mysql(?:\+[a-z0-9]+)?://[^:]+:)([^@]+)(@)", re.IGNORECASE),
    re.compile(r"(redis(?:s)?://[^:]+:)([^@]+)(@)", re.IGNORECASE),
    re.compile(r"\b(ey[a-zA-Z0-9_-]{15,}\.ey[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]{10,})\b"),
    re.compile(r"(authorization:\s*bearer\s+)([\w\-\.]+)", re.IGNORECASE),
    re.compile(r"(bearer\s+)([\w\-\.]+)", re.IGNORECASE),
    re.compile(r"(password\s*[:=]\s*)['\"]?(\S+)['\"]?", re.IGNORECASE),
    re.compile(r"(password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(secret\s*[:=]\s*)['\"]?(\S+)['\"]?", re.IGNORECASE),
    re.compile(r"(secret\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(api[_-]?key\s*[:=]\s*)['\"]?(\w+)['\"]?", re.IGNORECASE),
    re.compile(r"(token\s*[:=]\s*)['\"]?([\w\-\.]+)['\"]?", re.IGNORECASE),
    re.compile(r"(service_role(?:_key)?\s*[:=]\s*)['\"]?(\S+)['\"]?", re.IGNORECASE),
    re.compile(r"(enable\s+secret\s+\d\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(snmp-server\s+community\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+passphrase\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(encrypted-password\s+)(\S+)", re.IGNORECASE),
]


def redact_string(text: str) -> str:
    """Sanitizes sensitive patterns from any string."""
    if not isinstance(text, str):
        return text
    msg = text
    for pattern in SECRET_PATTERNS:
        if pattern.pattern.startswith("-----BEGIN"):
            msg = pattern.sub("[REDACTED_PRIVATE_KEY_BLOCK]", msg)
        elif "postgres" in pattern.pattern or "mysql" in pattern.pattern or "redis" in pattern.pattern:
            msg = pattern.sub(r"\1[REDACTED]\3", msg)
        elif "ey[a-zA-Z0-9" in pattern.pattern:
            msg = pattern.sub("[REDACTED_JWT]", msg)
        else:
            msg = pattern.sub(r"\1[REDACTED]", msg)
    return msg


class SensitiveFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if record.args:
                # Format message before redacting so arguments are also sanitized
                formatted = record.getMessage()
                record.msg = redact_string(formatted)
                record.args = None
            elif isinstance(record.msg, str):
                record.msg = redact_string(record.msg)
        except Exception:
            pass
        return True


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger("netvigil")
    logger.setLevel(level)
    logger.propagate = False

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-7s | [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
