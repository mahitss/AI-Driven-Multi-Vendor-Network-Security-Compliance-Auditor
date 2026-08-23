# NetVigil — SIH Judge Technical Q&A Guide

**Problem Statement:** SIH26155 (NTRO)

---

### 1. Why AI?
AI excels at semantic interpretation of unknown vendor directives, summarizing complex audit telemetry for executives, and explaining technical vulnerabilities to junior operators in natural language.

### 2. Why not regex?
Network configurations are contextual, nested, and order-dependent (e.g., interface blocks, ACL sequences, JunOS hierarchies). Simple regex lacks hierarchical scoping, misses nested directives, and becomes unmaintainable across multiple firmware versions. NetVigil uses proper AST lexical analysis.

### 3. Why not directly use an LLM for compliance?
LLMs are non-deterministic, prone to hallucinating non-existent security controls, and change their outputs across identical runs. For national security compliance, audit results must be 100% mathematically reproducible.

### 4. How does deterministic compliance work?
The AST parser populates a typed Universal Security Model (e.g. `remote_access.telnet_enabled = True`). The Rule Evaluator checks this against catalog rules using deterministic boolean logic, producing identical results every time.

### 5. How does unknown vendor support work?
Unrecognized syntax is captured in `unknown_items` without dropping directives. It is routed to the AI classifier to identify candidate properties, which are then reviewed through Adaptive Training.

### 6. How does adaptive training work?
Unknown commands $\rightarrow$ AI classification $\rightarrow$ Validation against `NORMALIZED_PROPERTY_ALLOWLIST` $\rightarrow$ Administrator approval $\rightarrow$ Database persistence $\rightarrow$ Instant parser re-audit.

### 7. How do you prevent hallucination?
AI is strictly isolated as an advisory layer. Response schemas strip any attempts by LLMs to inject `compliance_status`, `severity_override`, or `risk_score`.

### 8. How do you protect credentials?
`redact_sensitive_data()` scrubs Cisco type 9/8/7/5 secrets, JunOS password hashes, Fortinet ENC strings, SNMP community strings, and RSA private keys before sending prompts to OpenRouter.

### 9. What happens if OpenRouter is offline?
NetVigil operates in **Offline Standby Mode**. Ingestion, parsing, deterministic compliance, risk scoring, remediation diffs, and PDF reporting continue with 100% functionality.

### 10. Can AI modify compliance?
**Never.** Automated invariant tests prove that even if an LLM returns `PASS` for a `FAIL` finding, the engine neutralizes the override.

### 11. Why no automated remediation?
Automated live network execution (SSH/Netconf push) without human review can cause catastrophic outages or brick remote perimeter routers. We enforce a **Zero Automated Live Execution Policy**.

### 12. How is evidence verified?
Every finding captures the exact configuration line number and verbatim text string extracted during AST parsing.

### 13. How does risk scoring work?
Findings are scored using CVSS base factors and grouped by topological blast radius into composite 0–100 scores prioritized into P0, P1, P2, and P3.

### 14. What vendors are currently supported?
- Cisco IOS / IOS-XE
- Juniper JunOS (hierarchical and set formats)
- Fortinet FortiOS

### 15. What are the current limitations?
Currently focuses on routing, switching, and firewall configuration compliance; runtime packet analysis and physical topology discovery are outside the current static analysis scope.

### 16. How does the architecture scale?
FastAPI async endpoints with stateless AST parsing scale horizontally; database queries utilize async connection pools and indexed SHA-256 digests.

### 17. What would you build next?
Integration with hardware configuration backup vaults (e.g., Git-based Rancid/Oxidized) and real-time diff compliance auditing during CI/CD change management pipelines.
