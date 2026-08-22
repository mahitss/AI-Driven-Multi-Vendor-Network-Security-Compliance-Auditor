# ADR-002: Deterministic Compliance Engine Instead of LLM-Based Compliance

## Status
**ACCEPTED**

## Context
In network security compliance auditing (CIS Benchmarks, NIST SP 800-53, DISA STIG, ISO 27001), regulatory integrity requires 100% reproducibility.

LLM prompts for direct compliance determination suffer from non-deterministic variance, hallucinations (claiming non-existent NIST controls pass or fail), prompt injection vulnerabilities, and token cost bottlenecks.

## Decision
NetVigil implements a **two-layer hybrid architecture**:
1. **Deterministic Rule Engine**: Evaluates Universal Security Model facts against official rule catalogs (`PASS`, `FAIL`, `PARTIAL`, `UNKNOWN`, `NOT_APPLICABLE`) with 100% mathematical reproducibility and verbatim line citations.
2. **AI Intelligence Layer**: Acts purely as a read-only Co-Pilot and finding summarizer. The AI is strictly prohibited from mutating audit scores or overriding deterministic finding verdicts.

## Consequences
- **Positive**: Identical configurations audited twice always produce identical findings. Audits are mathematically defensible to government inspectors and auditors.
- **Negative**: Rule additions require catalog schemas (which is solved dynamically via the Adaptive Training system).
