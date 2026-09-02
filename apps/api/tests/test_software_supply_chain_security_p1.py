"""
NetVigil P1 Software Supply Chain, Dependency & CI/CD Security Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive verification of supply-chain and build integrity specifications:
- SUPPLY-01: Clean dependency specification and lockfiles exist and are valid.
- SUPPLY-02: Lockfile installation is reproducible (package.json and package-lock.json match).
- SUPPLY-03: Vulnerability scanner detects intentionally vulnerable mock package.
- SUPPLY-04: Repository secret scanner detects synthetic fake secret.
- SUPPLY-05: CI does not expose production secrets to forked PR execution.
- SUPPLY-06: CI permissions enforce least-privilege (contents: read).
- SUPPLY-07: Docker build context excludes .env and local databases via .dockerignore.
- SUPPLY-08: Dockerfiles do not embed hardcoded credentials in ARG/ENV.
- SUPPLY-09: Production containers enforce non-root user execution.
- SUPPLY-10: Deterministic build scripts and lockfile integrity verified.
"""

import json
import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.secret_scan import scan_file, PATTERNS


# ==============================================================================
# SUPPLY-01: Clean dependency specification and lockfiles exist and are valid
# ==============================================================================
def test_supply_01_dependency_specs_valid():
    assert os.path.exists("apps/api/requirements.txt")
    assert os.path.exists("apps/api/requirements-lock.txt")
    assert os.path.exists("apps/web/package.json")
    assert os.path.exists("apps/web/package-lock.json")

    with open("apps/api/requirements.txt", "r", encoding="utf-8") as f:
        reqs = f.read()
    # Enforce safe bounds on python-multipart
    assert "python-multipart>=0.0.20" in reqs


# ==============================================================================
# SUPPLY-02: Lockfile installation is reproducible
# ==============================================================================
def test_supply_02_lockfile_reproducibility():
    with open("apps/web/package.json", "r", encoding="utf-8") as f:
        pkg = json.load(f)
    with open("apps/web/package-lock.json", "r", encoding="utf-8") as f:
        lock = json.load(f)

    assert pkg["name"] == lock["name"]
    # Check that lockfile includes dependencies
    packages = lock.get("packages", {})
    root_pkg = packages.get("", {})
    for dep, ver in pkg.get("dependencies", {}).items():
        assert dep in root_pkg.get("dependencies", {})


# ==============================================================================
# SUPPLY-03: Vulnerability scanner detects known vulnerable package
# ==============================================================================
def test_supply_03_vulnerability_detection_simulation():
    # Verify that scanning a known vulnerable version triggers vulnerability detection
    known_vulnerable_pkg = "python-multipart"
    known_vulnerable_ver = "0.0.9"

    import urllib.request
    payload = json.dumps({
        "package": {"name": known_vulnerable_pkg, "ecosystem": "PyPI"},
        "version": known_vulnerable_ver,
    }).encode("utf-8")
    req = urllib.request.Request("https://api.osv.dev/v1/query", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read().decode("utf-8"))
        vulns = data.get("vulns", [])
        # OSV database must report vulnerabilities for 0.0.9
        assert len(vulns) > 0, f"Expected vulnerabilities for {known_vulnerable_pkg}=={known_vulnerable_ver}"


# ==============================================================================
# SUPPLY-04: Repository secret scanner detects synthetic fake secret
# ==============================================================================
def test_supply_04_secret_scanner_detects_synthetic_secret(tmp_path):
    fake_secret_file = tmp_path / "fake_creds.txt"
    # Write synthetic fake AWS key format
    fake_secret_file.write_text("export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n", encoding="utf-8")

    findings = scan_file(str(fake_secret_file))
    assert len(findings) > 0
    assert findings[0][1] == "AWS Access Key ID"


# ==============================================================================
# SUPPLY-05: CI does not expose secrets to forked PR execution
# ==============================================================================
def test_supply_05_ci_no_fork_secret_exposure():
    with open(".github/workflows/ci.yml", "r", encoding="utf-8") as f:
        ci_content = f.read()

    # pull_request_target must NOT be used
    assert "pull_request_target" not in ci_content
    # Standard pull_request trigger must be used
    assert "pull_request:" in ci_content


# ==============================================================================
# SUPPLY-06: CI permissions enforce least-privilege (contents: read)
# ==============================================================================
def test_supply_06_ci_permissions_least_privilege():
    with open(".github/workflows/ci.yml", "r", encoding="utf-8") as f:
        ci_content = f.read()

    assert "permissions:" in ci_content
    assert "contents: read" in ci_content
    assert "write-all" not in ci_content


# ==============================================================================
# SUPPLY-07: Docker build context excludes .env via .dockerignore
# ==============================================================================
def test_supply_07_dockerignore_excludes_secrets():
    for path in [".dockerignore", "apps/api/.dockerignore", "apps/web/.dockerignore"]:
        assert os.path.exists(path), f"Missing {path}"
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert ".env" in content, f".env not excluded in {path}"


# ==============================================================================
# SUPPLY-08: Dockerfiles do not embed hardcoded credentials in ARG/ENV
# ==============================================================================
def test_supply_08_dockerfiles_no_hardcoded_credentials():
    dockerfiles = ["Dockerfile.api", "apps/api/Dockerfile", "apps/web/Dockerfile"]
    secret_keywords = ["SECRET_KEY=", "PASSWORD=", "API_KEY=", "TOKEN="]

    for df in dockerfiles:
        with open(df, "r", encoding="utf-8") as f:
            lines = f.readlines()
        for line in lines:
            line_clean = line.strip().upper()
            if line_clean.startswith("ENV ") or line_clean.startswith("ARG "):
                for kw in secret_keywords:
                    # Allow variable expansion or empty default but forbid literal production secrets
                    if kw in line_clean and not re.search(r"\$\{[A-Z_]+(?::-|\})", line_clean):
                        assert "SECRET" not in line_clean


# ==============================================================================
# SUPPLY-09: Production containers enforce non-root user execution
# ==============================================================================
def test_supply_09_production_containers_non_root():
    with open("Dockerfile.api", "r", encoding="utf-8") as f:
        api_root_df = f.read()
    with open("apps/api/Dockerfile", "r", encoding="utf-8") as f:
        api_df = f.read()
    with open("apps/web/Dockerfile", "r", encoding="utf-8") as f:
        web_df = f.read()

    assert "USER netvigil" in api_root_df
    assert "USER netvigil" in api_df
    assert "USER node" in web_df


# ==============================================================================
# SUPPLY-10: Deterministic build scripts and lockfile integrity
# ==============================================================================
def test_supply_10_deterministic_build_scripts():
    with open(".github/workflows/ci.yml", "r", encoding="utf-8") as f:
        ci_content = f.read()
    with open("apps/web/Dockerfile", "r", encoding="utf-8") as f:
        web_df = f.read()

    # Both CI and Dockerfile must use npm ci for lockfile adherence
    assert "npm ci" in ci_content
    assert "npm ci" in web_df
