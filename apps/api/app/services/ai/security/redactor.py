"""
NetVigil AI Pre-Request Data Sanitizer & Redactor
Problem Statement: SIH26155 (NTRO)

Strict Security Invariant:
Never transmit plaintext secrets, password hashes, SNMP communities,
private keys, or auth tokens through external AI APIs.
"""
import re
from typing import Any, Dict, List, Union


# Regex patterns matching sensitive configuration directives and credentials
REDACTION_PATTERNS = [
    # Cisco type 9 / 8 / 7 / 5 / 0 secrets & passwords
    (r"(enable\s+secret\s+(?:\d+\s+)?)[^\s\n\r]+", r"\1[REDACTED_SECRET]"),
    (r"(enable\s+password\s+(?:\d+\s+)?)[^\s\n\r]+", r"\1[REDACTED_PASSWORD]"),
    (r"(username\s+\S+\s+(?:privilege\s+\d+\s+)?(?:algorithm-type\s+\S+\s+)?secret\s+(?:\d+\s+)?)[^\s\n\r]+", r"\1[REDACTED_SECRET]"),
    (r"(username\s+\S+\s+password\s+(?:\d+\s+)?)[^\s\n\r]+", r"\1[REDACTED_PASSWORD]"),
    (r"(password\s+)[^\s\n\r]+", r"\1[REDACTED_PASSWORD]"),

    # JunOS password / auth hashes
    (r"(encrypted-password\s+)[^\s\n\r;]+", r"\1[REDACTED_JUNOS_HASH]"),
    (r"(authentication-key\s+)[^\s\n\r;]+", r"\1[REDACTED_AUTH_KEY]"),
    (r"(pre-shared-key\s+)[^\s\n\r;]+", r"\1[REDACTED_PSK]"),

    # Fortinet FortiOS ENC hashes and passwords
    (r"(set\s+password\s+(?:ENC\s+)?)[^\s\n\r]+", r"\1[REDACTED_FORTI_PASSWORD]"),
    (r"(set\s+private-key\s+(?:ENC\s+)?)[^\s\n\r]+", r"\1[REDACTED_PRIVATE_KEY]"),
    (r"(set\s+psksecret\s+(?:ENC\s+)?)[^\s\n\r]+", r"\1[REDACTED_PSK]"),

    # SNMP Communities & Auth
    (r"(snmp-server\s+community\s+)[^\s\n\r]+", r"\1[REDACTED_SNMP_COMMUNITY]"),
    (r"(set\s+snmp\s+community\s+)[^\s\n\r;]+", r"\1[REDACTED_SNMP_COMMUNITY]"),
    (r"(community\s+)[^\s\n\r;]+", r"\1[REDACTED_SNMP_COMMUNITY]"),

    # BGP / OSPF / IS-IS Authentication Keys
    (r"(ip\s+ospf\s+authentication-key\s+)[^\s\n\r]+", r"\1[REDACTED_ROUTING_KEY]"),
    (r"(ip\s+ospf\s+message-digest-key\s+\d+\s+md5\s+)[^\s\n\r]+", r"\1[REDACTED_MD5_KEY]"),
    (r"(neighbor\s+\S+\s+password\s+)[^\s\n\r]+", r"\1[REDACTED_BGP_PASSWORD]"),

    # RSA / ECDSA / Ed25519 Private Keys
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----", "[REDACTED_PRIVATE_KEY_BLOCK]"),

    # Generic Bearer / API / JWT Tokens
    (r"Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*", "Bearer [REDACTED_TOKEN]"),
    (r"sk-[A-Za-z0-9\-_]{20,}", "[REDACTED_API_KEY]"),
]


def redact_sensitive_data(text: str) -> str:
    """
    Sanitizes configuration text or prompts by replacing credentials and secrets
    with standard redaction tokens before sending to OpenRouter.
    """
    if not text:
        return ""

    sanitized = text
    for pattern, replacement in REDACTION_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    return sanitized


def sanitize_dict_payload(data: Union[Dict[str, Any], List[Any], str]) -> Any:
    """Recursively redacts dictionary values, lists, and strings."""
    if isinstance(data, str):
        return redact_sensitive_data(data)
    elif isinstance(data, dict):
        return {k: sanitize_dict_payload(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict_payload(item) for item in data]
    return data
