"""
NetVigil Deterministic Multi-Vendor Detection Engine
Problem Statement: SIH26155 (NTRO)

Analyzes raw network device configurations using weighted deterministic syntax signatures
and structural heuristics to identify vendor and platform with high accuracy and explainability.
"""
import re
from typing import Dict, List, Optional, Tuple
from app.schemas.configuration import VendorDetectionResult


class VendorSignature:
    def __init__(self, name: str, pattern: str, weight: float, description: str):
        self.name = name
        self.regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
        self.weight = weight
        self.description = description


CISCO_SIGNATURES: List[VendorSignature] = [
    VendorSignature(
        "cisco_boot_marker",
        r"^\s*!\s*Last configuration change.*|^\s*!\s*NVRAM config last updated.*|^\s*boot-start-marker",
        0.95,
        "Cisco header / boot marker signature",
    ),
    VendorSignature(
        "cisco_service_timestamps",
        r"^\s*service timestamps (?:debug|log) datetime",
        0.90,
        "Cisco service timestamps directive",
    ),
    VendorSignature(
        "cisco_service_pwd_enc",
        r"^\s*service password-encryption",
        0.85,
        "Cisco password encryption directive",
    ),
    VendorSignature(
        "cisco_enable_secret",
        r"^\s*enable (?:secret|password)\s+(?:\d+\s+)?\S+",
        0.90,
        "Cisco privileged enable secret declaration",
    ),
    VendorSignature(
        "cisco_line_vty",
        r"^\s*line (?:vty|con|aux)\s+\d+(?:\s+\d+)?",
        0.85,
        "Cisco terminal line configuration",
    ),
    VendorSignature(
        "cisco_interface_naming",
        r"^\s*interface\s+(?:GigabitEthernet|TenGigabitEthernet|FastEthernet|Ethernet|Vlan|Loopback|Port-channel|Serial)\d+",
        0.85,
        "Cisco interface naming convention",
    ),
    VendorSignature(
        "cisco_spanning_tree",
        r"^\s*spanning-tree\s+(?:mode|portfast|bpduguard|extend)",
        0.80,
        "Cisco spanning tree commands",
    ),
    VendorSignature(
        "cisco_aaa_model",
        r"^\s*aaa\s+(?:new-model|authentication|authorization|accounting)",
        0.90,
        "Cisco AAA security subsystem",
    ),
    VendorSignature(
        "cisco_ip_access_list",
        r"^\s*ip access-list\s+(?:standard|extended)\s+\S+",
        0.80,
        "Cisco named ACL declaration",
    ),
    VendorSignature(
        "cisco_crypto_isakmp_ikev2",
        r"^\s*crypto\s+(?:isakmp|ikev2|ipsec|pki|key)",
        0.85,
        "Cisco cryptographic subsystem",
    ),
    VendorSignature(
        "cisco_banner_delim",
        r"^\s*banner\s+(?:motd|login|exec)\s+(\S)",
        0.75,
        "Cisco banner delimiter format",
    ),
    VendorSignature(
        "cisco_hostname_version",
        r"^\s*version\s+\d+\.\d+\s*$",
        0.70,
        "Cisco standalone version statement",
    ),
]

JUNIPER_SIGNATURES: List[VendorSignature] = [
    # Hierarchical JunOS
    VendorSignature(
        "junos_version_header",
        r"^\s*version\s+\d+\.\d+[R|D|B|X]\S*;",
        0.98,
        "JunOS version statement",
    ),
    VendorSignature(
        "junos_system_block",
        r"^\s*system\s*\{\s*(?:host-name|root-authentication|services|syslog)?",
        0.90,
        "JunOS system configuration block",
    ),
    VendorSignature(
        "junos_interfaces_hierarchy",
        r"^\s*interfaces\s*\{\s*(?:(?:ge-|xe-|et-|fxp-|lo|ae)\d+|unit\s+\d+)?",
        0.88,
        "JunOS hierarchical interface hierarchy",
    ),
    VendorSignature(
        "junos_protocols_hierarchy",
        r"^\s*protocols\s*\{\s*(?:bgp|ospf|lldp|rstp|mstp|dot1x)?",
        0.85,
        "JunOS protocols block",
    ),
    VendorSignature(
        "junos_firewall_filter",
        r"^\s*firewall\s*\{\s*(?:family\s+inet\s*\{)?\s*filter\s+\S+",
        0.85,
        "JunOS firewall filter construct",
    ),
    VendorSignature(
        "junos_security_hierarchy",
        r"^\s*security\s*\{\s*(?:zones|policies|ike|ipsec|screen)?",
        0.88,
        "JunOS SRX security hierarchy",
    ),
    # Set Syntax JunOS
    VendorSignature(
        "junos_set_version",
        r"^\s*set\s+version\s+\S+",
        0.98,
        "JunOS 'set version' syntax",
    ),
    VendorSignature(
        "junos_set_system",
        r"^\s*set\s+system\s+(?:host-name|root-authentication|services|time-zone|syslog)",
        0.95,
        "JunOS 'set system' configuration syntax",
    ),
    VendorSignature(
        "junos_set_interfaces",
        r"^\s*set\s+interfaces\s+(?:ge-|xe-|et-|fxp-|lo|ae)\S*\s+unit\s+\d+",
        0.95,
        "JunOS 'set interfaces' syntax",
    ),
    VendorSignature(
        "junos_set_security",
        r"^\s*set\s+security\s+(?:zones|policies|ike|ipsec|screen)",
        0.90,
        "JunOS SRX 'set security' syntax",
    ),
]

