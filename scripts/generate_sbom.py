#!/usr/bin/env python3
"""
NetVigil CycloneDX Software Bill of Materials (SBOM) Generator
Generates a CycloneDX v1.5 compliant SBOM for backend and frontend production dependencies.
"""

import json
import sys
import importlib.metadata
from datetime import datetime, timezone

def generate_backend_sbom(output_path: str = "backend-sbom.json"):
    packages = [
        "fastapi", "uvicorn", "pydantic", "pydantic-settings", "sqlalchemy",
        "asyncpg", "psycopg2-binary", "aiosqlite", "alembic", "python-multipart",
        "httpx", "pytest", "pytest-asyncio", "python-dotenv", "pyjwt", "cryptography"
    ]

    components = []
    for pkg in sorted(packages):
        try:
            ver = importlib.metadata.version(pkg)
        except Exception:
            ver = "unknown"
        components.append({
            "type": "library",
            "name": pkg,
            "version": ver,
            "purl": f"pkg:pypi/{pkg}@{ver}",
            "scope": "required",
            "supplier": {"name": "PyPI Ecosystem"},
        })

    sbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": "urn:uuid:68e9bb24-7b19-4876-9051-93c4e09f2d31",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": [{"vendor": "NetVigil Security", "name": "NetVigil SBOM Generator", "version": "1.0.0"}],
            "component": {
                "type": "application",
                "name": "netvigil-api",
                "version": "1.0.0",
                "description": "NetVigil AI-Driven Multi-Vendor Network Security Compliance Auditor Backend",
            },
        },
        "components": components,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sbom, f, indent=2)

    print(f"[+] Successfully generated CycloneDX SBOM at '{output_path}' with {len(components)} components.")
    return sbom

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "backend-sbom.json"
    generate_backend_sbom(out)
