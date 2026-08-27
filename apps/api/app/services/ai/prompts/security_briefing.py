"""
NetVigil AI Security Briefing & Analyst Copilot Grounded Prompts
Problem Statement: SIH26155 (NTRO)

Strict Architectural Constraints:
- AI is strictly advisory.
- Configuration text is untrusted and wrapped in <untrusted_configuration_data>.
- All credentials and sensitive secrets are pre-redacted.
- All facts are grounded in deterministic AST evaluation and catalog records.
"""
from typing import Any, Dict, List, Optional
from app.services.ai.security import redact_sensitive_data, sanitize_untrusted_configuration


def build_security_briefing_prompt(
    audit_id: str,
    device_hostname: str,
    vendor: str,
    compliance_score: float,
    risk_score: float,
    framework_scores: Dict[str, float],
    priority_counts: Dict[str, int],
    findings: List[Dict[str, Any]],
    risks: List[Dict[str, Any]],
    evolution_deltas: Optional[Dict[str, Any]] = None,
    remediations: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Builds a structured, pre-redacted prompt for generating an executive AI Security Briefing."""

    findings_text_blocks = []
    for f in findings[:25]:
        line_info = f"Line {f.get('source_line')}" if f.get('source_line') else "Line [Unknown]"
        ev_clean = redact_sensitive_data(f.get("evidence", "") or "")
        findings_text_blocks.append(
            f"- Control: {f.get('control_id')} | Status: {f.get('status')} | Severity: {f.get('severity')} | {line_info}\n"
            f"  Title: {f.get('title')}\n"
            f"  Evidence: {ev_clean}"
        )
    findings_formatted = "\n".join(findings_text_blocks) if findings_text_blocks else "No open findings recorded."

    risks_text_blocks = []
    for r in (risks or [])[:10]:
        risks_text_blocks.append(
            f"- Priority: {r.get('priority')} | Score: {r.get('risk_score', 0):.1f}/100 | Title: {r.get('title')}\n"
            f"  Category: {r.get('category')} | Blast Radius: {r.get('blast_radius', 'Asset')}"
        )
    risks_formatted = "\n".join(risks_text_blocks) if risks_text_blocks else "No elevated risks identified."

    evolution_section = "No baseline comparison audit supplied."
    if evolution_deltas:
        d = evolution_deltas.get("deltas", {})
        evolution_section = (
            f"Baseline Audit: {evolution_deltas.get('before_audit_id')}\n"
            f"Current Audit: {evolution_deltas.get('after_audit_id')}\n"
            f"Before Compliance: {d.get('before_score', 0)}% -> After Compliance: {d.get('after_score', 0)}% (Delta: +{d.get('score_delta', 0)}%)\n"
            f"Resolved Controls Count: {d.get('resolved_count', 0)}\n"
            f"Regressed Controls Count: {d.get('regressed_count', 0)}"
        )

    prompt = f"""
Audit Context:
- Audit ID: {audit_id}
- Device Hostname: {device_hostname}
- Network OS / Vendor: {vendor}
- Deterministic Compliance Score: {compliance_score:.1f}%
- Deterministic Risk Score: {risk_score:.1f} / 100
- Framework Scores: {framework_scores}
- Priority Distribution: P0={priority_counts.get('P0', 0)}, P1={priority_counts.get('P1', 0)}, P2={priority_counts.get('P2', 0)}, P3={priority_counts.get('P3', 0)}

Security Evolution (Time Machine):
{evolution_section}

<untrusted_configuration_data>
[DETERMINISTIC FINDINGS EVIDENCE]
{findings_formatted}

[IDENTIFIED CORRELATED RISKS]
{risks_formatted}
</untrusted_configuration_data>

Generate an executive AI Security Briefing matching the requested schema:
1. 'executive_summary': A clear 2-3 paragraph summary of the current security posture.
2. 'top_risks': The top 3-5 most critical risks. For each risk provide:
   - 'control_id': The exact Control ID (e.g. CIS-1.2.1)
   - 'title': The finding title
   - 'severity': Severity level
   - 'priority': Deterministic priority (P0, P1, P2, P3)
   - 'why_it_matters': Clear technical explanation of the exploit vector
   - 'evidence_citation': Grounded citation with line number and verbatim evidence snippet
   - 'recommended_action': Allowlisted vendor remediation command
3. 'recommended_investigation_order': 3-6 numbered steps for the security engineer, ordered strictly from highest priority (P0) to lowest.
4. 'suggested_copilot_questions': 4-6 relevant analyst questions about this audit.
"""
    return prompt.strip()


def build_copilot_chat_prompt(
    user_query: str,
    audit_id: str,
    device_hostname: str,
    vendor: str,
    compliance_score: float,
    risk_score: float,
    findings: List[Dict[str, Any]],
    chat_history: Optional[List[Dict[str, str]]] = None,
    evolution_deltas: Optional[Dict[str, Any]] = None,
) -> str:
    """Builds a grounded Q&A prompt for the Analyst Copilot."""

    history_text = ""
    if chat_history:
        history_text = "Prior Conversation:\n" + "\n".join(
            f"{turn.get('role', 'user').upper()}: {turn.get('content', '')}" for turn in chat_history[-4:]
        ) + "\n\n"

    findings_text_blocks = []
    for f in findings[:30]:
        line_info = f"Line {f.get('source_line')}" if f.get('source_line') else "Line [Unknown]"
        ev_clean = redact_sensitive_data(f.get("evidence", "") or "")
        findings_text_blocks.append(
            f"- Control: {f.get('control_id')} | Status: {f.get('status')} | Severity: {f.get('severity')} | {line_info}\n"
            f"  Title: {f.get('title')}\n"
            f"  Evidence: {ev_clean}"
        )
    findings_formatted = "\n".join(findings_text_blocks)

    evolution_summary = ""
    if evolution_deltas:
        d = evolution_deltas.get("deltas", {})
        evolution_summary = f"Security Evolution: Score changed from {d.get('before_score')}% to {d.get('after_score')}% (+{d.get('score_delta')}%). Resolved: {d.get('resolved_count')}, Regressed: {d.get('regressed_count')}."

    prompt = f"""
{history_text}Active Audit Context:
- Audit ID: {audit_id}
- Device: {device_hostname} ({vendor})
- Compliance Score: {compliance_score:.1f}% | Risk Score: {risk_score:.1f}/100
{evolution_summary}

<untrusted_configuration_data>
[AVAILABLE FINDINGS EVIDENCE]
{findings_formatted}
</untrusted_configuration_data>

User Question: "{user_query}"

Provide an authoritative, evidence-grounded response citing specific Control IDs and formatting line references as [EVIDENCE · LINE X].
If evidence is not available in the supplied context, explicitly state that evidence is unavailable.
"""
    return prompt.strip()
