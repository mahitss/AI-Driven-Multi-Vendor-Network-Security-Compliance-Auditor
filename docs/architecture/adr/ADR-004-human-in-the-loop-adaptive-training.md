# ADR-004: Human-in-the-Loop Adaptive Training

## Status
**ACCEPTED**

## Context
SIH26155 explicitly mandates that the system must learn previously unseen vendor configuration structures without requiring backend code changes or redeployments.

However, completely autonomous AI knowledge injection without human oversight introduces poisoning attacks and parser instability.

## Decision
NetVigil implements **Human-in-the-Loop Adaptive Training**:
1. **Detection**: Unhandled syntax lines are tagged as `unknown_items` during AST parsing.
2. **AI Classification**: AI provides candidate semantic categories, normalized property candidates, and confidence tiers.
3. **Safety Guard**: Candidate property paths are validated against a strict `NORMALIZED_PROPERTY_ALLOWLIST`.
4. **Human Review**: A Security Administrator explicitly reviews, edits, or approves/rejects the mapping.
5. **Dynamic Knowledge Persistence**: Approved mappings are persisted in the `TrainingMapping` knowledge base and immediately active for subsequent parses and on-demand re-analysis.

## Consequences
- **Positive**: Zero-downtime extensibility with absolute protection against malicious or hallucinated mappings. Complete audit trail in `TrainingAuditTrail`.
- **Negative**: Requires administrator sign-off for new patterns before they affect production compliance scores.