FORTINET_SIGNATURES: List[VendorSignature] = [
    VendorSignature(
        "fortinet_config_version",
        r"^\s*#config-version=\S+|^\s*#build\d+",
        0.98,
        "FortiOS config-version header comment",
    ),
    VendorSignature(
        "fortinet_config_system_global",
        r"^\s*config\s+system\s+global",
        0.95,
        "FortiOS 'config system global' block",
    ),
    VendorSignature(
        "fortinet_config_system_interface",
        r"^\s*config\s+system\s+interface",
        0.90,
        "FortiOS 'config system interface' block",
    ),
    VendorSignature(
        "fortinet_config_firewall_policy",
        r"^\s*config\s+firewall\s+(?:policy|address|service\s+custom)",
        0.90,
        "FortiOS 'config firewall policy' block",
    ),
    VendorSignature(
        "fortinet_config_router",
        r"^\s*config\s+router\s+(?:static|bgp|ospf)",
        0.85,
        "FortiOS 'config router' block",
    ),
    VendorSignature(
        "fortinet_config_vpn_ipsec",
        r"^\s*config\s+vpn\s+ipsec\s+(?:phase1-interface|phase2-interface)",
        0.85,
        "FortiOS VPN IPSec configuration block",
    ),
    VendorSignature(
        "fortinet_block_syntax",
        r"^\s*edit\s+\S+\s*(?:\n\s*set\s+\S+)+",
        0.80,
        "FortiOS 'edit ... set ... next' block structure",
    ),
]


class VendorDetector:
    """
    Deterministic signature-based vendor and platform classifier.
    Calculates weighted confidence based on syntax pattern matches.
    """

    @classmethod
    def detect_cisco_platform(cls, content: str) -> str:
        if re.search(r"Cisco Nexus|NX-OS", content, re.IGNORECASE):
            return "nxos"
        elif re.search(r"Cisco Adaptive Security Appliance|ASA Version", content, re.IGNORECASE):
            return "asa"
        elif re.search(r"IOS-XE|Cisco IOS XE", content, re.IGNORECASE):
            return "ios-xe"
        return "ios"

    @classmethod
    def detect_juniper_platform(cls, content: str) -> str:
        if re.search(r"security\s*\{|set security", content, re.IGNORECASE):
            return "junos-srx"
        return "junos"

    @classmethod
    def detect_fortinet_platform(cls, content: str) -> str:
        return "fortios"

    @classmethod
    def evaluate_vendor(
        cls, content: str, signatures: List[VendorSignature]
    ) -> Tuple[float, List[str], Dict[str, str]]:
        matched_signatures = []
        details = {}

        for sig in signatures:
            match = sig.regex.search(content)
            if match:
                matched_signatures.append(sig)
                matched_text = match.group(0).strip().splitlines()[0][:80]
                details[sig.name] = f"{sig.description} (match: '{matched_text}')"

        if not matched_signatures:
            return 0.0, [], {}

        # Max individual signature weight provides base confidence
        base_confidence = max(s.weight for s in matched_signatures)
        # Additional distinct pattern matches boost confidence towards 0.99
        additional_boost = min(0.15, (len(matched_signatures) - 1) * 0.05)
        final_confidence = min(0.99, round(base_confidence + additional_boost, 2))

        matched_names = [s.name for s in matched_signatures]
        return final_confidence, matched_names, details

    @classmethod
    def detect(cls, content: str, filename: Optional[str] = None) -> VendorDetectionResult:
        if not content or not content.strip():
            return VendorDetectionResult(
                vendor="unknown",
                platform=None,
                confidence=0.0,
                method="signature",
                detected_patterns=[],
                details={"reason": "Empty configuration content"},
            )

        try:
            # Bound input size to 256KB prefix to protect against ReDoS / quadratic scans on massive inputs
            bounded_content = content[:262144]

            cisco_conf, cisco_pats, cisco_details = cls.evaluate_vendor(bounded_content, CISCO_SIGNATURES)
            juniper_conf, juniper_pats, juniper_details = cls.evaluate_vendor(bounded_content, JUNIPER_SIGNATURES)
            fortinet_conf, fortinet_pats, fortinet_details = cls.evaluate_vendor(bounded_content, FORTINET_SIGNATURES)

            scores = [
                ("cisco", cisco_conf, cisco_pats, cisco_details),
                ("juniper", juniper_conf, juniper_pats, juniper_details),
                ("fortinet", fortinet_conf, fortinet_pats, fortinet_details),
            ]

            scores.sort(key=lambda x: x[1], reverse=True)
            top_vendor, top_conf, top_pats, top_details = scores[0]

            if top_conf < 0.40:
                return VendorDetectionResult(
                    vendor="unknown",
                    platform=None,
                    confidence=0.0,
                    method="signature",
                    detected_patterns=[],
                    details={
                        "evaluated_scores": {
                            "cisco": cisco_conf,
                            "juniper": juniper_conf,
                            "fortinet": fortinet_conf,
                        }
                    },
                )

            platform = None
            if top_vendor == "cisco":
                platform = cls.detect_cisco_platform(bounded_content)
            elif top_vendor == "juniper":
                platform = cls.detect_juniper_platform(bounded_content)
            elif top_vendor == "fortinet":
                platform = cls.detect_fortinet_platform(bounded_content)

            return VendorDetectionResult(
                vendor=top_vendor,
                platform=platform,
                confidence=top_conf,
                method="signature",
                detected_patterns=top_pats,
                details=top_details,
            )
        except Exception as e:
            return VendorDetectionResult(
                vendor="unknown",
                platform=None,
                confidence=0.0,
                method="signature",
                detected_patterns=[],
                details={"error": f"Safe vendor detection fallback: {str(e)}"},
            )
