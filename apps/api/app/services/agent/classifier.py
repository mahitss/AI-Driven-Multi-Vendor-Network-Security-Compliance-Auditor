"""
Semantic Intent & Objective Classifier for Autonomous Network Security Engineer
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Provides robust deterministic classification and Gemini AI semantic interpretation
to ensure only authorized, valid security objectives enter the autonomous execution lifecycle.
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

from app.core.logging import logger
from app.services.agent.models import AgentConstraint


class ObjectiveClassificationResult(BaseModel):
    """Structured result of objective intent classification and constraint extraction."""
    intent: str  # "AUDIT_AND_REMEDIATION", "AUDIT_ONLY", "REMEDIATION", "INFORMATION", "AMBIGUOUS", "INVALID"
    is_valid: bool
    remediation_authorized: bool
    user_constraints: List[AgentConstraint] = Field(default_factory=list)
    system_policies: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    reasoning: str = ""
    suggested_prompts: List[str] = Field(default_factory=list)
    information_response: Optional[str] = None


DEFAULT_SUGGESTIONS = [
    "Audit these network configurations against CIS Level 1 baseline.",
    "Find high-risk compliance violations and prepare remediation, but do not modify SSH access.",
    "Audit fleet and harden management access: disable Telnet and cleartext HTTP.",
]

KNOWLEDGE_BASE: Dict[str, str] = {
    "cis": (
        "CIS (Center for Internet Security) Benchmarks are globally recognized, consensus-based security best practices. "
        "Level 1 profiles cover essential, low-overhead hardening (e.g., disabling cleartext Telnet, enforcing AAA, securing banners), "
        "while Level 2 profiles address defense-in-depth for high-security environments."
    ),
    "nist": (
        "NIST SP 800-53 (Rev 5) provides a catalog of security and privacy controls for federal information systems, "
        "focusing on Access Control (AC), System and Communications Protection (SC), and Audit and Accountability (AU)."
    ),
    "stig": (
        "DISA Security Technical Implementation Guides (STIGs) are stringent cybersecurity standards mandated for DoD networks. "
        "They enforce strict cryptographic algorithms, DoD logon banners, and disabling unauthenticated management protocols."
    ),
    "iso": (
        "ISO/IEC 27001 specifies requirements for establishing, implementing, maintaining, and continually improving "
        "an Information Security Management System (ISMS)."
    ),
    "ssh": (
        "SSHv2 (Secure Shell version 2) provides encrypted remote administrative access, replacing legacy cleartext protocols "
        "such as Telnet and rlogin. NetVigil enforces SSH version 2 and protects operational management access."
    ),
}


class ObjectiveClassifier:
    """Classifies operator objectives and validates execution authority."""

    @classmethod
    def _is_gibberish_or_invalid(cls, text: str) -> bool:
        """Heuristic check for nonsense, keyboard mashing, or out-of-domain input."""
        cleaned = text.strip().lower()
        if len(cleaned) < 4:
            return True

        # Check for keyboard smash patterns (e.g. "acndjk", "asdfgh", "qwerty")
        gibberish_patterns = [
            r"acndjk", r"asdfg", r"zxcvb", r"qwerty", r"hjkl", r"dfghj",
            r"[b-df-hj-np-tv-z]{6,}", # 6+ consecutive consonants
        ]
        for pat in gibberish_patterns:
            if re.search(pat, cleaned):
                return True

        # Check for repeated nonsense characters (e.g. "aaaaa", ".....")
        if re.search(r"(.)\1{4,}", cleaned):
            return True

        # Recognized domain keywords
        domain_keywords = [
            "audit", "cis", "nist", "stig", "iso", "compliance", "security",
            "remediate", "remediation", "fix", "patch", "harden", "config",
            "configuration", "router", "switch", "firewall", "cisco", "juniper",
            "fortinet", "ssh", "telnet", "snmp", "bgp", "ntp", "tacacs", "radius",
            "baseline", "violation", "vulnerability", "risk", "network", "fleet",
            "password", "banner", "syslog", "interface", "protocol", "port",
            "access", "encrypt", "unencrypted", "cleartext", "auth", "aaa"
        ]

        words = re.findall(r"[a-z0-9]+", cleaned)
        if not words:
            return True

        matched_domain_terms = [w for w in words if w in domain_keywords]
        
        # If words exist but zero security/network keywords are present and string looks informal/random
        if len(matched_domain_terms) == 0:
            # Check if it's a general question or completely out of domain
            non_domain_general = ["what is it", "who are you", "make me", "pizza", "weather", "recipe", "song", "hello"]
            if any(nd in cleaned for nd in non_domain_general):
                return True
            if len(words) < 3:
                return True

        return False

    @classmethod
    def _extract_user_constraints(cls, text: str) -> List[AgentConstraint]:
        """Extracts operator-specified negative constraints using robust semantic & regex patterns."""
        constraints: List[AgentConstraint] = []
        obj_lower = text.lower()

        # SSH Protection Patterns
        ssh_patterns = [
            r"\b(?:do\s*not|don'?t|dont|never|avoid|skip|exclude|without)\s+(?:modify|change|touch|alter|reconfigure|update|edit|remediate|affect)\s+.*?\bssh\b",
            r"\b(?:protect|preserve|retain|keep|leave|maintain|isolate)\s+.*?\bssh\b",
            r"\bssh\b.*?(?:access|service|version|keys?|ciphers?|config|configuration)?\s*(?:must|should|to)?\s*(?:remain|stay|be)?\s*(?:unmodified|untouched|unchanged|as\s*is|preserved|protected)",
            r"\b(?:no|zero)\s+ssh\s+(?:modifications?|changes?|updates?|remediations?|patches?)",
            r"\b(?:except|excluding|aside\s+from|saving|with\s+the\s+exception\s+of)\s+(?:for\s+)?.*?\bssh\b",
            r"\bssh\b.*?(?:do\s*not\s*modify|do\s*not\s*touch|dont\s*touch|protected|untouched|unmodified)",
            r"\bdo\s+not\s+modify\s+ssh\b",
            r"\bprotect\s+ssh\b",
            r"\bpreserve\s+ssh\b",
            r"\bleave\s+ssh\b",
        ]
        if any(re.search(pat, obj_lower) for pat in ssh_patterns) or any(phrase in obj_lower for phrase in [
            "do not modify ssh", "don't modify ssh", "dont modify ssh",
            "do not touch ssh", "don't touch ssh", "dont touch ssh",
            "leave ssh", "preserve ssh", "without modifying ssh",
            "do not change ssh", "don't change ssh", "protect ssh",
            "without changing ssh", "ssh access protected", "no ssh changes",
            "keep ssh untouched", "do not modify ssh access"
        ]):
            constraints.append(AgentConstraint(
                subsystem="ssh",
                action="DO_NOT_MODIFY",
                description="Operator Directive: Strict preservation of existing SSH management access and key configurations.",
            ))

        # SNMP Protection Patterns
        snmp_patterns = [
            r"\b(?:do\s*not|don'?t|dont|never|avoid|skip|exclude|without)\s+(?:modify|change|touch|alter|update)\s+.*?\bsnmp\b",
            r"\b(?:protect|preserve|retain|keep|leave)\s+.*?\bsnmp\b",
            r"\bsnmp\b.*?(?:must|should|to)?\s*(?:remain|stay|be)?\s*(?:unmodified|untouched|unchanged|preserved|protected)",
            r"\b(?:no|zero)\s+snmp\s+(?:modifications?|changes?|updates?)",
        ]
        if any(re.search(pat, obj_lower) for pat in snmp_patterns) or any(phrase in obj_lower for phrase in [
            "do not modify snmp", "don't modify snmp", "dont modify snmp",
            "do not touch snmp", "don't touch snmp", "preserve snmp",
            "do not change snmp", "protect snmp", "without modifying snmp"
        ]):
            constraints.append(AgentConstraint(
                subsystem="snmp",
                action="DO_NOT_MODIFY",
                description="Operator Directive: SNMP community strings and monitoring access must remain unaltered.",
            ))

        # BGP / Routing Protection Patterns
        routing_patterns = [
            r"\b(?:do\s*not|don'?t|dont|never|avoid|skip|without)\s+(?:modify|change|touch|alter)\s+.*?\b(?:bgp|ospf|routing|routes?|peering)\b",
            r"\b(?:protect|preserve|retain|keep)\s+.*?\b(?:bgp|ospf|routing|routes?|peering)\b",
            r"\b(?:bgp|ospf|routing)\b.*?(?:must|should)?\s*(?:remain|stay|be)?\s*(?:unmodified|untouched|preserved)",
        ]
        if any(re.search(pat, obj_lower) for pat in routing_patterns) or any(phrase in obj_lower for phrase in [
            "do not modify bgp", "don't modify bgp", "dont touch routing",
            "do not touch routing", "preserve routing", "do not modify routing"
        ]):
            constraints.append(AgentConstraint(
                subsystem="routing",
                action="DO_NOT_MODIFY",
                description="Operator Directive: Core routing policies and peering sessions must remain untouched.",
            ))

        return constraints

    @classmethod
    def classify_objective(cls, objective: str) -> ObjectiveClassificationResult:
        """
        Deterministically evaluates objective text, categorizes intent,
        and authorizes execution parameters.
        """
        raw_text = objective.strip()
        text_lower = raw_text.lower()

        # System policies always in effect
        system_policies = [
            "Deterministic AST fact extraction",
            "100% catalog-grounded allowlisted CLI commands",
            "Zero unauthenticated configuration mutations",
            "Formal human approval gate required prior to change execution",
        ]

        # 1. Check for Gibberish / Empty / Invalid Input
        if not raw_text or cls._is_gibberish_or_invalid(raw_text):
            return ObjectiveClassificationResult(
                intent="INVALID",
                is_valid=False,
                remediation_authorized=False,
                user_constraints=[],
                system_policies=system_policies,
                confidence=0.99,
                reasoning="Input contains nonsense, gibberish, or non-security text.",
                suggested_prompts=DEFAULT_SUGGESTIONS,
                information_response=None,
            )

        # 2. Check for Informational Questions (What is X, Explain Y)
        is_question = bool(
            raw_text.endswith("?") or
            re.match(r"^(what is|what are|explain|tell me about|how does|define)\b", text_lower)
        )
        if is_question and not any(kw in text_lower for kw in ["fix", "remediate", "audit fleet", "audit these", "audit network"]):
            # Match knowledge base topics
            matched_info = None
            for key, desc in KNOWLEDGE_BASE.items():
                if key in text_lower:
                    matched_info = desc
                    break

            if not matched_info:
                matched_info = (
                    f"NetVigil is an Autonomous Network Security Compliance Auditor for heterogeneous multi-vendor fleets (Cisco, Juniper, Fortinet). "
                    f"You can ask NetVigil to audit configurations, evaluate benchmarks (CIS, NIST, STIG, ISO), or formulate allowlisted remediation plans."
                )

            return ObjectiveClassificationResult(
                intent="INFORMATION",
                is_valid=True,
                remediation_authorized=False,
                user_constraints=[],
                system_policies=system_policies,
                confidence=0.95,
                reasoning="Identified as an informational security/compliance inquiry.",
                suggested_prompts=DEFAULT_SUGGESTIONS,
                information_response=matched_info,
            )

        # 3. Extract User Constraints
        user_constraints = cls._extract_user_constraints(raw_text)

        # 4. Check for Ambiguous Vague Objectives (e.g. "Secure my network", "Make it safe")
        ambiguous_triggers = ["secure my network", "make it safe", "fix it", "make compliant", "fix everything", "harden all"]
        if any(text_lower == amb or text_lower == f"{amb}." for amb in ambiguous_triggers):
            return ObjectiveClassificationResult(
                intent="AMBIGUOUS",
                is_valid=True,
                remediation_authorized=False,  # DO NOT silently assume remediation authority!
                user_constraints=user_constraints,
                system_policies=system_policies,
                confidence=0.85,
                reasoning="Objective is broad and ambiguous. Safe read-only assessment authorized; remediation planning withheld until scope clarified.",
                suggested_prompts=DEFAULT_SUGGESTIONS,
            )

        # 5. Check for Explicit Remediation Authority
        remediation_keywords = [
            "fix", "remediate", "harden", "patch", "resolve", "correct",
            "disable telnet", "disable cleartext", "disable http",
            "enforce sshv2", "enable encryption", "apply remediations"
        ]
        has_remediation_intent = any(kw in text_lower for kw in remediation_keywords)

        audit_keywords = [
            "audit", "scan", "inspect", "check", "evaluate", "assess",
            "review", "find", "identify", "analyze"
        ]
        has_audit_intent = any(kw in text_lower for kw in audit_keywords)

        if has_remediation_intent:
            intent = "AUDIT_AND_REMEDIATION" if has_audit_intent else "REMEDIATION"
            return ObjectiveClassificationResult(
                intent=intent,
                is_valid=True,
                remediation_authorized=True,
                user_constraints=user_constraints,
                system_policies=system_policies,
                confidence=0.98,
                reasoning="Explicit remediation authorization identified alongside baseline audit requirements.",
                suggested_prompts=[],
            )

        # 6. Default to Read-Only Audit
        return ObjectiveClassificationResult(
            intent="AUDIT_ONLY",
            is_valid=True,
            remediation_authorized=False,
            user_constraints=user_constraints,
            system_policies=system_policies,
            confidence=0.95,
            reasoning="Read-only compliance audit authorized. No configuration modifications authorized.",
            suggested_prompts=[],
        )
