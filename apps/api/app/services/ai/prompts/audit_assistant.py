"""
Audit Assistant Prompt Templates
Problem Statement: SIH26155 (NTRO)

Strict Rules:
- The assistant is strictly read-only.
- Answers must be grounded in actual audit session statistics and finding records.
- Output includes answer text, list of supporting finding control IDs/IDs, and confidence score.
"""
from typing import Any, Dict, List

AUDIT_ASSISTANT_SYSTEM_PROMPT = """You are NetVigil AI Audit Co-Pilot, an intelligent network security assistant embedded in the NetVigil Compliance Platform for the National Technical Research Organisation (NTRO).

Your mission is to answer user questions regarding an active compliance audit session accurately and concisely.

CRITICAL CONSTRAINTS:
1. Base your answer EXCLUSIVELY on the provided audit summary and finding records.
2. If the user asks for prioritization, prioritize by: CRITICAL > HIGH > MEDIUM > LOW findings that have status FAIL or UNKNOWN.
3. When referencing specific controls or findings, cite their Control ID (e.g. CIS-1.2.1, NIST-AC-17, STIG-NET0400).
4. You have NO permission to execute shell commands, alter database states, or modify configuration files.
5. Return strictly valid JSON conforming to the requested schema.

Output Schema:
{
  "answer": "Clear, markdown-formatted technical response to the user's query.",
  "supporting_findings": ["List of finding IDs or control IDs directly supporting this answer"],
  "confidence": 0.95
}
"""


def build_audit_assistant_prompt(
    user_query: str,
    audit_id: str,
    overall_score: float,
    framework_scores: Dict[str, float],
    severity_breakdown: Dict[str, int],
    status_counts: Dict[str, int],
    relevant_findings: List[Dict[str, Any]],
) -> str:
    """Builds a grounded prompt containing real audit data for the AI co-pilot."""
    findings_summary = []
    for f in relevant_findings[:25]:  # Context minimization: top 25 relevant findings
        findings_summary.append(
            f"- [{f.get('status')}] {f.get('framework')}:{f.get('control_id')} ({f.get('severity')}) — {f.get('title')}: "
            f"Actual='{f.get('actual_value')}', Expected='{f.get('expected_value')}' (ID: {f.get('id')})"
        )

    findings_text = "\n".join(findings_summary) if findings_summary else "No specific findings."

    prompt = f"""ACTIVE AUDIT SESSION DATA:
- Audit ID: {audit_id}
- NetVigil Compliance Score: {overall_score:.1f}%
- Framework Scores: {framework_scores}
- Severity Breakdown (Fails & Unknowns): Critical={severity_breakdown.get('critical', 0)}, High={severity_breakdown.get('high', 0)}, Medium={severity_breakdown.get('medium', 0)}, Low={severity_breakdown.get('low', 0)}
- Finding Status Counts: {status_counts}

RELEVANT FINDINGS EXCERPT:
{findings_text}

USER QUESTION:
"{user_query}"

Provide an accurate, grounded answer citing specific findings and control IDs in the specified JSON format.
"""
    return prompt
