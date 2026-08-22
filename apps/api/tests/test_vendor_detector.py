"""
Deterministic Vendor Detector Unit Tests
"""
from pathlib import Path
import pytest
from app.services.parsing.vendor_detector import VendorDetector


def test_detect_cisco_ios_sample():
    cisco_cfg = """
    !
    version 17.3
    service timestamps debug datetime msec
    service password-encryption
    hostname CORE-RTR-01
    boot-start-marker
    boot-end-marker
    enable secret 9 $9$dummysecret
    line vty 0 4
     transport input ssh
    spanning-tree mode rapid-pvst
    !
    """
    result = VendorDetector.detect(cisco_cfg, "core.cfg")
    assert result.vendor == "cisco"
    assert result.platform == "ios"
    assert result.confidence >= 0.8
    assert result.method == "signature"
    assert "cisco_enable_secret" in result.detected_patterns or "cisco_line_vty" in result.detected_patterns


def test_detect_juniper_junos_hierarchical_sample():
    juniper_conf = """
    version 21.4R3-S2;
    system {
        host-name FW-PERIMETER;
        root-authentication {
            encrypted-password "$6$dummy";
        }
        services {
            ssh {
                protocol-version v2;
            }
        }
    }
    interfaces {
        ge-0/0/0 {
            unit 0 {
                family inet {
                    address 10.0.0.1/24;
                }
            }
        }
    }
    """
    result = VendorDetector.detect(juniper_conf, "junos.conf")
    assert result.vendor == "juniper"
    assert result.confidence >= 0.8
    assert result.method == "signature"
    assert "junos_version_header" in result.detected_patterns


def test_detect_juniper_junos_set_syntax():
    juniper_set = """
    set version 20.2R1.10
    set system host-name SRX-BRANCH-01
    set system time-zone UTC
    set interfaces ge-0/0/0 unit 0 family inet address 192.168.1.1/24
    set security policies from-zone trust to-zone untrust policy p1 match source-address any
    """
    result = VendorDetector.detect(juniper_set, "set_syntax.txt")
    assert result.vendor == "juniper"
    assert result.platform in ["junos-srx", "junos"]
    assert result.confidence >= 0.8


def test_detect_fortinet_fortios_sample():
    fortinet_conf = """
    #config-version=FG60F-7.2.4-FW-build1396-230308:opmode=0:vdom=0:user=admin
    config system global
        set hostname "EDGE-FGT-01"
        set timezone "80"
        set admintimeout 10
    end
    config system interface
        edit "wan1"
            set vdom "root"
            set mode static
        next
    end
    config firewall policy
        edit 1
            set name "ALLOW_LAN_WAN"
            set srcintf "lan"
            set dstintf "wan1"
            set action accept
        next
    end
    """
    result = VendorDetector.detect(fortinet_conf, "fortigate.conf")
    assert result.vendor == "fortinet"
    assert result.platform == "fortios"
    assert result.confidence >= 0.8
    assert "fortinet_config_system_global" in result.detected_patterns


def test_detect_unknown_configuration():
    unknown_conf = """
    [GeneralSettings]
    AppName = RandomSoftware
    Port = 8080
    DebugMode = True
    """
    result = VendorDetector.detect(unknown_conf, "app.ini")
    assert result.vendor == "unknown"
    assert result.confidence == 0.0
    assert result.platform is None


def test_detect_empty_configuration():
    result = VendorDetector.detect("", "empty.cfg")
    assert result.vendor == "unknown"
    assert result.confidence == 0.0


def test_sample_config_files_detection():
    # Test our actual sample config files from disk
    sample_dir = Path("c:/Users/pc/OneDrive/Desktop/SIH2026/data/sample-configs")
    cisco_path = sample_dir / "cisco_ios_core_switch.cfg"
    juniper_path = sample_dir / "juniper_srx_firewall.conf"
    fortinet_path = sample_dir / "fortinet_fortigate_edge.conf"

    if cisco_path.exists():
        res = VendorDetector.detect(cisco_path.read_text(encoding="utf-8"), cisco_path.name)
        assert res.vendor == "cisco"

    if juniper_path.exists():
        res = VendorDetector.detect(juniper_path.read_text(encoding="utf-8"), juniper_path.name)
        assert res.vendor == "juniper"

    if fortinet_path.exists():
        res = VendorDetector.detect(fortinet_path.read_text(encoding="utf-8"), fortinet_path.name)
        assert res.vendor == "fortinet"
