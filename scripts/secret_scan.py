#!/usr/bin/env python3
"""
NetVigil Secret Scanner
Lightweight, zero-dependency repository secret scanning tool.
Detects committed high-entropy API tokens, private keys, and cloud credentials
while excluding test mocks, documentation, and example configuration files.
"""

import os
import re
import sys
from typing import List, Tuple

# Regex rules for critical credential patterns
PATTERNS = [
    ("AWS Access Key ID", re.compile(r"(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])")),
    ("GitHub Personal Access Token", re.compile(r"ghp_[a-zA-Z0-9]{36}")),
    ("Private Key Header", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
    ("Slack API Token", re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,48}")),
    ("Google API Key", re.compile(r"AIza[0-9A-Za-z\\-_]{35}")),
]

# Ignored directory names and file extensions
IGNORE_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    "storage",
    "scratch",
    ".venv",
    "tests",  # Test suites intentionally include synthetic mock credentials to verify redaction filters
}

IGNORE_FILES = {
    ".env.example",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bandit-report.json",
    "netvigil.db",
    "test.db",
}

# Known synthetic test tokens allowed in test suites
ALLOWED_TEST_TOKENS = {
    "test-ci-pipeline-environment-secret-key-entropy-64",
    "test-secret-key-for-unit-tests-only-min-32-chars",
    "test-jwt-secret-for-cryptographic-signing-entropy-64",
    "test-secret-key-32-bytes-long-min-entropy!!",
    "test-secret-key-with-sufficient-entropy-64-bytes-dev-suite-12345",
}


def scan_file(file_path: str) -> List[Tuple[int, str, str]]:
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_idx, line in enumerate(f, 1):
                # Skip comments or mock fixtures explicitly marked as test/sample
                if "test" in file_path.lower() or "mock" in line.lower() or "example" in line.lower():
                    # Still check for explicit AWS / GitHub keys
                    pass
                for name, regex in PATTERNS:
                    matches = regex.findall(line)
                    for match in matches:
                        # Skip known allowed synthetic test strings
                        if match in ALLOWED_TEST_TOKENS:
                            continue
                        # If in test file and explicitly synthetic
                        if "test_" in file_path.lower() and ("fake" in line.lower() or "mock" in line.lower()):
                            continue
                        findings.append((line_idx, name, match[:4] + "..." + match[-4:] if len(match) > 8 else "***"))
    except Exception:
        pass
    return findings


def scan_repository(root_dir: str = ".") -> int:
    total_findings = 0
    print(f"[*] Starting NetVigil Repository Secret Scan in '{root_dir}'...")

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if file in IGNORE_FILES or file.endswith((".pyc", ".db", ".png", ".jpg", ".ico", ".woff2")):
                continue
            full_path = os.path.join(root, file)
            findings = scan_file(full_path)
            if findings:
                rel_path = os.path.relpath(full_path, root_dir)
                for line_idx, name, redacted in findings:
                    print(f"[!] SECRET DETECTED: {rel_path}:{line_idx} — {name} ({redacted})")
                    total_findings += 1

    if total_findings == 0:
        print("[+] NetVigil Secret Scan Passed: 0 active credentials found.")
    else:
        print(f"[-] NetVigil Secret Scan Failed: {total_findings} potential secrets identified.")
    return total_findings


if __name__ == "__main__":
    findings_count = scan_repository(".")
    if "--fail-on-findings" in sys.argv and findings_count > 0:
        sys.exit(1)
    sys.exit(0)
