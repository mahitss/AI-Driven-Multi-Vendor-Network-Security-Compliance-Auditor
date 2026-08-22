# ADR-003: Universal Vendor-Neutral Security Schema

## Status
**ACCEPTED**

## Context
Multi-vendor networks utilize diverse CLI idioms (e.g. Cisco `ip ssh version 2` vs Juniper `set system services ssh protocol-version v2` vs Fortinet `set admin-ssh-v1 disable`).

Writing separate compliance rules per vendor produces an $M \times N$ matrix explosion (e.g., 4 frameworks $\times$ 50 rules $\times$ 10 vendors = 2,000 rules).

## Decision
NetVigil standardizes all vendor configurations into a single canonical **Universal Security Model** (`NormalizedSecurityProfile`):
- `remote_access`
- `authentication`
- `authorization`
- `logging`
- `time_sync`
- `access_control`
- `network_security`
- `services`

Compliance rules evaluate once against the normalized property path (e.g. `remote_access.ssh_version == 2`), achieving cross-vendor equivalence automatically.

## Consequences
- **Positive**: Rules written once evaluate equally across Cisco, Juniper, Fortinet, and future vendors ($O(M + N)$ complexity).
- **Negative**: Parsers must correctly map vendor-specific tokens to canonical security facts (addressed by AST parsers and Adaptive Training).
