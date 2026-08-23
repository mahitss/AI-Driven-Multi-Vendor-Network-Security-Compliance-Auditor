# NetVigil — Documented System Boundaries & Known Limitations

**Release Candidate:** `v1.0.0-SIH2026-RC1`  
**Problem Statement:** SIH26155 (NTRO)

---

### 1. Vendor & Syntax Boundaries
- **Supported Operating Systems:** Cisco IOS / IOS-XE, Juniper JunOS (hierarchical and set formats), and Fortinet FortiOS.
- **Out of Scope for v1.0:** Arista EOS, Huawei VRP, and CheckPoint Gaia are not natively parsed out-of-the-box (handled via unparsed directive capture and Adaptive Training).

### 2. Static Analysis Scope
- NetVigil performs **offline static configuration analysis** from uploaded configuration files.
- It does not perform active runtime packet capture, live SNMP polling, or dynamic network vulnerability scanning.

### 3. Remediation Boundaries
- In accordance with enterprise safety standards, NetVigil does **not** push configuration commands directly to live production equipment via SSH or Netconf.
- All remediations are generated as **preview-only visual diffs** (`REMOVE`/`ADD`) intended for human operator review and change-window execution.

### 4. AI Advisory Boundary
- OpenRouter AI models are strictly **advisory**. AI does not compute compliance scores or mutate finding verdicts.
- If external AI connectivity is offline, the core deterministic engine, risk graph, remediation diffs, and report generators continue operating with 100% functionality in **Offline Standby Mode**.
