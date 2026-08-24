"""
NetVigil Fortinet FortiOS Configuration Parser & Normalizer
Problem Statement: SIH26155 (NTRO)

Deterministic block AST parser for FortiOS (FortiGate) configurations.
Handles nested `config ... edit ... set ... next ... end` structures and maps facts to Universal Security Profile.
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


class FortinetParser(BaseConfigurationParser):
    @property
    def vendor_name(self) -> str:
        return "fortinet"

    @property
    def parser_name(self) -> str:
        return "Fortinet FortiOS Block AST Parser"

    @property
    def parser_version(self) -> str:
        return "1.2.0"

    @property
    def supported_platforms(self) -> List[str]:
        return ["fortios"]

    def can_parse(self, content: str, filename: Optional[str] = None) -> bool:
        if not content:
            return False
        return bool(
            re.search(
                r"^#config-version|^\s*config\s+system\s+global|^\s*config\s+firewall\s+policy",
                content,
                re.MULTILINE | re.IGNORECASE,
            )
        )

    def parse(self, content: str, filename: Optional[str] = None) -> NormalizedSecurityProfile:
        tracker = ParseTracker(content)
        lines = content.splitlines()

        facts_count = 0

        # Identity
        hostname_val: Optional[Tuple[str, str, int]] = None
        os_version_val: Optional[Tuple[str, str, int]] = None
        banner_present_val: Optional[Tuple[bool, str, int]] = None

        # Remote Access
        ssh_enabled = False
        ssh_version = 2
        ssh_evidence: List[str] = []
        ssh_lines: List[int] = []
        http_enabled = False
        http_evidence: List[str] = []
        http_lines: List[int] = []
        https_enabled = False
        https_evidence: List[str] = []
        https_lines: List[int] = []
        inactivity_timeout_val: Optional[Tuple[int, str, int]] = None
        strong_crypto_val: Optional[Tuple[bool, str, int]] = None

        # Authentication
        lockout_enabled_val: Optional[Tuple[bool, str, int]] = None
        local_users: List[str] = []
        local_users_evidence: List[str] = []
        local_users_lines: List[int] = []

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
        default_drop_inbound = False
        default_drop_evidence: List[str] = []
        default_drop_lines: List[int] = []
        policies_count = 0
        policies_evidence: List[str] = []
        policies_lines: List[int] = []

        # Parsing state tracking
        current_config_section: Optional[str] = None

        KNOWN_SECTIONS = [
            "system global",
            "system interface",
            "system ntp",
            "log syslogd setting",
            "user local",
            "firewall policy",
            "router static",
            "vpn ipsec phase1-interface",
            "vpn ipsec phase2-interface",
        ]

        for line_idx, raw_line in enumerate(lines):
            line_no = line_idx + 1
            line = raw_line.strip()

            if not line:
                tracker.mark_matched(line_no)
                continue

            # Check config-version header comment
            m_ver = re.match(r"^#config-version=([A-Za-z0-9\.\-_]+)", line)
            if m_ver:
                os_version_val = (m_ver.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if line.startswith("#"):
                tracker.mark_matched(line_no)
                continue

            # Section headers: config <section>
            m_config = re.match(r"^config\s+(.+)", line, re.IGNORECASE)
            if m_config:
                sec_name = m_config.group(1).lower().strip()
                current_config_section = sec_name
                if any(known in sec_name for known in KNOWN_SECTIONS):
                    tracker.mark_matched(line_no)
                # If unknown section, leave unmatched
                continue

            if line.lower() == "end":
                if current_config_section and any(known in current_config_section for known in KNOWN_SECTIONS):
                    tracker.mark_matched(line_no)
                current_config_section = None
                continue

            if line.lower() in ["next", "edit"] or line.lower().startswith("edit "):
                if current_config_section and any(known in current_config_section for known in KNOWN_SECTIONS):
                    m_edit_user = re.match(r"^edit\s+\"([^\"]+)\"", line, re.IGNORECASE)
                    if m_edit_user and current_config_section == "user local":
                        u_name = m_edit_user.group(1)
                        local_users.append(u_name)
                        local_users_evidence.append(raw_line)
                        local_users_lines.append(line_no)

                    if "firewall policy" in current_config_section:
                        policies_count += 1
                        policies_evidence.append(raw_line)
                        policies_lines.append(line_no)

                    tracker.mark_matched(line_no)
                continue

            # Key-Value assignments: set <key> <val>
            m_set = re.match(r"^set\s+([A-Za-z0-9_\-]+)\s+(.+)", line, re.IGNORECASE)
            if m_set and current_config_section:
                key = m_set.group(1).lower()
                val = m_set.group(2).strip()

                if current_config_section == "system global":
                    if key == "hostname":
                        hostname_val = (val.strip("\"'"), raw_line, line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "timezone":
                        timezone_val = (val.strip("\"'"), raw_line, line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "admintimeout":
                        inactivity_timeout_val = (int(val.strip("\"'")), raw_line, line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key in ["admin-lockout-threshold", "admin-lockout-duration"]:
                        lockout_enabled_val = (True, raw_line, line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "pre-login-banner" and "enable" in val.lower():
                        banner_present_val = (True, raw_line, line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "strong-crypto" and "enable" in val.lower():
                        strong_crypto_val = (True, raw_line, line_no)
                        tracker.mark_matched(line_no)
                    elif key == "admin-ssh-v1":
                        if "enable" in val.lower():
                            ssh_version = 1
                            ssh_enabled = True
                        else:
                            ssh_version = 2
                            ssh_enabled = True
                        ssh_evidence.append(raw_line)
                        ssh_lines.append(line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "admin-sport":
                        port_num = int(val.strip("\"'")) if val.strip("\"'").isdigit() else 80
                        if port_num == 80:
                            http_enabled = True
                            http_evidence.append(raw_line)
                            http_lines.append(line_no)
                        elif port_num == 443:
                            https_enabled = True
                            https_evidence.append(raw_line)
                            https_lines.append(line_no)
                        tracker.mark_matched(line_no)
                        continue
                    elif key in ["admin-ssh-port"]:
                        tracker.mark_matched(line_no)
                        continue

                elif current_config_section == "system interface":
                    if key == "allowaccess":
                        access_types = val.lower()
                        if "ssh" in access_types:
                            ssh_enabled = True
                            ssh_evidence.append(raw_line)
                            ssh_lines.append(line_no)
                        if "https" in access_types:
                            https_enabled = True
                            https_evidence.append(raw_line)
                            https_lines.append(line_no)
                        tracker.mark_matched(line_no)
                        continue

                elif current_config_section == "system ntp":
                    if key == "ntpserver":
                        found_ntp = re.findall(r"\"([^\"]+)\"", val) or val.split()
                        for srv in found_ntp:
                            if srv not in ntp_servers:
                                ntp_servers.append(srv)
                                ntp_evidence.append(raw_line)
                                ntp_lines.append(line_no)
                        tracker.mark_matched(line_no)
                        continue

                elif current_config_section == "log syslogd setting":
                    if key == "status" and "enable" in val.lower():
                        logging_enabled = True
                        tracker.mark_matched(line_no)
                        continue
                    elif key == "server":
                        srv = val.strip("\"'")
                        if srv not in syslog_servers:
                            syslog_servers.append(srv)
                            syslog_evidence.append(raw_line)
                            syslog_lines.append(line_no)
                        logging_enabled = True
                        tracker.mark_matched(line_no)
                        continue

                elif "firewall policy" in current_config_section:
                    if key == "action" and "deny" in val.lower():
                        default_drop_inbound = True
                        default_drop_evidence.append(raw_line)
                        default_drop_lines.append(line_no)
                        tracker.mark_matched(line_no)
                        continue

                if any(known in current_config_section for known in KNOWN_SECTIONS):
                    tracker.mark_matched(line_no)
                    continue

        # Assemble Normalized Security Profile
        profile = NormalizedSecurityProfile(
            vendor="fortinet",
            platform="fortios",
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            parser_confidence=0.98,
        )

        # 1. Identity
        if hostname_val:
            profile.identity.hostname = SecurityFact.create(hostname_val[0], [hostname_val[1]], [hostname_val[2]])
            facts_count += 1
        if os_version_val:
            profile.identity.os_version = SecurityFact.create(os_version_val[0], [os_version_val[1]], [os_version_val[2]])
            facts_count += 1
        if banner_present_val:
            profile.identity.banner_motd_present = SecurityFact.create(
                banner_present_val[0], [banner_present_val[1]], [banner_present_val[2]]
            )
            facts_count += 1

        # 2. Remote Access
        profile.remote_access.ssh_enabled = SecurityFact.create(ssh_enabled, ssh_evidence, ssh_lines)
        profile.remote_access.ssh_version = SecurityFact.create(ssh_version, ssh_evidence, ssh_lines)
        profile.remote_access.telnet_enabled = SecurityFact.create(False, ["[FortiOS: Telnet is deactivated by default]"])
        facts_count += 3

        if http_enabled:
            profile.remote_access.http_server_enabled = SecurityFact.create(True, http_evidence, http_lines)
            facts_count += 1
        if https_enabled:
            profile.remote_access.https_server_enabled = SecurityFact.create(True, https_evidence, https_lines)
            facts_count += 1
        if inactivity_timeout_val:
            profile.remote_access.inactivity_timeout_minutes = SecurityFact.create(
                inactivity_timeout_val[0], [inactivity_timeout_val[1]], [inactivity_timeout_val[2]]
            )
            facts_count += 1
        if strong_crypto_val:
            profile.remote_access.ssh_ciphers_secure = SecurityFact.create(
                strong_crypto_val[0], [strong_crypto_val[1]], [strong_crypto_val[2]]
            )
            facts_count += 1

        # 3. Authentication
        profile.authentication.password_encryption_enabled = SecurityFact.create(
            True, ["[FortiOS stores all passwords in secure salted SHA-256 / PBKDF2]"]
        )
        facts_count += 1
        if lockout_enabled_val:
            profile.authentication.failed_login_lockout_enabled = SecurityFact.create(
                lockout_enabled_val[0], [lockout_enabled_val[1]], [lockout_enabled_val[2]]
            )
            facts_count += 1
        if local_users:
            profile.authentication.local_users_count = SecurityFact.create(
                len(local_users), local_users_evidence, local_users_lines
            )
            profile.authentication.local_users = SecurityFact.create(local_users, local_users_evidence, local_users_lines)
            facts_count += 1

        # 4. Logging
        if logging_enabled or syslog_servers:
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
        if default_drop_inbound:
            profile.access_control.default_drop_inbound = SecurityFact.create(
                True, default_drop_evidence, default_drop_lines
            )
            facts_count += 1
        if policies_count > 0:
            profile.access_control.inbound_acls_count = SecurityFact.create(
                policies_count, policies_evidence, policies_lines
            )
            facts_count += 1

        # 7. Unknown items
        unknown_directives = tracker.get_unmatched_items(vendor="fortinet")

        profile.facts_extracted_count = facts_count
        profile.unknown_items = unknown_directives
        profile.unknown_items_count = len(unknown_directives)

        return profile
