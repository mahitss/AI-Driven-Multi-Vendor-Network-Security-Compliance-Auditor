"""
AI Security, Prompt Injection Mitigation & Secret Redaction
Problem Statement: SIH26155 (NTRO)

Ensures that:
1. Untrusted configuration lines are safely encapsulated in distinct boundary tags.
2. Credentials and secrets (enable passwords, hashes, keys) are redacted before AI ingestion.
3. System prompt instructions cannot be overridden by user configuration text.
"""
import re
from typing import List


# Regular expressions for credentials commonly found in network configurations
SECRET_PATTERNS: List[re.Pattern] = [
    re.compile(r"(password\s+(?:0|7)\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(secret\s+(?:0|5|8|9)\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(snmp-server\s+community\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(pre-shared-key\s+(?:hex|local|ascii)?\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(key-string\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(radius-server\s+key\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(tacacs-server\s+key\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+system\s+root-authentication\s+plain-text-password-value\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+system\s+root-authentication\s+encrypted-password\s+)(\S+)", re.IGNORECASE),
    re.compile(r"(set\s+admin-password\s+)(\S+)", re.IGNORECASE),
]


def redact_sensitive_credentials(text: str) -> str:
    """
    Replaces cleartext and obfuscated password hashes in configuration text
    with [REDACTED_SECRET] tokens prior to AI processing.
    """
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub(r"\1[REDACTED_SECRET]", redacted)
    return redacted


def sanitize_untrusted_configuration(content: str) -> str:
    """
    Sanitizes raw configuration strings and wraps them in explicit untrusted data markers.
    Mitigates indirect prompt injection attempts embedded in network comments or banners.
    """
    # 1. Redact credentials
    clean_content = redact_sensitive_credentials(content)

    # 2. Neutralize typical delimiter escaping
    clean_content = clean_content.replace("</untrusted_configuration_data>", "[TAG_ESCAPED]")

    # 3. Encapsulate in boundary XML tag
    return f"<untrusted_configuration_data>\n{clean_content}\n</untrusted_configuration_data>"
