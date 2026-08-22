# ADR-005: Allowlisted Remediation Templates and Zero Execution Guarantee

## Status
**ACCEPTED**

## Context
A network compliance auditing platform must never autonomously modify live production firewalls, routers, or cryptographic keypairs. Automated remote execution (e.g. via SSH or Netconf) risks network outages, routing loops, and critical infrastructure disruption.

## Decision
NetVigil enforces a strict **Zero Automated Execution Policy**:
1. **Allowlisted Static Templates**: Remediation commands for Cisco IOS, Juniper JunOS, and Fortinet FortiOS are derived exclusively from verified, static templates (`REMEDIATION_CATALOG`).
2. **Visual Diff Generation**: Provides structured `REMOVE` and `ADD` lines for human configuration change boards.
3. **Safe Fallback**: Unsupported vendors return `status = "NOT_AVAILABLE"` with zero synthesized or hallucinated commands.
4. **Export & Air-Gap Ready**: 1-Click Copy and `.cfg` / `.conf` / `.set` script download for manual deployment during authorized maintenance windows.

## Consequences
- **Positive**: Absolute protection against unintended network disruption. High audit defensibility and compliance safety.
- **Negative**: Administrators must copy/download and deploy scripts manually or through existing change-management pipelines.
