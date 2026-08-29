# NetVigil — Google Cloud Run Deployment Guide
**All Things Agentic Hackathon — Taskmaster Track**

---

## 1. Prerequisites

1. **Google Cloud Account** with active billing enabled.
2. **Google Cloud Project** created.
3. Either:
   - **Google Cloud Shell** (recommended, zero installation required), OR
   - **Google Cloud CLI (`gcloud`)** installed on your workstation.

---

## 2. Google Cloud CLI Setup on Windows (If running locally)

If `gcloud` is not in your Windows PATH:
1. Download the [Google Cloud CLI Installer for Windows](https://cloud.google.com/sdk/docs/install#windows).
2. Run the installer and check the box **"Add gcloud to PATH"**.
3. Open a new PowerShell terminal and verify:
   ```powershell
   gcloud --version
   ```

*Alternative (Recommended)*: Open [Google Cloud Shell](https://shell.cloud.google.com) directly in your browser. All tools (`gcloud`, `docker`, `git`) are pre-installed and authenticated.

---

## 3. Authentication & Project Selection

In your terminal or Cloud Shell:

```bash
# 1. Authenticate with your Google account
gcloud auth login

# 2. Configure Application Default Credentials
gcloud auth application-default login

# 3. Set your active Google Cloud project
gcloud config set project YOUR_GCP_PROJECT_ID
```

---

## 4. Enable Required Google Cloud APIs

```bash
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    firestore.googleapis.com \
    containerregistry.googleapis.com \
    aiplatform.googleapis.com \
    --project "$(gcloud config get-value project)"
```

---

## 5. Google Cloud Firestore Setup

1. In the Google Cloud Console, navigate to **Firestore**.
2. Click **Create Database**.
3. Select **Native Mode**.
4. Choose location (e.g., `nam5` or `us-central1`).
5. Click **Create Database**.

*The backend automatically manages documents under collection `netvigil_agent_sessions`.*

---

## 6. Environment Variables (Configuration Reference)

Set these environment variables during Cloud Run deployment (do NOT commit secrets to Git):

| Variable Name | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | Yes | Deployment environment tier | `production` |
| `PORT` | Yes | HTTP server listening port | `8080` |
| `GOOGLE_CLOUD_PROJECT`| Yes | Active Google Cloud Project ID | `your-project-id` |
| `AI_PROVIDER` | Yes | LLM orchestrator provider | `gemini` |
| `AI_MODEL` | Yes | Primary Gemini Model (Gemini 3.5+) | `google/gemini-3.5` |
| `GEMINI_API_KEY` | Optional | API Key (if not using ADC) | `your-gemini-key` |
| `SECRET_KEY` | Yes | Minimum 32-character session key | `production-secret-key-32-chars...` |

---

## 7. 1-Click Automated Build & Deployment

Clone the repository into Google Cloud Shell (or your local terminal) and run:

```bash
git clone https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor.git
cd AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor

# Make deployment script executable
chmod +x deploy-cloudrun.sh

# Run 1-click build and deploy
./deploy-cloudrun.sh
```

### Manual Cloud Build & Run Deploy Command:
```bash
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
IMAGE="gcr.io/${PROJECT_ID}/netvigil-agent-api:latest"

# 1. Submit Cloud Build
gcloud builds submit --tag "${IMAGE}" -f Dockerfile.api .

# 2. Deploy to Cloud Run
gcloud run deploy netvigil-agent-api \
    --image "${IMAGE}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --memory "1Gi" \
    --cpu "1" \
    --min-instances "1" \
    --max-instances "10" \
    --set-env-vars "ENVIRONMENT=production,AI_PROVIDER=gemini,AI_MODEL=google/gemini-3.5,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
```

---

## 8. Verification & Health Probes

Once deployed, retrieve your live service URL:
```bash
SERVICE_URL=$(gcloud run services describe netvigil-agent-api --platform managed --region us-central1 --format 'value(status.url)')
echo "Live Service URL: ${SERVICE_URL}"
```

### A. Health Probe Check:
```bash
curl -s "${SERVICE_URL}/health" | jq .
```
Expected output:
```json
{
  "status": "healthy",
  "service": "NetVigil Compliance Auditor",
  "version": "0.1.0",
  "environment": "production",
  "components": {
    "gemini_connectivity": "configured",
    "cloud_run_environment": "active",
    "deterministic_engine": "operational"
  }
}
```

### B. Remote Golden Demo Execution Check:
```bash
curl -X POST "${SERVICE_URL}/api/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "objective": "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access.",
    "baseline_framework": "CIS",
    "risk_threshold": "HIGH"
  }' | jq .
```

---

## 9. Frontend Configuration

To connect the Next.js frontend to the deployed Google Cloud Run backend:

In `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://netvigil-agent-api-YOUR_HASH-uc.a.run.app
```

Then launch the frontend:
```bash
cd apps/web
npm install
npm run dev
```
Navigate to **`http://localhost:3000/agent`** to run the complete autonomous workflow against your live Google Cloud Run backend.
