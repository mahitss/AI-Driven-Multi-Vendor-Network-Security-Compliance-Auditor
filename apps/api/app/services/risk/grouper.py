"""
Risk Finding Grouper & Correlation Engine
Problem Statement: SIH26155 (NTRO)

Correlates individual failed compliance findings into high-level composite security risks.
"""
from typing import Any, Dict, List
from app.models.finding import Finding
from app.services.risk.scoring import (
    calculate_risk_score,
    determine_finding_exposure,
    determine_finding_impact,
)

# Canonical risk themes and matching category/keyword rules
RISK_THEME_RULES = [
    {
        "key": "remote_admin_exposure",
        "title": "Administrative Remote Access & Management Plane Exposure",
        "category": "Remote Administration",
        "match_categories": ["remote_access", "management"],
        "match_keywords": ["telnet", "ssh", "vty", "http", "inactivity"],
        "base_severity": "CRITICAL",
        "description": "Cleartext or unhardened remote administrative protocols allow eavesdropping, session hijacking, or brute-force compromise of device management interfaces.",
    },
    {
        "key": "weak_authentication_storage",
        "title": "Weak Device Authentication & Credential Storage Insecurity",
        "category": "Authentication",
        "match_categories": ["authentication"],
        "match_keywords": ["password", "encryption", "enable secret", "lockout", "aaa"],
        "base_severity": "HIGH",
        "description": "Cleartext password configurations, lack of AAA centralized authentication, and missing brute-force defense facilitate unauthorized credential harvesting.",
    },
    {
        "key": "authorization_accounting_gaps",
        "title": "Command Authorization & Audit Accounting Enforcement Gaps",
        "category": "Authorization",
        "match_categories": ["authorization"],
        "match_keywords": ["command", "accounting", "role-based", "privilege"],
        "base_severity": "HIGH",
        "description": "Lack of granular command-level authorization and accounting permits unrecorded administrative actions and privilege escalation.",
    },
    {
        "key": "logging_forensic_blindspot",
        "title": "Centralized Logging Deficiency & Forensic Audit Blindspot",
        "category": "Logging & Monitoring",
        "match_categories": ["logging"],
        "match_keywords": ["syslog", "logging", "timestamps", "buffered"],
        "base_severity": "MEDIUM",
        "description": "Absence of remote syslog forwarding and millisecond timestamps prevents centralized SIEM correlation and forensic incident investigation.",
    },
    {
        "key": "layer2_control_plane_exposure",
        "title": "Layer 2 Switching & Control Plane Attack Surface Exposure",
        "category": "Network Exposure",
        "match_categories": ["network_security", "access_control"],
        "match_keywords": ["bpdu", "spanning-tree", "dhcp", "snooping", "arp", "copp", "port-security"],
        "base_severity": "HIGH",
        "description": "Missing BPDU guard, DHCP snooping, and Control Plane Policing expose infrastructure to L2 spoofing, rogue servers, and control plane DoS.",
    },
    {
        "key": "insecure_legacy_services",
        "title": "Insecure Legacy Management Services & Information Leakage",
        "category": "Configuration Hygiene",
        "match_categories": ["services"],
        "match_keywords": ["finger", "snmp", "proxy-arp", "broadcast", "cdp", "lldp"],
        "base_severity": "MEDIUM",
        "description": "Legacy daemons, default SNMP community strings, and unneeded network discovery broadcast unnecessary topology telemetry.",
    },
    {
        "key": "time_sync_integrity",
        "title": "Time Synchronization & NTP Cryptographic Integrity Gap",
        "category": "Time Synchronization",
        "match_categories": ["time_sync"],
        "match_keywords": ["ntp", "timezone", "authenticate"],
        "base_severity": "LOW",
        "description": "Unauthenticated time synchronization exposes system clocks to spoofing and timeline divergence during forensic analysis.",
    },
]


def group_findings_into_risks(findings: List[Finding], audit_id: str, device_id: str = None) -> List[Dict[str, Any]]:
    """
    Correlates and groups failed findings into structured risk items.
    """
    failed_findings = [f for f in findings if f.status in ["FAIL", "PARTIAL", "UNKNOWN"]]
    if not failed_findings:
        return []

    grouped_risks: List[Dict[str, Any]] = []
    assigned_finding_ids = set()

    for theme in RISK_THEME_RULES:
        theme_findings = []
        for f in failed_findings:
            if f.id in assigned_finding_ids:
                continue

            f_cat = (f.category or "").lower()
            f_title = f.title.lower()

            matches_cat = any(mc in f_cat for mc in theme["match_categories"])
            matches_kw = any(kw in f_title for kw in theme["match_keywords"])

            if matches_cat or matches_kw:
                theme_findings.append(f)
                assigned_finding_ids.add(f.id)

        if theme_findings:
            # Highest severity among contributing findings
            severities = [f.severity for f in theme_findings]
            if "CRITICAL" in severities:
                top_sev = "CRITICAL"
            elif "HIGH" in severities:
                top_sev = "HIGH"
            elif "MEDIUM" in severities:
                top_sev = "MEDIUM"
            else:
                top_sev = "LOW"

            exposure = determine_finding_exposure(theme["category"], theme["title"])
            impact = determine_finding_impact(top_sev, theme["category"])
            risk_score, priority, likelihood = calculate_risk_score(
                severity=top_sev,
                exposure=exposure,
                impact=impact,
                finding_count=len(theme_findings),
            )

            evidence_snippets = [f"{f.control_id}: {f.evidence or f.title}" for f in theme_findings[:3]]

            grouped_risks.append({
                "audit_id": audit_id,
                "device_id": device_id,
                "title": theme["title"],
                "description": theme["description"],
                "category": theme["category"],
                "severity": top_sev,
                "risk_score": risk_score,
                "priority": priority,
                "likelihood": likelihood,
                "impact": impact,
                "exposure": exposure,
                "confidence": 0.95,
                "finding_ids": [f.id for f in theme_findings],
                "affected_assets": [device_id or "Target Infrastructure Node"],
                "evidence_summary": "\n".join(evidence_snippets),
                "status": "OPEN",
            })

    # Catch any remaining standalone failed findings
    for f in failed_findings:
        if f.id not in assigned_finding_ids:
            exp = determine_finding_exposure(f.category or "General", f.title)
            imp = determine_finding_impact(f.severity, f.category or "General")
            r_score, pri, like = calculate_risk_score(f.severity, exp, imp, finding_count=1)

            grouped_risks.append({
                "audit_id": audit_id,
                "device_id": device_id,
                "title": f"Security Non-Compliance: {f.title}",
                "description": f.description or f"Deterministic baseline control failure for {f.control_id}.",
                "category": f.category or "Configuration Hygiene",
                "severity": f.severity,
                "risk_score": r_score,
                "priority": pri,
                "likelihood": like,
                "impact": imp,
                "exposure": exp,
                "confidence": 0.90,
                "finding_ids": [f.id],
                "affected_assets": [device_id or "Target Infrastructure Node"],
                "evidence_summary": f"{f.control_id}: {f.evidence or 'Non-compliant configuration baseline'}",
                "status": "OPEN",
            })

    # Sort descending by risk score
    grouped_risks.sort(key=lambda x: x["risk_score"], reverse=True)
    return grouped_risks
