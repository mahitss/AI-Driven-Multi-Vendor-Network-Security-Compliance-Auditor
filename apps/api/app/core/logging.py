"""
NetVigil Structured Logging Configuration
Ensures sensitive tokens, passwords, authorization headers, and secrets are sanitized from logs.
"""
import logging
import re
import sys

SECRET_PATTERNS = [
    re.compile(r"(password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(secret\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(api[_-]?key\s*[:=]\s*)['\"]?(\w+)['\"]?", re.IGNORECASE),
    re.compile(r"(bearer\s+)([\w\-\.]+)", re.IGNORECASE),
    re.compile(r"(authorization:\s*bearer\s+)([\w\-\.]+)", re.IGNORECASE),
    re.compile(r"(enable\s+secret\s+\d\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(snmp-server\s+community\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+passphrase\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(encrypted-password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(token[:=]\s*)['\"]?([\w\-\.]+)['\"]?", re.IGNORECASE),
    re.compile(r"-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----", re.IGNORECASE),
]


class SensitiveFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern in SECRET_PATTERNS:
                if pattern.pattern.startswith("-----BEGIN"):
                    msg = pattern.sub("[REDACTED_PRIVATE_KEY_BLOCK]", msg)
                else:
                    msg = pattern.sub(r"\1[REDACTED]", msg)
            record.msg = msg
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
