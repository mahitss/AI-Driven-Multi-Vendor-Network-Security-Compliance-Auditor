# NetVigil — Demo Environment Reset & Troubleshooting Guide

**Problem Statement:** SIH26155 (NTRO)

---

## 1. Demo Reset Instructions

To return NetVigil to a clean, fresh state before a live evaluation:

### Option A: From Web UI
1. Navigate to **http://localhost:3000/demo**.
2. Click the **Reset** button in the top right controls.
3. Click **Launch Golden Demo** to re-initialize canonical gateway `CORE-RTR-01`.

### Option B: From Command Line
```bash
# Re-run automated seeder to refresh all 8 demo devices
python seed_demo.py
```

---

## 2. Troubleshooting Quick Reference

| Issue / Symptom | Root Cause | Immediate Resolution |
| :--- | :--- | :--- |
| **Backend connection refused (Port 8000)** | FastAPI server is not running | Run `uvicorn app.main:app --reload --port 8000` from `apps/api/` |
| **Frontend build error or 404** | Node dependencies or stale Next.js cache | Run `npm run build` or `npm run dev` from `apps/web/` |
| **AI Assistant reports Offline** | No OpenRouter API key configured | Normal fallback behavior. Core audit and compliance functions operate at 100% without external LLM keys. |
| **Database locked (SQLite in local dev)** | Concurrent process holding file lock | Run `python seed_demo.py` to recreate local database file cleanly. |
