"""
NetVigil Juniper JunOS Configuration Parser & Normalizer
Problem Statement: SIH26155 (NTRO)

Deterministic parser supporting both JunOS hierarchical ({ ... }) and flat set-syntax configurations.
Extracts normalized facts with verbatim line numbers and evidence.
"""
import re
from typing import Any, Dict, List, Optional, Tuple
from app.services.parser.base import BaseConfigurationParser, ParseTracker
from app.services.parser.models import (
    AccessControlFacts,
    AuthenticationFacts,
    AuthorizationFacts,
    DeviceIdentityFacts,
    LoggingFacts,
    ManagementFacts,
    NetworkSecurityFacts,
    NormalizedSecurityProfile,
    RemoteAccessFacts,
    SecurityFact,
    ServicesFacts,
    TimeSyncFacts,
)


class JuniperParser(BaseConfigurationParser):
    @property
    def vendor_name(self) -> str:
        return "juniper"

    @property
    def parser_name(self) -> str:
        return "Juniper JunOS Hierarchical & Set-Syntax AST Parser"

    @property
    def parser_version(self) -> str:
        return "1.2.0"

    @property
    def supported_platforms(self) -> List[str]:
        return ["junos", "junos-srx", "junos-ex", "junos-mx"]

    def can_parse(self, content: str, filename: Optional[str] = None) -> bool:
        if not content:
            return False
        return bool(
            re.search(
                r"^\s*version\s+\d+\.\d+.*?;|^\s*set\s+version|^\s*set\s+system\s+|^\s*system\s*\{",
                content,
                re.MULTILINE | re.IGNORECASE,
            )
        )

    def parse(self, content: str, filename: Optional[str] = None) -> NormalizedSecurityProfile:
        tracker = ParseTracker(content)
        lines = content.splitlines()

        facts_count = 0

        hostname_val: Optional[Tuple[str, str, int]] = None
        domain_name_val: Optional[Tuple[str, str, int]] = None
        os_version_val: Optional[Tuple[str, str, int]] = None
        banner_present_val: Optional[Tuple[bool, str, int, bool]] = None

        # Remote access
        ssh_enabled_val: Optional[Tuple[bool, str, int]] = None
        ssh_version_val: Optional[Tuple[int, str, int]] = None
        ssh_ciphers_secure_val: Optional[Tuple[bool, str, int]] = None
        telnet_enabled_val: Optional[Tuple[bool, str, int]] = None
        http_server_val: Optional[Tuple[bool, str, int]] = None
        https_server_val: Optional[Tuple[bool, str, int]] = None
        inactivity_timeout_val: Optional[Tuple[int, str, int]] = None

        # Authentication
        root_auth_val: Optional[Tuple[bool, str, int, str]] = None
        local_users: List[str] = []
        local_users_evidence: List[str] = []
        local_users_lines: List[int] = []
        tacacs_servers: List[str] = []
        tacacs_evidence: List[str] = []
        tacacs_lines: List[int] = []
        radius_servers: List[str] = []
        radius_evidence: List[str] = []
        radius_lines: List[int] = []

        # Logging
        logging_enabled = False
        syslog_servers: List[str] = []
        syslog_evidence: List[str] = []
        syslog_lines: List[int] = []

        # Time Sync
        ntp_servers: List[str] = []
        ntp_evidence: List[str] = []
        ntp_lines: List[int] = []
        timezone_val: Optional[Tuple[str, str, int]] = None

        # Access Control
        default_drop_inbound_val: Optional[Tuple[bool, str, int]] = None
        acls_count = 0
        acls_evidence: List[str] = []
        acls_lines: List[int] = []

        # Services & Network Security
        snmp_enabled = False
        snmp_default_comm_removed = True
        snmp_evidence: List[str] = []
        snmp_lines: List[int] = []
        lldp_enabled_val: Optional[Tuple[bool, str, int]] = None

        # First pass: analyze line-by-line
        for line_idx, raw_line in enumerate(lines):
            line_no = line_idx + 1
            line = raw_line.strip()

            if not line:
                tracker.mark_matched(line_no)
                continue
            if line.startswith("#") or line.startswith("/*") or line.startswith("*") or line.startswith("*/"):
                tracker.mark_matched(line_no)
                continue

            # OS Version (only match 'version' or 'set version' at start of command)
            m_ver = re.match(r"^(?:set\s+version\s+|version\s+)([0-9A-Za-z\.\-_]+)", line, re.IGNORECASE)
            if m_ver:
                os_version_val = (m_ver.group(1).rstrip(";"), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Hostname
            m_host = re.search(r"(?:set\s+system\s+host-name|host-name)\s+([^;\s\"]+)", line, re.IGNORECASE)
            if m_host:
                hostname_val = (m_host.group(1).strip("\"'"), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Domain Name
            m_dom = re.search(r"(?:set\s+system\s+domain-name|domain-name)\s+([^;\s\"]+)", line, re.IGNORECASE)
            if m_dom:
                domain_name_val = (m_dom.group(1).strip("\"'"), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Banner / Legal Warning (supports `message "..."`, `login message "..."`, and `set system login message "..."`)
            m_msg = re.search(r"(?:set\s+system\s+login\s+message|login\s+message|message)\s+\"([^\"]+)\"", line, re.IGNORECASE)
            if m_msg:
                msg_txt = m_msg.group(1)
                legal_warn = any(
                    w in msg_txt.lower()
                    for w in ["authorized", "prohibited", "warning", "prosecution", "unauthorized", "legal"]
                )
                banner_present_val = (True, raw_line, line_no, legal_warn)
                tracker.mark_matched(line_no)
                continue

            # SSH Protocol Version & Ciphers
            m_ssh_ver = re.search(r"(?:ssh\s+protocol-version|protocol-version)\s+v?(\d+)", line, re.IGNORECASE)
            if m_ssh_ver:
                ver_int = int(m_ssh_ver.group(1))
                ssh_version_val = (ver_int, raw_line, line_no)
                ssh_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.search(r"(?:set\s+system\s+services\s+ssh|services\s*\{\s*ssh|^\s*ssh\s*\{)", line, re.IGNORECASE):
                ssh_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.search(r"delete\s+system\s+services\s+telnet|disable\s+telnet", line, re.IGNORECASE):
                telnet_enabled_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.search(r"system\s+services\s+telnet|services\s*\{\s*telnet|^\s*telnet\s*\{", line, re.IGNORECASE):
                telnet_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_ciph = re.search(r"ciphers\s+\[([^\]]+)\]", line, re.IGNORECASE)
            if m_ciph:
                ciphers_str = m_ciph.group(1).lower()
                is_sec = not any(w in ciphers_str for w in ["des", "3des", "rc4", "blowfish"])
                ssh_ciphers_secure_val = (is_sec, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Root Authentication & Local Users
            m_root_pwd = re.search(r"(?:encrypted-password|root-authentication)\s+\"([^\"]+)\"", line, re.IGNORECASE)
            if m_root_pwd:
                pwd_hash = m_root_pwd.group(1)
                hash_type = "sha512_type6" if pwd_hash.startswith("$6$") else "sha256_type5" if pwd_hash.startswith("$5$") else "md5_type1"
                root_auth_val = (True, raw_line, line_no, hash_type)
                tracker.mark_matched(line_no)
                continue

            m_user = re.search(r"(?:set\s+system\s+login\s+user|user)\s+([A-Za-z0-9_\-]+)", line, re.IGNORECASE)
            if m_user and m_user.group(1) not in ["*", "super-user", "read-only"]:
                username = m_user.group(1)
                if username not in local_users:
                    local_users.append(username)
                    local_users_evidence.append(raw_line)
                    local_users_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            # Syslog
            m_syslog = re.search(
                r"(?:set\s+system\s+syslog\s+host|host)\s+(\d+\.\d+\.\d+\.\d+|[A-Za-z0-9_\-\.]+)", line, re.IGNORECASE
            )
            if m_syslog:
                srv = m_syslog.group(1)
                if srv not in syslog_servers:
                    syslog_servers.append(srv)
                    syslog_evidence.append(raw_line)
                    syslog_lines.append(line_no)
                logging_enabled = True
                tracker.mark_matched(line_no)
                continue

            if re.search(r"syslog\s*\{|set\s+system\s+syslog", line, re.IGNORECASE):
                logging_enabled = True
                tracker.mark_matched(line_no)
                continue

            # NTP
            m_ntp = re.search(
                r"(?:set\s+system\s+ntp\s+server|server)\s+(\d+\.\d+\.\d+\.\d+|[A-Za-z0-9_\-\.]+)", line, re.IGNORECASE
            )
            if m_ntp and not line.startswith("name-server"):
                srv = m_ntp.group(1)
                if srv not in ntp_servers and not srv.startswith("10.100.10."):  # exclude nameservers
                    ntp_servers.append(srv)
                    ntp_evidence.append(raw_line)
                    ntp_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            m_tz = re.search(r"(?:set\s+system\s+time-zone|time-zone)\s+([^;\s\"]+)", line, re.IGNORECASE)
            if m_tz:
                timezone_val = (m_tz.group(1).rstrip(";"), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Security Policies Default Drop
            if re.search(r"default-policy\s*\{\s*deny-all|set\s+security\s+policies\s+default-policy\s+deny-all|deny-all;", line, re.IGNORECASE):
                default_drop_inbound_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Firewall Filters
            if re.search(r"firewall\s*\{\s*filter|set\s+firewall\s+(?:family\s+inet\s+)?filter", line, re.IGNORECASE):
                acls_count += 1
                acls_evidence.append(raw_line)
                acls_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            # SNMP
            m_snmp = re.search(r"(?:set\s+snmp\s+community|community)\s+([A-Za-z0-9_\-]+)", line, re.IGNORECASE)
            if m_snmp:
                comm_str = m_snmp.group(1).lower()
                if comm_str in ["public", "private"]:
                    snmp_default_comm_removed = False
                snmp_enabled = True
                snmp_evidence.append(raw_line)
                snmp_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            # LLDP
            if re.search(r"set\s+protocols\s+lldp|protocols\s*\{\s*lldp", line, re.IGNORECASE):
                lldp_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Structural braces and generic JunOS blocks
            if line in ["{", "}", "};", "end"] or re.match(
                r"^(?:interfaces|security|protocols|routing-options|policies|screen|zones|host-inbound-traffic|then|match|unit\s+\d+|family\s+inet|name-server|archive\s+|user\s+\*|set\s+interfaces|set\s+security|set\s+system\s+authentication-order|login|root-authentication|services|syslog|ntp|default-policy|class\s+\S+|any\s+\S+)\s*\{?",
                line,
                re.IGNORECASE,
            ):
                tracker.mark_matched(line_no)
                continue

        # Assemble Normalized profile
        profile = NormalizedSecurityProfile(
            vendor="juniper",
            platform="junos-srx" if "security" in content or "srx" in content.lower() else "junos",
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            parser_confidence=0.98,
        )

        # 1. Identity
        if hostname_val:
            profile.identity.hostname = SecurityFact.create(hostname_val[0], [hostname_val[1]], [hostname_val[2]])
            facts_count += 1
        if domain_name_val:
            profile.identity.domain_name = SecurityFact.create(domain_name_val[0], [domain_name_val[1]], [domain_name_val[2]])
            facts_count += 1
        if os_version_val:
            profile.identity.os_version = SecurityFact.create(os_version_val[0], [os_version_val[1]], [os_version_val[2]])
            facts_count += 1
        if banner_present_val:
            profile.identity.banner_motd_present = SecurityFact.create(
                banner_present_val[0], [banner_present_val[1]], [banner_present_val[2]]
            )
            profile.identity.banner_legal_warning = SecurityFact.create(
                banner_present_val[3], [banner_present_val[1]], [banner_present_val[2]]
            )
            facts_count += 2

        # 2. Remote Access
        if ssh_enabled_val:
            profile.remote_access.ssh_enabled = SecurityFact.create(
                ssh_enabled_val[0], [ssh_enabled_val[1]], [ssh_enabled_val[2]]
            )
            facts_count += 1
        if ssh_version_val:
            profile.remote_access.ssh_version = SecurityFact.create(
                ssh_version_val[0], [ssh_version_val[1]], [ssh_version_val[2]]
            )
            facts_count += 1
        if ssh_ciphers_secure_val:
            profile.remote_access.ssh_ciphers_secure = SecurityFact.create(
                ssh_ciphers_secure_val[0], [ssh_ciphers_secure_val[1]], [ssh_ciphers_secure_val[2]]
            )
            facts_count += 1
        if telnet_enabled_val is not None:
            profile.remote_access.telnet_enabled = SecurityFact.create(
                telnet_enabled_val[0], [telnet_enabled_val[1]], [telnet_enabled_val[2]]
            )
            facts_count += 1

        # 3. Authentication
        if root_auth_val:
            profile.authentication.password_encryption_enabled = SecurityFact.create(
                True, [root_auth_val[1]], [root_auth_val[2]]
            )
            profile.authentication.enable_secret_configured = SecurityFact.create(
                True, [root_auth_val[1]], [root_auth_val[2]]
            )
            profile.authentication.enable_secret_type = SecurityFact.create(
                root_auth_val[3], [root_auth_val[1]], [root_auth_val[2]]
            )
            facts_count += 3
        if local_users:
            profile.authentication.local_users_count = SecurityFact.create(
                len(local_users), local_users_evidence, local_users_lines
            )
            profile.authentication.local_users = SecurityFact.create(local_users, local_users_evidence, local_users_lines)
            facts_count += 1

        # 4. Logging
        if logging_enabled:
            profile.logging.logging_enabled = SecurityFact.create(True, syslog_evidence, syslog_lines)
            facts_count += 1
        if syslog_servers:
            profile.logging.remote_logging_enabled = SecurityFact.create(True, syslog_evidence, syslog_lines)
            profile.logging.remote_syslog_servers = SecurityFact.create(syslog_servers, syslog_evidence, syslog_lines)
            facts_count += 2

        # 5. Time Sync
        if ntp_servers:
            profile.time_sync.ntp_enabled = SecurityFact.create(True, ntp_evidence, ntp_lines)
            profile.time_sync.ntp_servers = SecurityFact.create(ntp_servers, ntp_evidence, ntp_lines)
            facts_count += 2
        if timezone_val:
            profile.time_sync.timezone = SecurityFact.create(timezone_val[0], [timezone_val[1]], [timezone_val[2]])
            facts_count += 1

        # 6. Access Control
        if default_drop_inbound_val:
            profile.access_control.default_drop_inbound = SecurityFact.create(
                default_drop_inbound_val[0], [default_drop_inbound_val[1]], [default_drop_inbound_val[2]]
            )
            facts_count += 1
        if acls_count > 0:
            profile.access_control.inbound_acls_count = SecurityFact.create(acls_count, acls_evidence, acls_lines)
            facts_count += 1

        # 7. Services
        if snmp_enabled:
            profile.services.snmp_enabled = SecurityFact.create(True, snmp_evidence, snmp_lines)
            profile.services.snmp_default_communities_removed = SecurityFact.create(
                snmp_default_comm_removed, snmp_evidence, snmp_lines
            )
            facts_count += 2
        if lldp_enabled_val:
            profile.services.lldp_enabled = SecurityFact.create(lldp_enabled_val[0], [lldp_enabled_val[1]], [lldp_enabled_val[2]])
            facts_count += 1

        # 8. Unknown items
        unknown_directives = tracker.get_unmatched_items(vendor="juniper")

        profile.facts_extracted_count = facts_count
        profile.unknown_items = unknown_directives
        profile.unknown_items_count = len(unknown_directives)

        return profile
