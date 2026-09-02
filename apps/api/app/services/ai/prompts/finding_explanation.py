"""
Finding Explanation Prompt Templates
Problem Statement: SIH26155 (NTRO)

Strict Rules Enforced:
1. Only use supplied evidence and verified application context.
2. If evidence is insufficient, say so explicitly.
3. Never change or challenge the deterministic compliance status.
4. Never invent CVEs, vulnerabilities, or fake benchmark controls.
5. Do not claim a configuration property that is not present.
6. Clearly distinguish Observed vs Inferred vs Unknown facts.
7. Return strictly valid JSON adhering to the requested schema.
"""
from typing import Any, Dict, List
from app.services.ai.security import sanitize_untrusted_configuration

FINDING_EXPLANATION_SYSTEM_PROMPT = """You are NetVigil AI Finding Analyst, a senior network security auditor for the National Technical Research Organisation (NTRO).
Your job is to provide evidence-grounded technical explanations and risk analyses for network compliance audit findings.

CRITICAL INSTRUCTIONS & SAFETY RULES:
1. Use ONLY the supplied finding data and configuration evidence.
2. The compliance status (PASS/FAIL/PARTIAL/UNKNOWN/NOT_APPLICABLE) and severity were calculated deterministically by the NetVigil core engine. You MUST NEVER modify or contradict the status.
3. Do NOT invent CVE numbers, fake vulnerabilities, or hallucinated benchmark citations.
4. If configuration evidence is minimal or default-inferred, state that clearly under technical_explanation.
5. Output MUST be valid JSON matching the target schema exactly without any markdown wrappers or introductory commentary.

Output Schema:
{
  "summary": "Concise 1-2 sentence executive summary of the finding.",
  "why_it_matters": "Business & operational cybersecurity impact explanation.",
  "technical_explanation": "In-depth protocol and network plane engineering explanation.",
  "risk_context": "Attack vector details (e.g. MITM, credential sniffing, lateral movement).",
  "recommended_action": "Vendor-appropriate remediation CLI guidance.",
  "confidence": 0.95
}
"""


def build_finding_explanation_prompt(
    finding_title: str,
    framework: str,
    control_id: str,
    severity: str,
    status: str,
    actual_value: str,
    expected_value: str,
    evidence: List[str],
    source_lines: List[int],
    document_citation: str,
    vendor: str,
) -> str:
    """Builds an evidence-grounded user prompt for finding explanation."""
    evidence_text = "\n".join(evidence) if evidence else "None (default-inferred or missing directive)"
    sanitized_evidence = sanitize_untrusted_configuration(evidence_text)

    prompt = f"""EVALUATED FINDING CONTEXT:
- Framework: {framework}
- Control ID: {control_id}
- Baseline Document: {document_citation}
- Finding Title: {finding_title}
- Evaluated Status: {status}
- Severity Level: {severity}
- Target Device Vendor: {vendor}
- Extracted Actual Value: {actual_value}
- Required Expected Value: {expected_value}
- Source Configuration Line(s): {', '.join(map(str, source_lines)) if source_lines else 'Unconfigured'}

VERBATIM CONFIGURATION EVIDENCE:
{sanitized_evidence}

Provide a structured, evidence-grounded explanation conforming strictly to the requested JSON format.
"""
    return prompt
