# NetVigil — Evaluator Technical Q&A Guide

**Problem Statement:** SIH26155 (NTRO)  
**Document Purpose:** In-depth technical justifications for hackathon & jury defenses.

---

### Q1: Why not use an LLM directly to audit configurations?
**Answer:** LLMs are non-deterministic, prone to hallucination (e.g. claiming a non-existent NIST control passed), vulnerable to prompt injection, and expensive. In cybersecurity compliance, audit findings must be **100% mathematically reproducible and legally defensible**. NetVigil uses a deterministic rule engine for compliance scoring, and reserves AI purely for read-only natural language explanations and unknown syntax interpretation.

### Q2: Why not just use regex scripts?
**Answer:** Regex scripts are vendor-fragile, break with simple indentation/whitespace changes, and create an $M \times N$ matrix explosion across multiple vendors and frameworks. NetVigil parses configurations into hierarchical Abstract Syntax Trees (ASTs) and maps them to a canonical **Universal Security Model**, allowing one compliance rule to evaluate identically across Cisco, Juniper, Fortinet, and future vendors.

### Q3: How do you prevent hallucinations in the AI layer?
**Answer:** The AI operates on structured, pre-extracted facts and evidence snippets rather than raw unbounded input. AI outputs are strictly constrained via Pydantic response models, temperature is locked to 0.1, and the AI is structurally prohibited from modifying audit scores, database models, or system files.

### Q4: How does Adaptive Training work without code changes?
**Answer:** When the AST parser encounters unhandled CLI tokens, it captures them as `unknown_items`. The AI classifies the candidate semantic domain. The candidate property is validated against a strict `NORMALIZED_PROPERTY_ALLOWLIST` (preventing arbitrary path injection). Once approved by an authorized administrator, the mapping is saved to the `TrainingMapping` knowledge table. Future parses load approved mappings dynamically into the normalization pipeline.

### Q5: How do you prevent dangerous remediation commands from breaking production?
**Answer:** NetVigil enforces a strict **Zero Automated Execution Policy**. We never execute commands automatically via SSH or Netconf. Remediation CLI blocks are selected strictly from pre-allowlisted static templates (`REMEDIATION_CATALOG`). If a vendor or control is unsupported, the system returns `NOT_AVAILABLE` rather than synthesizing risky commands. All changes must be manually reviewed and approved by human operators.

### Q6: How is sensitive data (passwords, keys, SNMP strings) protected?
**Answer:** Cleartext passwords, MD5/SHA password hashes, SNMP community strings, and private keys are redacted at ingestion and never displayed in plain text in logs, AI prompts, or exported reports. Uploaded files are isolated, hashed with SHA-256, and stored in protected storage.

### Q7: What happens when the AI service is offline?
**Answer:** NetVigil continues to operate at 100% functionality for vendor detection, parsing, compliance auditing, risk prioritization, remediation generation, and report exporting. Only optional features (AI Audit Assistant and AI unknown syntax suggestions) gracefully report `AI Service Offline` while the core compliance engine remains fully operational.
