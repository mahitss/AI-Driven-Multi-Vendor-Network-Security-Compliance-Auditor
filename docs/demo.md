# NetVigil — Demo Dataset & Evaluation Guide

**Problem Statement:** SIH26155 (NTRO)  
**Release:** NetVigil v1.0.0-SIH2026

---

## 1. Quick Start & Demo Seeding

To populate NetVigil with the official multi-vendor demo dataset:

```bash
# 1. Activate Python virtual environment
.venv\Scripts\activate

# 2. Run the automated demo seeder
python seed_demo.py

# 3. Start the Backend API (Port 8000)
cd apps/api
uvicorn app.main:app --reload --port 8000

# 4. Start the Frontend Dashboard (Port 3000)
cd apps/web
npm run dev
```

---

## 2. Included Synthetic Demo Dataset (`data/demo/`)

All configurations are strictly synthetic, utilizing RFC 5737 reserved documentation IP blocks (`198.51.100.0/24`, `203.0.113.0/24`, `10.10.100.0/24`):

| File Path | Vendor | Device Role | Description |
| :--- | :--- | :--- | :--- |
| `data/demo/cisco/insecure-router.cfg` | Cisco IOS | `CORE-RTR-01` | **Canonical Demo File**: Telnet enabled, plain text passwords, finger daemon active, no remote syslog, HTTP enabled. Score: 20%. |
| `data/demo/cisco/secure-router.cfg` | Cisco IOS | `NTRO-SECURE-RTR-01` | Fully hardened router baseline (SSH v2, AAA new-model, remote logging, NTP, BPDU guard). Score: 73.3%. |
| `data/demo/cisco/mixed-router.cfg` | Cisco IOS | `DIST-SW-02` | Mixed compliance perimeter switch with partial transport configuration. Score: 46.7%. |
| `data/demo/cisco/unknown-directive-router.cfg` | Cisco IOS | `EDGE-LEARN-01` | Contains unknown proprietary directives for **Adaptive Training** demonstration. |
| `data/demo/juniper/insecure-srx.conf` | Juniper JunOS | `LAB-JUNIPER-SRX-02` | Insecure gateway with Telnet and HTTP web-management enabled. Score: 33.3%. |
| `data/demo/juniper/secure-srx.conf` | Juniper JunOS | `NTRO-JUNIPER-SRX-01` | Hardened JunOS gateway baseline with SSH v2 and Syslog host. Score: 53.3%. |
| `data/demo/fortinet/insecure-firewall.conf` | Fortinet FortiOS | `LAB-FORTIGATE-02` | Insecure firewall with admin SSH v1 and HTTP port 80. Score: 46.7%. |
| `data/demo/fortinet/secure-firewall.conf` | Fortinet FortiOS | `NTRO-FORTIGATE-01` | Hardened FortiOS firewall with TLS 443 enforcement and remote syslog. Score: 53.3%. |

---

## 3. Recommended Canonical Demo Flow

1. **Dashboard Overview (`/`)**: Observe real aggregated posture metrics across CIS, NIST, DISA STIG, and ISO 27001.
2. **Device Inventory (`/devices`)**: Open `CORE-RTR-01` device drawer to inspect hardware metadata and security facts.
3. **Audit Workspace (`/audits`)**:
   - Inspect findings on `CORE-RTR-01`.
   - Open the **Finding Evidence Drawer** for Telnet failure: examine verbatim line evidence (`transport input telnet`).
   - Click **AI Explanation** to generate grounded technical context.
   - Click **View Remediation** to review allowlisted Cisco CLI fix commands and visual diff.
4. **Risk Intelligence (`/risk`)**: Review P0/P1 prioritized risks and interactive attack relationship graph.
5. **Adaptive Training (`/adaptive-training`)**:
   - Navigate to Adaptive Training.
   - Review candidate mapping for unseen command `control-plane policing policy-map COPP_POLICY`.
   - Click **Approve Mapping** and re-evaluate compliance to show dynamic score enhancement.
6. **Reports Center (`/reports`)**:
   - Generate official **Executive Audit Summary** and print / save as PDF.
