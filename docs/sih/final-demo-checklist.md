# NetVigil — Final Pre-Demo Evaluator Checklist

**Problem Statement:** SIH26155 (NTRO)  
**Release Candidate:** `v1.0.0-SIH2026-RC1`

---

## Pre-Evaluation Operational Checklist

- [x] **Backend API Healthy**: `GET /health` returns status `healthy` and database latency &lt;5ms.
- [x] **Frontend Ready**: Next.js 15 App Router running on Port 3000 (`/demo`).
- [x] **Demo Seeder Executed**: `python seed_demo.py` ran with 8/8 synthetic devices populated.
- [x] **Golden Configuration Ready**: `data/demo/golden/cisco-core-router.cfg` verified.
- [x] **Zero Real Secrets**: All IPs are RFC 5737 documentation blocks; all hashes and passwords synthetic.
- [x] **Zero Automated Push Guaranteed**: Zero `subprocess`, `os.system`, or live SSH commands in codebase.
- [x] **Test Suite Verified**: 71 / 71 backend pytest tests passing (100%).
- [x] **Demo Verification Script Passed**: `python scripts/verify-demo.py` passed 10/10 critical checks.
- [x] **Next.js Production Build**: All 19 static routes compiled and prerendered cleanly.
- [x] **2-Minute Spoken Script Ready**: Presenter rehearsed on `CORE-RTR-01` canonical demo.
