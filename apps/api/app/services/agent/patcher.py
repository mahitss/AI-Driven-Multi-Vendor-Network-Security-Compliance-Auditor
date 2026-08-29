"""
Deterministic Configuration Patch Engine
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Applies allowlisted remediation commands to device configuration text without
arbitrary LLM code execution or unintended side effects.
"""
import re
from typing import Tuple, List, Dict, Any


class ConfigurationPatcher:
    """Safely and deterministically applies approved remediations to network configs."""

    @classmethod
    def patch_cisco_configuration(
        cls,
        raw_text: str,
        normalized_control: str,
        commands: str,
    ) -> Tuple[str, bool, str]:
        """
        Applies a Cisco IOS/IOS-XE remediation to configuration text.
        Returns: (modified_text, was_changed, description)
        """
        modified = raw_text
        changed = False
        desc = ""

        # 1. Telnet Disable Remediation
        if "telnet" in normalized_control or "line vty" in commands.lower():
            # Replace transport input telnet / transport input all / transport input telnet ssh with transport input ssh
            pattern = re.compile(r"^\s*transport\s+input\s+(?:telnet\s+ssh|telnet|all)\s*$", re.MULTILINE | re.IGNORECASE)
            if pattern.search(modified):
                modified = pattern.sub(" transport input ssh", modified)
                changed = True
                desc = "Replaced insecure transport input with 'transport input ssh' in VTY lines"
            else:
                # If transport input is missing inside line vty blocks, inject it
                vty_pattern = re.compile(r"(line\s+vty\s+\d+\s+\d+[\r\n]+)", re.IGNORECASE)
                if vty_pattern.search(modified):
                    modified = vty_pattern.sub(r"\1 transport input ssh\n", modified)
                    changed = True
                    desc = "Injected 'transport input ssh' into line vty configuration"

        # 2. Enforce SSH Version 2
        elif "ssh_version" in normalized_control or "ip ssh version 2" in commands:
            v1_pattern = re.compile(r"^\s*ip\s+ssh\s+version\s+1\s*$", re.MULTILINE | re.IGNORECASE)
            if v1_pattern.search(modified):
                modified = v1_pattern.sub("ip ssh version 2", modified)
                changed = True
                desc = "Upgraded 'ip ssh version 1' to 'ip ssh version 2'"
            elif "ip ssh version 2" not in modified:
                # Add after hostname or at top of config
                if "hostname" in modified:
                    modified = re.sub(r"(hostname\s+[^\r\n]+[\r\n]+)", r"\1ip ssh version 2\n", modified, count=1, flags=re.IGNORECASE)
                else:
                    modified = "ip ssh version 2\n" + modified
                changed = True
                desc = "Configured global 'ip ssh version 2'"

        # 3. Disable HTTP Server / Enable HTTPS
        elif "http_server" in normalized_control or "no ip http server" in commands:
            http_pattern = re.compile(r"^\s*ip\s+http\s+server\s*$", re.MULTILINE | re.IGNORECASE)
            if http_pattern.search(modified):
                modified = http_pattern.sub("no ip http server\nip http secure-server", modified)
                changed = True
                desc = "Disabled unencrypted HTTP server and enabled HTTPS secure server"
            elif "no ip http server" not in modified:
                modified = "no ip http server\nip http secure-server\n" + modified
                changed = True
                desc = "Configured 'no ip http server' and 'ip http secure-server'"

        # 4. Service Password Encryption
        elif "password_encryption" in normalized_control or "service password-encryption" in commands:
            if "service password-encryption" not in modified:
                if "hostname" in modified:
                    modified = re.sub(r"(hostname\s+[^\r\n]+[\r\n]+)", r"\1service password-encryption\n", modified, count=1, flags=re.IGNORECASE)
                else:
                    modified = "service password-encryption\n" + modified
                changed = True
                desc = "Enabled global 'service password-encryption'"

        # 5. AAA Authentication Subsystem
        elif "aaa_enabled" in normalized_control or "aaa new-model" in commands:
            if "aaa new-model" not in modified:
                modified = "aaa new-model\naaa authentication login default local\n" + modified
                changed = True
                desc = "Enabled AAA subsystem and local default authentication"

        # 6. Remote Logging / Syslog
        elif "remote_logging" in normalized_control or "logging host" in commands:
            if "logging host" not in modified:
                modified = modified + "\nlogging host 10.0.0.50\nlogging trap informational\n"
                changed = True
                desc = "Configured centralized remote syslog host 10.0.0.50"

        # 7. NTP Server
        elif "ntp" in normalized_control or "ntp server" in commands:
            if "ntp server" not in modified:
                modified = modified + "\nntp server 10.0.0.123 prefer\n"
                changed = True
                desc = "Configured authoritative NTP synchronization server 10.0.0.123"

        return modified, changed, desc

    @classmethod
    def patch_juniper_configuration(
        cls,
        raw_text: str,
        normalized_control: str,
        commands: str,
    ) -> Tuple[str, bool, str]:
        """
        Applies a Juniper JunOS remediation to configuration text.
        """
        modified = raw_text
        changed = False
        desc = ""

        # 1. Disable Telnet Service
        if "telnet" in normalized_control or "telnet" in commands.lower():
            # Set syntax
            set_pattern = re.compile(r"^\s*set\s+system\s+services\s+telnet\s*$", re.MULTILINE | re.IGNORECASE)
            if set_pattern.search(modified):
                modified = set_pattern.sub("# Disabled telnet service", modified)
                changed = True
                desc = "Removed 'set system services telnet'"
            # Hierarchical syntax
            hier_pattern = re.compile(r"(\bservices\s*\{[^}]*?)(\btelnet\s*;)", re.DOTALL | re.IGNORECASE)
            if hier_pattern.search(modified):
                modified = hier_pattern.sub(r"\1/* telnet disabled */", modified)
                changed = True
                desc = "Disabled telnet service from hierarchical services block"

        # 2. Enforce SSH Version 2
        elif "ssh" in normalized_control or "protocol-version" in commands.lower():
            v1_pattern = re.compile(r"protocol-version\s+v1\s*;", re.IGNORECASE)
            if v1_pattern.search(modified):
                modified = v1_pattern.sub("protocol-version v2;", modified)
                changed = True
                desc = "Updated SSH protocol-version to v2"
            elif "set system services ssh protocol-version v1" in modified:
                modified = modified.replace("protocol-version v1", "protocol-version v2")
                changed = True
                desc = "Updated 'set system services ssh protocol-version v2'"

        # 3. Disable HTTP Web Management
        elif "http" in normalized_control or "web-management" in commands.lower():
            http_pattern = re.compile(r"(\bweb-management\s*\{[^}]*?)(\bhttp\s*;)", re.DOTALL | re.IGNORECASE)
            if http_pattern.search(modified):
                modified = http_pattern.sub(r"\1https { system-generated-certificate; }", modified)
                changed = True
                desc = "Replaced HTTP web-management with HTTPS"

        return modified, changed, desc

    @classmethod
    def patch_fortinet_configuration(
        cls,
        raw_text: str,
        normalized_control: str,
        commands: str,
    ) -> Tuple[str, bool, str]:
        """
        Applies a Fortinet FortiOS remediation to configuration text.
        """
        modified = raw_text
        changed = False
        desc = ""

        # 1. Remove HTTP and Telnet from allowaccess
        if "http" in normalized_control or "telnet" in normalized_control or "allowaccess" in commands.lower():
            access_pattern = re.compile(r"(set\s+allowaccess\s+)([^\r\n]+)", re.IGNORECASE)
            matches = access_pattern.findall(modified)
            for prefix, access_list in matches:
                cleaned_list = " ".join([proto for proto in access_list.split() if proto.lower() not in ["http", "telnet"]])
                if "https" not in cleaned_list:
                    cleaned_list += " https"
                if "ssh" not in cleaned_list:
                    cleaned_list += " ssh"
                modified = modified.replace(f"{prefix}{access_list}", f"{prefix}{cleaned_list}")
                changed = True
                desc = "Removed cleartext HTTP/Telnet from interface allowaccess rules"

        # 2. Disable SSH v1 in FortiOS Global
        elif "ssh" in normalized_control:
            if "set admin-ssh-v1 enable" in modified:
                modified = modified.replace("set admin-ssh-v1 enable", "set admin-ssh-v1 disable")
                changed = True
                desc = "Disabled admin-ssh-v1 in system global settings"

        return modified, changed, desc

    @classmethod
    def apply_patch(
        cls,
        vendor: str,
        raw_text: str,
        normalized_control: str,
        commands: str,
    ) -> Tuple[str, bool, str]:
        """Dispatches patching based on detected vendor."""
        v = (vendor or "cisco").lower()
        if "juniper" in v or "junos" in v:
            return cls.patch_juniper_configuration(raw_text, normalized_control, commands)
        elif "fortinet" in v or "fortios" in v:
            return cls.patch_fortinet_configuration(raw_text, normalized_control, commands)
        else:
            return cls.patch_cisco_configuration(raw_text, normalized_control, commands)
