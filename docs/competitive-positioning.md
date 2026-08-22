# NetVigil — Competitive & Architectural Positioning

**Problem Statement:** SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)

---

## 1. Architectural Comparison Matrix

| Dimension | Manual Checklist Auditing | Vendor-Specific Tools (e.g. Cisco Prime) | Traditional Static Scanners (e.g. Nipper) | LLM-Only AI Security Scanners | **NetVigil (SIH26155)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Multi-Vendor Support** | High manual effort | Siloed to one vendor | Hardcoded vendor parsers | Inconsistent / dialect-fragile | **Universal Security Model (Cisco, Juniper, Fortinet)** |
| **Compliance Scoring** | Subjective / slow | Vendor proprietary metrics | Deterministic | Non-deterministic (hallucinations) | **100% Deterministic & Mathematically Reproducible** |
| **Evidence Grounding** | Manual screenshots | Vague alerts | Regex match snippets | Generative / fabricated text | **Verbatim Line Citations + Observed vs Expected State** |
| **New Vendor / Syntax Adaptation** | Read manual & re-train | Vendor software update cycle | Vendor software update cycle | High prompt variability | **Adaptive Training with HITL & Property Allowlist Guard** |
| **Remediation Safety** | Manual script typing | Automated push (outage risk) | Generic advice | Dangerous synthesized commands | **Allowlisted Static Templates with Visual Diffs (Zero Live Push)** |
| **Air-Gap Readiness** | Yes | Depends on vendor license | Yes | No (requires cloud LLM) | **100% Core Functionality Air-Gap Capable** |

---

## 2. Deep-Dive Conceptual Differentiators

### A. NetVigil vs. Traditional Static Scanners
- **Static Scanners**: Rely on rigid, hardcoded regex dictionaries. Any novel vendor command or minor CLI syntax variation causes complete evaluation failure until a vendor software patch is released.
- **NetVigil**: Combines AST parsing with **Human-in-the-Loop Adaptive Training**. When an unparsed directive is encountered, the system interprets candidate semantics, verifies safety against a strict property allowlist, and enables administrators to approve the mapping without backend redeployment.

### B. NetVigil vs. Pure LLM-Based Compliance Tools
- **Pure LLMs**: Asking a general LLM "Does this config satisfy CIS 1.1.2?" produces non-deterministic answers, hallucinated NIST control mappings, and severe vulnerability to prompt injection inside configuration files.
- **NetVigil**: Implements a strict **two-tier architecture**. 100% of compliance evaluation is executed mathematically by the deterministic rule engine. The LLM is strictly isolated as a read-only co-pilot for natural language explanations.

### C. NetVigil vs. Vendor-Siloed Network Management
- **Vendor Tools**: Require separate interfaces and rule catalogs for Cisco IOS, Juniper JunOS, and FortiOS ($M \times N$ matrix explosion).
- **NetVigil**: Normalizes all device syntax into a vendor-agnostic 8-domain security model (`NormalizedSecurityProfile`). Compliance policies written once evaluate identically across all supported vendors ($O(M + N)$ complexity).
