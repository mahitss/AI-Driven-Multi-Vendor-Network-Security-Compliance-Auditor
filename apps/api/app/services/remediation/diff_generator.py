"""
Visual Configuration Diff Generator
Problem Statement: SIH26155 (NTRO)

Generates structured REMOVE, ADD, and UNCHANGED configuration diff previews.
"""
from typing import Any, Dict, List, Optional


def generate_remediation_diff(
    current_evidence: str = "",
    remediation_commands: str = "",
    vendor: str = "unknown",
    original_config: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Constructs a visual configuration diff comparing current non-compliant state with proposed fix.
    """
    diff_lines: List[Dict[str, str]] = []

    # Filter out comments and boilerplate like 'configure terminal', 'end', 'write memory' for clean diff
    noise_tokens = {"configure terminal", "end", "write memory", "commit", "exit"}

    # Extract non-compliant evidence lines to mark as REMOVE or PREVIOUS
    evidence_lines = [
        line.strip()
        for line in (current_evidence or "").split("\n")
        if line.strip() and not line.strip().startswith("#") and not line.strip().startswith("!")
    ]

    for ev in evidence_lines:
        diff_lines.append({
            "type": "REMOVE",
            "line": ev,
            "description": "Non-compliant configuration baseline",
        })

    # Extract remediation commands to mark as ADD
    cmd_lines = [
        line.strip()
        for line in remediation_commands.split("\n")
        if line.strip() and line.strip().lower() not in noise_tokens and not line.strip().startswith("#")
    ]

    for cmd in cmd_lines:
        diff_lines.append({
            "type": "ADD",
            "line": cmd,
            "description": "Compliant remediation directive",
        })

    remove_count = sum(1 for d in diff_lines if d["type"] == "REMOVE")
    add_count = sum(1 for d in diff_lines if d["type"] == "ADD")

    return {
        "diff_lines": diff_lines,
        "remove_count": remove_count,
        "add_count": add_count,
        "vendor": vendor,
        "preview_text": "\n".join([
            f"{'- ' if d['type'] == 'REMOVE' else '+ '}{d['line']}" for d in diff_lines
        ]),
    }
