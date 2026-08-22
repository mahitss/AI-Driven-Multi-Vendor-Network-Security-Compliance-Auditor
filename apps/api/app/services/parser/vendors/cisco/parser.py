"""
NetVigil Cisco IOS / IOS-XE Configuration Parser & Normalizer
Problem Statement: SIH26155 (NTRO)

Deterministic parser and security fact extractor for Cisco IOS, IOS-XE, and NX-OS configurations.
Preserves exact line numbers and evidence strings for every security property.
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


class CiscoParser(BaseConfigurationParser):
    @property
    def vendor_name(self) -> str:
        return "cisco"

    @property
    def parser_name(self) -> str:
        return "Cisco IOS/IOS-XE Deterministic AST Parser"

    @property
    def parser_version(self) -> str:
        return "1.2.0"

    @property
    def supported_platforms(self) -> List[str]:
        return ["ios", "ios-xe", "nxos", "asa"]

    def can_parse(self, content: str, filename: Optional[str] = None) -> bool:
        if not content:
            return False
        return bool(
            re.search(
                r"^\s*service timestamps|^\s*enable secret|^\s*line vty|^\s*boot-start-marker|^\s*aaa new-model",
                content,
                re.MULTILINE | re.IGNORECASE,
            )
        )

    def parse(self, content: str, filename: Optional[str] = None) -> NormalizedSecurityProfile:
        tracker = ParseTracker(content)
        lines = content.splitlines()

        facts_count = 0

        # Data structures to accumulate parsed properties
        hostname_val: Optional[Tuple[str, str, int]] = None
        domain_name_val: Optional[Tuple[str, str, int]] = None
        os_version_val: Optional[Tuple[str, str, int]] = None

        # Remote Access
        ssh_version_val: Optional[Tuple[int, str, int]] = None
        ssh_timeout_val: Optional[Tuple[int, str, int]] = None
        ssh_ciphers_secure_val: Optional[Tuple[bool, str, int]] = None
        telnet_enabled_val: Optional[Tuple[bool, str, int]] = None
        http_server_val: Optional[Tuple[bool, str, int]] = None
        https_server_val: Optional[Tuple[bool, str, int]] = None
        vty_access_class_applied = False
        vty_access_class_evidence: List[str] = []
        vty_access_class_lines: List[int] = []
        vty_inactivity_timeout: Optional[Tuple[int, str, int]] = None

        # Authentication
        aaa_enabled_val: Optional[Tuple[bool, str, int]] = None
        password_enc_val: Optional[Tuple[bool, str, int]] = None
        enable_secret_val: Optional[Tuple[bool, str, int, Optional[str]]] = None
        local_users_list: List[str] = []
        local_users_evidence: List[str] = []
        local_users_lines: List[int] = []
        tacacs_servers: List[str] = []
        tacacs_evidence: List[str] = []
        tacacs_lines: List[int] = []
        radius_servers: List[str] = []
        radius_evidence: List[str] = []
        radius_lines: List[int] = []
        failed_lockout_val: Optional[Tuple[bool, str, int]] = None

        # Authorization
        cmd_auth_val: Optional[Tuple[bool, str, int]] = None
        cmd_acct_val: Optional[Tuple[bool, str, int]] = None
        rbac_val: Optional[Tuple[bool, str, int]] = None

        # Logging
        logging_enabled_val: Optional[Tuple[bool, str, int]] = None
        remote_syslog_servers: List[str] = []
        syslog_evidence: List[str] = []
        syslog_lines: List[int] = []
        log_timestamps_val: Optional[Tuple[bool, str, int]] = None
        buffered_logging_val: Optional[Tuple[int, str, int]] = None
        logging_level_val: Optional[Tuple[str, str, int]] = None

        # Time Sync
        ntp_servers: List[str] = []
        ntp_evidence: List[str] = []
        ntp_lines: List[int] = []
        ntp_auth_val: Optional[Tuple[bool, str, int]] = None
        timezone_val: Optional[Tuple[str, str, int]] = None

        # Access Control
        acls_count = 0
        acls_evidence: List[str] = []
        acls_lines: List[int] = []
        copp_enabled_val: Optional[Tuple[bool, str, int]] = None

        # Services
        snmp_enabled_val: Optional[Tuple[bool, str, int]] = None
        snmp_v3_val: Optional[Tuple[bool, str, int]] = None
        snmp_default_comm_removed = True
        snmp_comm_evidence: List[str] = []
        snmp_comm_lines: List[int] = []
        cdp_enabled_val: Optional[Tuple[bool, str, int]] = None
        lldp_enabled_val: Optional[Tuple[bool, str, int]] = None
        finger_disabled_val: Optional[Tuple[bool, str, int]] = None
        proxy_arp_disabled_val: Optional[Tuple[bool, str, int]] = None
        directed_broadcast_disabled_val: Optional[Tuple[bool, str, int]] = None

        # Management
        banner_motd_present = False
        banner_legal_warning = False
        banner_motd_evidence: List[str] = []
        banner_motd_lines: List[int] = []

        # Network Security
        bpdu_guard_val: Optional[Tuple[bool, str, int]] = None
        dhcp_snooping_val: Optional[Tuple[bool, str, int]] = None
        dai_val: Optional[Tuple[bool, str, int]] = None
        port_security_val: Optional[Tuple[bool, str, int]] = None

        # Line-by-line parsing loop
        in_vty_block = False
        in_banner_block = False
        banner_delimiter = ""
        banner_text_buffer: List[str] = []
        banner_start_line = 0

        for line_idx, raw_line in enumerate(lines):
            line_no = line_idx + 1
            line = raw_line.strip()

            # Handle multi-line MOTD banner block
            if in_banner_block:
                tracker.mark_matched(line_no)
                banner_motd_evidence.append(raw_line)
                banner_motd_lines.append(line_no)
                if banner_delimiter and banner_delimiter in line:
                    in_banner_block = False
                    banner_full_text = "\n".join(banner_text_buffer)
                    if any(
                        w in banner_full_text.lower()
                        for w in ["authorized", "prohibited", "warning", "prosecution", "unauthorized", "legal"]
                    ):
                        banner_legal_warning = True
                else:
                    banner_text_buffer.append(line)
                continue

            if not line:
                tracker.mark_matched(line_no)
                continue

            # Standard comments
            if line.startswith("!"):
                tracker.mark_matched(line_no)
                continue

            # Check for banner initiation
            m_banner = re.match(r"^banner\s+(?:motd|login|exec)\s+(\S)", line, re.IGNORECASE)
            if m_banner:
                banner_delimiter = m_banner.group(1)
                in_banner_block = True
                banner_motd_present = True
                banner_start_line = line_no
                banner_motd_evidence.append(raw_line)
                banner_motd_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            # 1. Identity & Version
            m_host = re.match(r"^hostname\s+(\S+)", line, re.IGNORECASE)
            if m_host:
                hostname_val = (m_host.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_dom = re.match(r"^ip\s+domain[- ]name\s+(\S+)", line, re.IGNORECASE)
            if m_dom:
                domain_name_val = (m_dom.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_ver = re.match(r"^version\s+(\S+)", line, re.IGNORECASE)
            if m_ver:
                os_version_val = (m_ver.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 2. Remote Access (SSH / Telnet / HTTP / HTTPS)
            m_ssh_ver = re.match(r"^ip\s+ssh\s+version\s+(\d+)", line, re.IGNORECASE)
            if m_ssh_ver:
                ssh_version_val = (int(m_ssh_ver.group(1)), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_ssh_to = re.match(r"^ip\s+ssh\s+time-out\s+(\d+)", line, re.IGNORECASE)
            if m_ssh_to:
                ssh_timeout_val = (int(m_ssh_to.group(1)), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_ssh_ciph = re.match(r"^ip\s+ssh\s+server\s+algorithm\s+encryption\s+(.+)", line, re.IGNORECASE)
            if m_ssh_ciph:
                ciphers = m_ssh_ciph.group(1).lower()
                is_secure = not any(w in ciphers for w in ["des", "3des", "rc4", "blowfish"])
                ssh_ciphers_secure_val = (is_secure, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^no\s+ip\s+http\s+server", line, re.IGNORECASE):
                http_server_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^ip\s+http\s+server", line, re.IGNORECASE):
                http_server_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^ip\s+http\s+secure-server", line, re.IGNORECASE):
                https_server_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^no\s+ip\s+http\s+secure-server", line, re.IGNORECASE):
                https_server_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Line VTY Block Handling
            if re.match(r"^line\s+vty\s+", line, re.IGNORECASE):
                in_vty_block = True
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^line\s+(?:con|aux)\s+", line, re.IGNORECASE) or re.match(r"^(?:interface|router)\s+", line, re.IGNORECASE):
                in_vty_block = False

            if in_vty_block:
                m_vty_trans = re.match(r"^\s*transport\s+input\s+(.+)", line, re.IGNORECASE)
                if m_vty_trans:
                    protocols = m_vty_trans.group(1).lower()
                    if "ssh" in protocols and "telnet" not in protocols and "all" not in protocols:
                        telnet_enabled_val = (False, raw_line, line_no)
                    elif "telnet" in protocols or "all" in protocols:
                        telnet_enabled_val = (True, raw_line, line_no)
                    tracker.mark_matched(line_no)
                    continue

                m_vty_acl = re.match(r"^\s*access-class\s+(\S+)\s+in", line, re.IGNORECASE)
                if m_vty_acl:
                    vty_access_class_applied = True
                    vty_access_class_evidence.append(raw_line)
                    vty_access_class_lines.append(line_no)
                    tracker.mark_matched(line_no)
                    continue

                m_vty_to = re.match(r"^\s*exec-timeout\s+(\d+)(?:\s+(\d+))?", line, re.IGNORECASE)
                if m_vty_to:
                    mins = int(m_vty_to.group(1))
                    vty_inactivity_timeout = (mins, raw_line, line_no)
                    tracker.mark_matched(line_no)
                    continue

            # 3. Authentication (AAA / Secrets / Passwords / TACACS / RADIUS)
            if re.match(r"^aaa\s+new-model", line, re.IGNORECASE):
                aaa_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^no\s+aaa\s+new-model", line, re.IGNORECASE):
                aaa_enabled_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^service\s+password-encryption", line, re.IGNORECASE):
                password_enc_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^no\s+service\s+password-encryption", line, re.IGNORECASE):
                password_enc_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_sec = re.match(r"^enable\s+secret\s+(?:(\d+)\s+)?(\S+)", line, re.IGNORECASE)
            if m_sec:
                sec_type = m_sec.group(1) or "5"
                type_name = "scrypt_type9" if sec_type == "9" else "sha256_type8" if sec_type == "8" else "md5_type5"
                enable_secret_val = (True, raw_line, line_no, type_name)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^enable\s+password\s+", line, re.IGNORECASE):
                enable_secret_val = (True, raw_line, line_no, "plain_or_type7")
                tracker.mark_matched(line_no)
                continue

            m_user = re.match(r"^username\s+(\S+)", line, re.IGNORECASE)
            if m_user:
                local_users_list.append(m_user.group(1))
                local_users_evidence.append(raw_line)
                local_users_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            m_tac = re.match(r"^tacacs\s+server\s+(\S+)|^tacacs-server\s+host\s+(\S+)", line, re.IGNORECASE)
            if m_tac:
                server_addr = m_tac.group(1) or m_tac.group(2)
                tacacs_servers.append(server_addr)
                tacacs_evidence.append(raw_line)
                tacacs_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            m_rad = re.match(r"^radius\s+server\s+(\S+)|^radius-server\s+host\s+(\S+)", line, re.IGNORECASE)
            if m_rad:
                server_addr = m_rad.group(1) or m_rad.group(2)
                radius_servers.append(server_addr)
                radius_evidence.append(raw_line)
                radius_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            m_lockout = re.match(r"^login\s+block-for\s+(\d+)\s+attempts\s+(\d+)", line, re.IGNORECASE)
            if m_lockout:
                failed_lockout_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 4. Authorization & Accounting
            if re.match(r"^aaa\s+authorization\s+commands", line, re.IGNORECASE):
                cmd_auth_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^aaa\s+accounting\s+commands", line, re.IGNORECASE):
                cmd_acct_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 5. Logging
            if re.match(r"^logging\s+on|^logging\s+buffered", line, re.IGNORECASE):
                logging_enabled_val = (True, raw_line, line_no)
                m_buf = re.search(r"logging\s+buffered\s+(\d+)", line, re.IGNORECASE)
                if m_buf:
                    buffered_logging_val = (int(m_buf.group(1)), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_syslog = re.match(r"^logging\s+(?:host\s+|server\s+)?(\d+\.\d+\.\d+\.\d+|\S+)", line, re.IGNORECASE)
            if m_syslog and not line.startswith("logging source") and not line.startswith("logging trap"):
                remote_syslog_servers.append(m_syslog.group(1))
                syslog_evidence.append(raw_line)
                syslog_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^service\s+timestamps\s+log\s+datetime", line, re.IGNORECASE):
                log_timestamps_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_trap = re.match(r"^logging\s+trap\s+(\S+)", line, re.IGNORECASE)
            if m_trap:
                logging_level_val = (m_trap.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 6. Time Synchronization (NTP)
            m_ntp = re.match(r"^ntp\s+server\s+(\S+)", line, re.IGNORECASE)
            if m_ntp:
                ntp_servers.append(m_ntp.group(1))
                ntp_evidence.append(raw_line)
                ntp_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^ntp\s+authenticate", line, re.IGNORECASE):
                ntp_auth_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            m_tz = re.match(r"^clock\s+timezone\s+(\S+)", line, re.IGNORECASE)
            if m_tz:
                timezone_val = (m_tz.group(1), raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 7. Access Control (ACLs & CoPP)
            if re.match(r"^ip\s+access-list\s+", line, re.IGNORECASE) or re.match(r"^access-list\s+\d+", line, re.IGNORECASE):
                acls_count += 1
                acls_evidence.append(raw_line)
                acls_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^control-plane|service-policy\s+input\s+.*copp", line, re.IGNORECASE):
                copp_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 8. Services (SNMP, CDP, LLDP, Finger, Proxy-ARP, Directed-Broadcast)
            m_snmp = re.match(r"^snmp-server\s+community\s+(\S+)", line, re.IGNORECASE)
            if m_snmp:
                snmp_enabled_val = (True, raw_line, line_no)
                comm_str = m_snmp.group(1).lower()
                if comm_str in ["public", "private"]:
                    snmp_default_comm_removed = False
                snmp_comm_evidence.append(raw_line)
                snmp_comm_lines.append(line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^snmp-server\s+enable\s+traps", line, re.IGNORECASE):
                snmp_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^cdp\s+run", line, re.IGNORECASE):
                cdp_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^no\s+cdp\s+run", line, re.IGNORECASE):
                cdp_enabled_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^lldp\s+run", line, re.IGNORECASE):
                lldp_enabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^no\s+service\s+finger", line, re.IGNORECASE):
                finger_disabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue
            elif re.match(r"^service\s+finger", line, re.IGNORECASE):
                finger_disabled_val = (False, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^no\s+ip\s+proxy-arp", line, re.IGNORECASE):
                proxy_arp_disabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^no\s+ip\s+directed-broadcast", line, re.IGNORECASE):
                directed_broadcast_disabled_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # 9. Network Security (BPDU Guard, DHCP Snooping, DAI, Port Security)
            if re.match(r"^spanning-tree\s+(?:portfast\s+)?bpduguard\s+default", line, re.IGNORECASE):
                bpdu_guard_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^ip\s+dhcp\s+snooping", line, re.IGNORECASE):
                dhcp_snooping_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^ip\s+arp\s+inspection\s+vlan", line, re.IGNORECASE):
                dai_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            if re.match(r"^switchport\s+port-security", line, re.IGNORECASE):
                port_security_val = (True, raw_line, line_no)
                tracker.mark_matched(line_no)
                continue

            # Benign directives that don't need facts but are recognized
            if re.match(
                r"^boot-start-marker|^boot-end-marker|^end$|^exit$|^vrf\s+definition|^address-family|^service\s+sequence-numbers|^no\s+service\s+(?:pad|tcp-small-servers|udp-small-servers)|^no\s+ip\s+source-route|^ip\s+name-server|^interface\s+|^description\s+|^ip\s+address\s+|^no\s+ip\s+redirects|^no\s+ip\s+unreachables|^switchport\s+|^login\s+authentication|^transport\s+output|^stopbits",
                line,
                re.IGNORECASE,
            ):
                tracker.mark_matched(line_no)
                continue

        # Assemble NormalizedSecurityProfile with evidence
        profile = NormalizedSecurityProfile(
            vendor="cisco",
            platform="ios-xe" if (os_version_val and "17" in os_version_val[0]) else "ios",
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
        if banner_motd_present:
            profile.identity.banner_motd_present = SecurityFact.create(True, banner_motd_evidence, banner_motd_lines)
            profile.identity.banner_legal_warning = SecurityFact.create(banner_legal_warning, banner_motd_evidence, banner_motd_lines)
            facts_count += 2

        # 2. Remote Access
        ssh_is_enabled = bool(ssh_version_val or (telnet_enabled_val and telnet_enabled_val[0] is False))
        profile.remote_access.ssh_enabled = SecurityFact.create(
            ssh_is_enabled,
            [ssh_version_val[1]] if ssh_version_val else [],
            [ssh_version_val[2]] if ssh_version_val else [],
        )
        facts_count += 1

        if ssh_version_val:
            profile.remote_access.ssh_version = SecurityFact.create(ssh_version_val[0], [ssh_version_val[1]], [ssh_version_val[2]])
            facts_count += 1
        if ssh_ciphers_secure_val:
            profile.remote_access.ssh_ciphers_secure = SecurityFact.create(
                ssh_ciphers_secure_val[0], [ssh_ciphers_secure_val[1]], [ssh_ciphers_secure_val[2]]
            )
            facts_count += 1
        if telnet_enabled_val:
            profile.remote_access.telnet_enabled = SecurityFact.create(
                telnet_enabled_val[0], [telnet_enabled_val[1]], [telnet_enabled_val[2]]
            )
            facts_count += 1
        if http_server_val:
            profile.remote_access.http_server_enabled = SecurityFact.create(
                http_server_val[0], [http_server_val[1]], [http_server_val[2]]
            )
            facts_count += 1
        if https_server_val:
            profile.remote_access.https_server_enabled = SecurityFact.create(
                https_server_val[0], [https_server_val[1]], [https_server_val[2]]
            )
            facts_count += 1
        if vty_access_class_applied:
            profile.remote_access.vty_access_class_applied = SecurityFact.create(
                True, vty_access_class_evidence, vty_access_class_lines
            )
            facts_count += 1
        if vty_inactivity_timeout:
            profile.remote_access.inactivity_timeout_minutes = SecurityFact.create(
                vty_inactivity_timeout[0], [vty_inactivity_timeout[1]], [vty_inactivity_timeout[2]]
            )
            facts_count += 1

        # 3. Authentication
        if aaa_enabled_val:
            profile.authentication.aaa_enabled = SecurityFact.create(aaa_enabled_val[0], [aaa_enabled_val[1]], [aaa_enabled_val[2]])
            facts_count += 1
        if password_enc_val:
            profile.authentication.password_encryption_enabled = SecurityFact.create(
                password_enc_val[0], [password_enc_val[1]], [password_enc_val[2]]
            )
            facts_count += 1
        if enable_secret_val:
            profile.authentication.enable_secret_configured = SecurityFact.create(
                enable_secret_val[0], [enable_secret_val[1]], [enable_secret_val[2]]
            )
            if enable_secret_val[3]:
                profile.authentication.enable_secret_type = SecurityFact.create(
                    enable_secret_val[3], [enable_secret_val[1]], [enable_secret_val[2]]
                )
            facts_count += 1
        if local_users_list:
            profile.authentication.local_users_count = SecurityFact.create(
                len(local_users_list), local_users_evidence, local_users_lines
            )
            profile.authentication.local_users = SecurityFact.create(
                local_users_list, local_users_evidence, local_users_lines
            )
            facts_count += 1
        if tacacs_servers:
            profile.authentication.tacacs_servers = SecurityFact.create(tacacs_servers, tacacs_evidence, tacacs_lines)
            facts_count += 1
        if radius_servers:
            profile.authentication.radius_servers = SecurityFact.create(radius_servers, radius_evidence, radius_lines)
            facts_count += 1
        if failed_lockout_val:
            profile.authentication.failed_login_lockout_enabled = SecurityFact.create(
                failed_lockout_val[0], [failed_lockout_val[1]], [failed_lockout_val[2]]
            )
            facts_count += 1

        # 4. Authorization
        if cmd_auth_val:
            profile.authorization.command_authorization_enabled = SecurityFact.create(
                cmd_auth_val[0], [cmd_auth_val[1]], [cmd_auth_val[2]]
            )
            facts_count += 1
        if cmd_acct_val:
            profile.authorization.accounting_commands_enabled = SecurityFact.create(
                cmd_acct_val[0], [cmd_acct_val[1]], [cmd_acct_val[2]]
            )
            facts_count += 1

        # 5. Logging
        if logging_enabled_val:
            profile.logging.logging_enabled = SecurityFact.create(
                logging_enabled_val[0], [logging_enabled_val[1]], [logging_enabled_val[2]]
            )
            facts_count += 1
        if remote_syslog_servers:
            profile.logging.remote_logging_enabled = SecurityFact.create(True, syslog_evidence, syslog_lines)
            profile.logging.remote_syslog_servers = SecurityFact.create(remote_syslog_servers, syslog_evidence, syslog_lines)
            facts_count += 2
        if log_timestamps_val:
            profile.logging.log_timestamps_enabled = SecurityFact.create(
                log_timestamps_val[0], [log_timestamps_val[1]], [log_timestamps_val[2]]
            )
            facts_count += 1
        if buffered_logging_val:
            profile.logging.buffered_logging_size_bytes = SecurityFact.create(
                buffered_logging_val[0], [buffered_logging_val[1]], [buffered_logging_val[2]]
            )
            facts_count += 1
        if logging_level_val:
            profile.logging.logging_level = SecurityFact.create(
                logging_level_val[0], [logging_level_val[1]], [logging_level_val[2]]
            )
            facts_count += 1

        # 6. Time Sync
        if ntp_servers:
            profile.time_sync.ntp_enabled = SecurityFact.create(True, ntp_evidence, ntp_lines)
            profile.time_sync.ntp_servers = SecurityFact.create(ntp_servers, ntp_evidence, ntp_lines)
            facts_count += 2
        if ntp_auth_val:
            profile.time_sync.ntp_authentication_enabled = SecurityFact.create(
                ntp_auth_val[0], [ntp_auth_val[1]], [ntp_auth_val[2]]
            )
            facts_count += 1
        if timezone_val:
            profile.time_sync.timezone = SecurityFact.create(timezone_val[0], [timezone_val[1]], [timezone_val[2]])
            facts_count += 1

        # 7. Access Control
        if acls_count > 0:
            profile.access_control.inbound_acls_count = SecurityFact.create(acls_count, acls_evidence, acls_lines)
            facts_count += 1
        if copp_enabled_val:
            profile.access_control.control_plane_policing_enabled = SecurityFact.create(
                copp_enabled_val[0], [copp_enabled_val[1]], [copp_enabled_val[2]]
            )
            facts_count += 1

        # 8. Services
        if snmp_enabled_val:
            profile.services.snmp_enabled = SecurityFact.create(
                snmp_enabled_val[0], [snmp_enabled_val[1]], [snmp_enabled_val[2]]
            )
            profile.services.snmp_default_communities_removed = SecurityFact.create(
                snmp_default_comm_removed, snmp_comm_evidence, snmp_comm_lines
            )
            facts_count += 2
        if cdp_enabled_val:
            profile.services.cdp_enabled = SecurityFact.create(cdp_enabled_val[0], [cdp_enabled_val[1]], [cdp_enabled_val[2]])
            facts_count += 1
        if lldp_enabled_val:
            profile.services.lldp_enabled = SecurityFact.create(lldp_enabled_val[0], [lldp_enabled_val[1]], [lldp_enabled_val[2]])
            facts_count += 1
        if finger_disabled_val:
            profile.services.finger_disabled = SecurityFact.create(
                finger_disabled_val[0], [finger_disabled_val[1]], [finger_disabled_val[2]]
            )
            facts_count += 1
        if proxy_arp_disabled_val:
            profile.services.proxy_arp_disabled = SecurityFact.create(
                proxy_arp_disabled_val[0], [proxy_arp_disabled_val[1]], [proxy_arp_disabled_val[2]]
            )
            facts_count += 1
        if directed_broadcast_disabled_val:
            profile.services.ip_directed_broadcast_disabled = SecurityFact.create(
                directed_broadcast_disabled_val[0],
                [directed_broadcast_disabled_val[1]],
                [directed_broadcast_disabled_val[2]],
            )
            facts_count += 1

        # 9. Network Security
        if bpdu_guard_val:
            profile.network_security.spanning_tree_bpdu_guard_enabled = SecurityFact.create(
                bpdu_guard_val[0], [bpdu_guard_val[1]], [bpdu_guard_val[2]]
            )
            facts_count += 1
        if dhcp_snooping_val:
            profile.network_security.dhcp_snooping_enabled = SecurityFact.create(
                dhcp_snooping_val[0], [dhcp_snooping_val[1]], [dhcp_snooping_val[2]]
            )
            facts_count += 1
        if dai_val:
            profile.network_security.dynamic_arp_inspection_enabled = SecurityFact.create(
                dai_val[0], [dai_val[1]], [dai_val[2]]
            )
            facts_count += 1
        if port_security_val:
            profile.network_security.port_security_enabled = SecurityFact.create(
                port_security_val[0], [port_security_val[1]], [port_security_val[2]]
            )
            facts_count += 1

        # 10. Extract unparsed/unknown directives
        unknown_directives = tracker.get_unmatched_items(vendor="cisco")

        profile.facts_extracted_count = facts_count
        profile.unknown_items = unknown_directives
        profile.unknown_items_count = len(unknown_directives)

        return profile
