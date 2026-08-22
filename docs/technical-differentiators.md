# NetVigil — Core Technical Differentiators

**Problem Statement:** SIH26155 (NTRO)  
**Document Purpose:** Plain-language technical explanations of NetVigil's 8 core architectural innovations.

---

### 1. Universal Security Normalization
Rather than writing separate compliance checks for every vendor CLI dialect, NetVigil translates vendor Abstract Syntax Trees into a canonical **Universal Security Model** covering 8 standardized domains: `remote_access`, `authentication`, `authorization`, `logging`, `time_sync`, `access_control`, `network_security`, and `services`.

### 2. Zero-Hallucination Deterministic Engine
In national defense and critical infrastructure networks, audit scores must be mathematically reproducible and legally defensible. NetVigil evaluates parsed security facts against structured compliance rules (`PASS`, `FAIL`, `PARTIAL`, `UNKNOWN`, `NOT_APPLICABLE`) without relying on LLM inference for verdict calculation.

### 3. Verbatim Evidence Chain
Every finding links directly to the exact source lines in the ingested configuration file (e.g. `Line 28: transport input telnet ssh`), accompanied by the extracted observed value and the required expected value.

### 4. Human-in-the-Loop Adaptive Training
When new proprietary vendor commands appear, NetVigil captures them as `unknown_items`. The AI classifies candidate semantic categories, which are validated against a strict `NORMALIZED_PROPERTY_ALLOWLIST` (blocking arbitrary internal path injection). Security administrators review and approve mappings, updating the active knowledge base with zero backend downtime.

### 5. Risk Prioritization & Relationship Graph
To eliminate alert fatigue, NetVigil correlates individual control failures into composite risk items scored 0–100 and categorized into P0 (Immediate Danger), P1 (High), P2 (Medium), and P3 (Low), mapped across an interactive attack relationship tree (`DEVICE` $\rightarrow$ `EXPOSURE` $\rightarrow$ `RISK` $\rightarrow$ `FINDING`).

### 6. Allowlisted Vendor Remediation & Visual Diffs
Remediation CLI commands are generated exclusively from verified, allowlisted static templates with visual diff previews (`REMOVE` / `ADD`). NetVigil enforces a strict **Zero Automated Execution Policy**—no commands are ever pushed automatically to live physical devices.

### 7. AI Failure Isolation & Air-Gap Resilience
If external LLM connectivity is lost or running in an air-gapped SCADA environment, 100% of vendor parsing, deterministic compliance auditing, risk prioritization, remediation generation, and report exporting remain completely functional.

### 8. Enterprise-Grade SOC Operations Workspace
A unified, dark-first cybersecurity interface featuring real-time security posture analytics, device drawers, cross-entity search (`Ctrl+K`), and official printable executive compliance summaries.
