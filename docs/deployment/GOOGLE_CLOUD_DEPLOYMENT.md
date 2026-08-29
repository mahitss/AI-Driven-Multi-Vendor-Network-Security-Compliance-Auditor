# NETVIGIL — GOOGLE CLOUD DEPLOYMENT & AGENT ARCHITECTURE
## All Things Agentic Hackathon — Taskmaster Track

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      OPERATOR / NETVIGIL AGENT CONSOLE (/agent)                         │
│  "Audit these network configurations against our security baseline. Fix high-risk       │
│   violations, but do not modify SSH access."                                            │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Objective & Constraints
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    GEMINI 3.5 / 2.5 + GOOGLE ADK AGENT ORCHESTRATOR                     │
│                  (Google Cloud Run: Serverless Container Backend)                       │
│                                                                                         │
│   • Intent & Constraint Boundary Parsing    • Multi-Turn Reasoning Loop                 │
│   • Execution Timeline Streamer             • Approval Token Lifecycle                  │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Invokes
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
┌──────────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│          STRUCTURED AGENT TOOLS          │    │        PERSISTENT CLOUD MEMORY          │
│                                          │    │                                         │
│  1. discover_configurations              │    │  • Google Cloud Firestore               │
│  2. detect_vendor                        │    │  • Session State & Event Stream         │
│  3. analyze_configuration                │    │  • Organizational Security Policies     │
│  4. run_compliance_audit                 │    │  • Historical Verification Trails       │
│  5. get_findings & calculate_risk        │    └─────────────────────────────────────────┘
│  6. generate_remediation_plan            │
│  7. request_human_approval               │
│  8. apply_remediation                    │
│  9. verify_remediation                   │
│  10. generate_final_report               │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     EXISTING DETERMINISTIC NETVIGIL ENGINE                              │
│                           (Ground Truth for Compliance)                                 │
│                                                                                         │
│  • AST Parsers (Cisco, Juniper, Fortinet) • Universal Security Model (USM) Facts       │
│  • CIS / NIST / STIG / ISO Rule Evaluator • Deterministic Risk Matrix Calculator        │
│  • Allowlisted Vendor Remediation Catalog • Mathematical AST Re-Analysis Pipeline       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Google Cloud Infrastructure Services

| Service | Role in NetVigil Autonomous Architecture | Production Configuration |
| :--- | :--- | :--- |
| **Google Cloud Run** | Hosts the containerized FastAPI Autonomous Agent Backend and deterministic compliance engine with automatic scaling ($1 \rightarrow 10$ instances) and sub-second cold starts. | Managed CPU, 1GiB RAM, Port 8080, HTTP/2 Enabled |
| **Google Cloud Firestore** | Provides globally synchronized NoSQL document persistence for active agent session states, approval tokens, and organizational baseline policies. | Native Mode, Collection: `netvigil_agent_sessions` |
| **Google Cloud Build** | Builds multi-stage production container images from source repository with zero local Docker daemon dependencies. | Cloud Builders Docker 24.x |
| **Google Artifact Registry** | Secure, authenticated container storage for NetVigil backend images. | `gcr.io/${PROJECT_ID}/netvigil-agent-api` |
| **Google Gemini (GenAI / ADK)** | Powers natural language objective decomposition, negative constraint boundary extraction, and executive report synthesis. | `gemini-2.5-pro` / `gemini-2.5-flash` |

---

## 3. Quick Deployment to Google Cloud Run

### Prerequisites
1. [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and authenticated.
2. An active Google Cloud Project with billing enabled.

### Step 1: Set Project & Region
```bash
export GCP_PROJECT="your-gcp-project-id"
export GCP_REGION="us-central1"

gcloud config set project "${GCP_PROJECT}"
```

### Step 2: Enable Google Cloud APIs
```bash
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    firestore.googleapis.com \
    containerregistry.googleapis.com
```

### Step 3: 1-Click Automated Deployment
Run the automated deployment script:
```bash
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```

### Manual Deployment Command (Alternative)
```bash
# Build container with Google Cloud Build
gcloud builds submit --tag gcr.io/${GCP_PROJECT}/netvigil-agent-api:latest -f Dockerfile.api .

# Deploy to Google Cloud Run
gcloud run deploy netvigil-agent-api \
    --image gcr.io/${GCP_PROJECT}/netvigil-agent-api:latest \
    --platform managed \
    --region ${GCP_REGION} \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars "ENVIRONMENT=production,AI_PROVIDER=gemini,GOOGLE_CLOUD_PROJECT=${GCP_PROJECT}"
```

---

## 4. Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | Yes | `production` | Application execution environment (`production` / `development`) |
| `SECRET_KEY` | Yes | (32+ chars) | Strong cryptographically random key for session signature validation |
| `GOOGLE_CLOUD_PROJECT` | Optional | Auto-detected | Google Cloud Project ID for Firestore and Cloud Run telemetry |
| `GEMINI_API_KEY` | Optional | Auto-detected | Google Gemini API key for live Gemini 2.5/3.5 tool orchestration |
| `AI_PROVIDER` | No | `gemini` | AI orchestrator provider (`gemini` / `openrouter` / `mock`) |
| `PORT` | No | `8080` | Cloud Run listening port |

---

## 5. Golden Demo Execution Guide

Open the NetVigil Autonomous Engineer Console at:
**[http://localhost:3000/agent](http://localhost:3000/agent)** (or your deployed Cloud Run URL).

### Golden Scenario:
1. Click the preset:
   > *"Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."*
2. Click **[ Launch Autonomous Engineer ]**.
3. Observe the live 12-step **Agent Execution Timeline**:
   - **Step 1**: Extracts constraint: `DO_NOT_MODIFY: ssh`.
   - **Step 2**: Discovers multi-vendor fleet (`cisco-core-router.cfg`, `juniper-edge-firewall.conf`).
   - **Step 3**: Classifies CLI syntax dialects.
   - **Step 4**: Deterministically parses AST into Universal Security Model (USM).
   - **Step 5**: Evaluates CIS Benchmark rules.
   - **Step 6**: Prioritizes $R = \text{Severity} \times \text{Exposure} \times \text{Impact}$.
   - **Step 7**: Masks SSH proposals as `SKIPPED_CONSTRAINED` and presents Telnet/HTTP fixes.
   - **Step 8**: Pauses at the **Interactive Human Approval Gate**.
4. Review the Visual Diff, inspect the operational impact statement, and click **[ Approve & Apply Remediations ]**.
5. Watch the agent execute **Steps 9 to 12**:
   - Applies allowlisted configuration patch.
   - Re-parses AST and re-evaluates CIS rules.
   - **Verifies mathematically**: High-risk violations $4 \rightarrow 0$, CIS score $42.5\% \rightarrow 88.0\%$, and `SSH Configuration: Unaltered ✓`.
   - Compiles and displays the **Final Executive Security Report**.
