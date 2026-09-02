# NetVigil Software Supply Chain & Dependency Management Policy

## 1. Purpose & Scope
This policy establishes deterministic, reproducible, and security-verified dependency management procedures for NetVigil across both backend (Python/FastAPI) and frontend (TypeScript/Next.js) ecosystems.

---

## 2. Dependency Pinning & Lockfile Reproducibility
1. **Frontend**:
   - All production frontend dependencies are declared in `apps/web/package.json` with an exact dependency tree locked in `apps/web/package-lock.json`.
   - CI/CD pipelines and Docker builds **must exclusively execute `npm ci`** to enforce bit-for-bit reproducible installs without mutating lockfiles.
2. **Backend**:
   - Production specifications in `apps/api/requirements.txt` declare safe minimum versions and upper bounds (e.g. `fastapi>=0.115.0,<1.0.0`, `python-multipart>=0.0.20,<1.0.0`) to avoid unvetted breaking major version bumps.
   - For deterministic builds, `apps/api/requirements-lock.txt` provides the frozen, verified dependency graph.

---

## 3. Automated Vulnerability Scanning & CI Security Gates
1. **Frontend Gate**:
   - `npm audit --audit-level=high` runs on every pull request and push to `main`. Builds fail immediately if high or critical exploitable vulnerabilities exist.
2. **Backend Gate**:
   - `pip-audit -r apps/api/requirements.txt` runs in the CI pipeline to evaluate dependencies against the PyPI and OSV advisory databases.
3. **Secret Scanning Gate**:
   - `python scripts/secret_scan.py --fail-on-findings` runs on all code commits before testing, blocking commits that inadvertently contain cloud credentials, private keys, or high-entropy tokens.
4. **CycloneDX SBOM Generation**:
   - Every CI pipeline execution generates a CycloneDX v1.5 compliant `backend-sbom.json` retained as a versioned artifact for supply-chain provenance.

---

## 4. Container & Dockerfile Hardening Standards
1. **Non-Root Execution**:
   - All production container images must run as non-root service accounts (`netvigil` in Python containers, `node` in Alpine containers).
2. **Build Context Hygiene**:
   - Root and service-level `.dockerignore` files strictly block `.env`, `.git`, `.db`, `node_modules`, and cache directories from entering image layers.
3. **Base Images**:
   - Official minimal base images (`python:3.11-slim`, `node:22-alpine`) are pinned and regularly audited.

---

## 5. Vulnerability Triage & SLA
| Severity | Description | Remediation SLA |
| :--- | :--- | :--- |
| **Critical / P0** | Actively exploitable remote code execution or authentication bypass in production path | Within 24 hours |
| **High / P1** | Denial-of-service, data exposure, or high-impact vulnerability in reachable code | Within 7 days |
| **Medium / P2** | Conditional or authenticated attack vector | Next scheduled sprint |
| **Low / Dev-Only** | Build-time or test runner advisory (e.g. test runner tempdir handling) | Documented, updated during routine maintenance |
