# NetVigil — Golden Demonstration Guide

**Problem Statement:** SIH26155 (NTRO)  
**Release Tag:** `v1.0.0-SIH2026-RC1`

---

## 1. Quick Launch

```bash
# 1. Start Backend API (Port 8000)
cd apps/api
uvicorn app.main:app --reload --port 8000

# 2. Start Frontend App (Port 3000)
cd apps/web
npm run dev
```

Navigate to **http://localhost:3000/demo** to enter the **Presenter Golden Demo Workspace**.

---

## 2. 2-Minute Spoken Presenter Script

### [0:00 – 0:10] Problem & Vision
> *"Respected Evaluators, National Technical Research Organisation networks manage thousands of multi-vendor routers, switches, and firewalls. Auditing against CIS, NIST, STIG, and ISO standards manually is error-prone, while pure LLMs hallucinate non-existent controls. NetVigil delivers 100% deterministic compliance with AI intelligence."*

### [0:10 – 0:25] Configuration Ingestion & Deterministic Detection
> *"Clicking 'Launch Golden Demo', NetVigil ingests perimeter gateway `cisco-core-router.cfg`. In under 50ms, our signature engine detects Cisco IOS with 99% confidence and computes SHA-256 integrity digests in isolated storage."*

### [0:25 – 0:40] Universal Security Normalization
> *"Our AST parser translates raw proprietary directives—like `ip ssh version 1` and `transport input telnet`—into a vendor-neutral Universal Security Model across 8 canonical security domains."*

### [0:40 – 1:00] Multi-Framework Audit & Line-Level Evidence
> *"Our deterministic compliance engine evaluates 60+ rules across CIS, NIST, DISA STIG, and ISO 27001 in 8 milliseconds. Notice this Telnet finding: NetVigil provides exact line citations—line 28: `transport input telnet ssh`—with observed vs expected values."*

### [1:00 – 1:15] Risk Intelligence & Allowlisted Remediation
> *"The Risk Engine correlates findings into prioritized P0 and P1 risks. In the Remediation Center, NetVigil generates verified, allowlisted CLI fix scripts with visual diffs under a strict Zero Automated Execution Policy."*

### [1:15 – 1:35] Hero Feature: Adaptive Training with Human-in-the-Loop
> *"When a device introduces an unseen proprietary directive—like CoPP policy maps—our Adaptive Training system uses AI to interpret candidate semantics, validates the property against a strict allowlist, and presents it for administrator approval."*

### [1:35 – 1:50] Re-Analysis & Posture Improvement
> *"Clicking 'Approve Mapping', the knowledge base updates dynamically. Re-evaluating the configuration raises the compliance score and eliminates the unknown directive with zero backend code changes!"*

### [1:50 – 2:00] Official Reports & Conclusion
> *"Finally, we generate an official Executive Compliance Report ready for NTRO inspectors. NetVigil delivers speed, 100% mathematical accuracy, and continuous adaptability. Thank you!"*
