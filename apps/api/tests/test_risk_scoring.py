"""
Risk Scoring & Priority Unit Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from app.services.risk.scoring import (
    calculate_risk_score,
    determine_finding_exposure,
    determine_finding_impact,
)


def test_risk_scoring_critical_severity_p0():
    score, priority, likelihood = calculate_risk_score(
        severity="CRITICAL",
        exposure="INTERNET_FACING",
        impact="CRITICAL",
        finding_count=3,
    )
    # (90 * 0.70) + ((10 + 10) * 1.5) + (2 * 3.5) = 63 + 30 + 7 = 100.0
    assert score >= 90.0
    assert priority == "P0"
    assert likelihood == "HIGH"


def test_risk_scoring_high_severity_p1():
    score, priority, likelihood = calculate_risk_score(
        severity="HIGH",
        exposure="MANAGEMENT_PLANE",
        impact="HIGH",
        finding_count=1,
    )
    # (75 * 0.70) + ((6 + 7) * 1.5) = 52.5 + 19.5 = 72.0 -> P2 or with group P1
    assert 70.0 <= score <= 90.0
    assert priority in ["P1", "P2"]


def test_risk_scoring_low_severity_p3():
    score, priority, likelihood = calculate_risk_score(
        severity="LOW",
        exposure="LOCAL_ONLY",
        impact="LOW",
        finding_count=1,
    )
    # (25 * 0.70) + ((0 + 1) * 1.5) = 17.5 + 1.5 = 19.0
    assert score < 50.0
    assert priority == "P3"
    assert likelihood == "LOW"


def test_risk_scoring_deterministic_reproducibility():
    s1, p1, l1 = calculate_risk_score("HIGH", "MANAGEMENT_PLANE", "HIGH", 2)
    s2, p2, l2 = calculate_risk_score("HIGH", "MANAGEMENT_PLANE", "HIGH", 2)
    assert s1 == s2
    assert p1 == p2
    assert l1 == l2


def test_exposure_and_impact_inference():
    exp_mgmt = determine_finding_exposure("remote_access", "Telnet cleartext enabled")
    assert exp_mgmt == "MANAGEMENT_PLANE"

    exp_wan = determine_finding_exposure("network_security", "Internet facing interface public IP")
    assert exp_wan == "INTERNET_FACING"

    imp_crit = determine_finding_impact("CRITICAL", "authentication")
    assert imp_crit == "CRITICAL"

    imp_low = determine_finding_impact("LOW", "time_sync")
    assert imp_low == "LOW"
