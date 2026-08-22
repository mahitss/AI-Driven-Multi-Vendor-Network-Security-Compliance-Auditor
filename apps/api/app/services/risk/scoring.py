"""
NetVigil Risk Scoring & Priority Calculation Engine
Problem Statement: SIH26155 (NTRO)

Deterministic scoring formula combining Base Severity weights, Exposure modifiers, and Impact modifiers.
"""
from typing import Tuple

SEVERITY_WEIGHTS = {
    "CRITICAL": 90.0,
    "HIGH": 75.0,
    "MEDIUM": 50.0,
    "LOW": 25.0,
    "INFO": 10.0,
}

EXPOSURE_MODIFIERS = {
    "INTERNET_FACING": 10.0,
    "EXTERNAL": 8.0,
    "MANAGEMENT_PLANE": 6.0,
    "INTERNAL": 3.0,
    "LOCAL_ONLY": 0.0,
    "UNKNOWN": 2.0,
}

IMPACT_MODIFIERS = {
    "CRITICAL": 10.0,
    "HIGH": 7.0,
    "MEDIUM": 4.0,
    "LOW": 1.0,
    "UNKNOWN": 0.0,
}


def determine_finding_exposure(category: str, title: str = "") -> str:
    """Determines exposure level based on domain category and directive context."""
    cat = category.lower().strip() if category else ""
    t = title.lower()

    if "internet" in t or "public" in t or "wan" in t:
        return "INTERNET_FACING"
    if cat in ["remote_access", "management", "identity"]:
        return "MANAGEMENT_PLANE"
    if cat in ["authentication", "authorization", "access_control"]:
        return "MANAGEMENT_PLANE"
    if cat in ["network_security", "services"]:
        return "INTERNAL"
    if cat in ["logging", "time_sync"]:
        return "INTERNAL"

    return "MANAGEMENT_PLANE"


def determine_finding_impact(severity: str, category: str = "") -> str:
    """Determines business & operational impact based on finding criticality."""
    sev = severity.upper().strip()
    cat = category.lower().strip() if category else ""

    if sev == "CRITICAL" or cat in ["remote_access", "authentication"]:
        return "CRITICAL" if sev in ["CRITICAL", "HIGH"] else "HIGH"
    if sev == "HIGH":
        return "HIGH"
    if sev == "MEDIUM":
        return "MEDIUM"
    return "LOW"


def calculate_risk_score(
    severity: str,
    exposure: str = "MANAGEMENT_PLANE",
    impact: str = "HIGH",
    finding_count: int = 1,
) -> Tuple[float, str, str]:
    """
    Computes NetVigil Risk Score (0 - 100), Priority (P0, P1, P2, P3), and Likelihood rating.
    Returns: (risk_score, priority, likelihood)
    """
    base_weight = SEVERITY_WEIGHTS.get(severity.upper(), 50.0)
    exp_mod = EXPOSURE_MODIFIERS.get(exposure.upper(), 2.0)
    imp_mod = IMPACT_MODIFIERS.get(impact.upper(), 4.0)

    # Multi-finding correlation bonus (grouped risks represent higher aggregate risk)
    group_bonus = min(10.0, max(0.0, (finding_count - 1) * 3.5))

    raw_score = (base_weight * 0.70) + ((exp_mod + imp_mod) * 1.5) + group_bonus
    risk_score = min(100.0, max(0.0, round(raw_score, 1)))

    # Priority Bands
    if risk_score >= 90.0:
        priority = "P0"  # Immediate Remediation
        likelihood = "HIGH"
    elif risk_score >= 75.0:
        priority = "P1"  # High Priority
        likelihood = "HIGH"
    elif risk_score >= 50.0:
        priority = "P2"  # Medium Priority
        likelihood = "MEDIUM"
    else:
        priority = "P3"  # Low Priority
        likelihood = "LOW"

    return risk_score, priority, likelihood
