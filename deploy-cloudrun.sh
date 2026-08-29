#!/usr/bin/env bash
# ==============================================================================
# NETVIGIL — GOOGLE CLOUD RUN DEPLOYMENT SCRIPT
# All Things Agentic Hackathon — Taskmaster Track
# ==============================================================================
set -e

PROJECT_ID="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="netvigil-agent-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "================================================================="
echo " Deploying NetVigil Autonomous Security Engineer to Google Cloud"
echo " Project ID:   ${PROJECT_ID}"
echo " Region:       ${REGION}"
echo " Service Name: ${SERVICE_NAME}"
echo "================================================================="

if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: Google Cloud Project ID is not set. Run 'gcloud config set project <PROJECT_ID>'."
    exit 1
fi

echo "[1/4] Enabling required Google Cloud APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    firestore.googleapis.com \
    containerregistry.googleapis.com \
    --project "${PROJECT_ID}"

echo "[2/4] Building container image via Google Cloud Build..."
gcloud builds submit \
    --config=<(cat <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-f', 'Dockerfile.api', '-t', '${IMAGE_NAME}', '.']
images:
- '${IMAGE_NAME}'
EOF
) \
    --project "${PROJECT_ID}"

echo "[3/4] Deploying service to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --memory "1Gi" \
    --cpu "1" \
    --min-instances "1" \
    --max-instances "10" \
    --set-env-vars "ENVIRONMENT=production,AI_PROVIDER=gemini,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --project "${PROJECT_ID}"

echo "[4/4] Fetching live Service URL..."
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)' --project "${PROJECT_ID}")

echo "================================================================="
echo " NetVigil Autonomous Security Engineer Backend is LIVE!"
echo " Service URL:   ${SERVICE_URL}"
echo " Health Check:  ${SERVICE_URL}/health"
echo " OpenAPI Docs:  ${SERVICE_URL}/docs"
echo " Agent API:     ${SERVICE_URL}/api/v1/agent/run"
echo "================================================================="
