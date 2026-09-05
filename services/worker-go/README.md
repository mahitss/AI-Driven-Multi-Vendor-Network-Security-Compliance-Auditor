# NetVigil — Go Worker Service (`worker-go`)

## Overview
`worker-go` is an isolated, lightweight, non-critical Go microservice that provides concurrent background job execution infrastructure for NetVigil.

### Strict Architectural Boundaries
* **Pure Worker Capability**: `worker-go` performs deterministic background tasks (config preflight checks, cryptographic hashing, text sanitization/masking, chunking).
* **Zero Security Logic Ownership**: Go **DOES NOT** own compliance scoring, risk formulas, finding generation, vendor parsers, remediation generation, authentication, or database schemas.
* **Non-Critical & Optional**: The FastAPI / Python backend remains fully authoritative and functions 100% normally if `worker-go` is offline, disabled, or unconfigured.

---

## API Endpoints

### 1. Health & Probes
* `GET /health` or `GET /livez`
  * Status: `200 OK`
  * Response:
    ```json
    {
      "status": "ok",
      "service": "netvigil-worker-go",
      "version": "v1",
      "timestamp": "2026-09-06T00:00:00Z",
      "environment": "production"
    }
    ```
* `GET /readyz`
  * Status: `200 OK`
  * Response: `{"status": "ready", "service": "netvigil-worker-go", "timestamp": "..."}`

### 2. Job Execution
* `POST /api/v1/jobs` (or `POST /jobs`)
  * Header: `Content-Type: application/json`
  * Optional Header: `X-Internal-Worker-Secret: <secret>` (if `WORKER_INTERNAL_SECRET` configured)
  * Request Contract:
    ```json
    {
      "version": "v1",
      "job_id": "job-abc12345",
      "job_type": "config_preflight",
      "payload": {
        "raw_config": "hostname CORE-RTR-01\n..."
      }
    }
    ```
  * Response Contract:
    ```json
    {
      "version": "v1",
      "job_id": "job-abc12345",
      "status": "completed",
      "result": {
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "byte_size": 1024,
        "line_count": 45,
        "non_empty_lines": 38,
        "is_utf8": true,
        "has_null_bytes": false,
        "estimated_tokens": 256
      },
      "error": null,
      "duration_ms": 1
    }
    ```

---

## Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` / `WORKER_PORT` | `8081` | HTTP listening port |
| `WORKER_HOST` | `0.0.0.0` | Host binding address |
| `WORKER_ENV` | `production` | Environment name (`production`, `development`, `test`) |
| `WORKER_LOG_LEVEL` | `INFO` | Log level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |
| `WORKER_INTERNAL_SECRET` | `""` | Optional shared secret required for internal caller auth |
| `WORKER_READ_TIMEOUT` | `15s` | HTTP server read timeout |
| `WORKER_WRITE_TIMEOUT` | `30s` | HTTP server write timeout |
| `WORKER_SHUTDOWN_TIMEOUT`| `10s` | Graceful shutdown timeout on SIGTERM / SIGINT |
| `WORKER_MAX_PAYLOAD_BYTES`| `10485760` (10MB) | Maximum request body limit |

---

## Running Locally

```bash
# Run unit tests
go test -v ./...

# Run vet
go vet ./...

# Run service
go run cmd/worker/main.go
```
