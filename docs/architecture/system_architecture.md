# NetVigil — System Architecture & Design Specification

**Problem Statement:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Classification:** Software / Blockchain & Cybersecurity  

---

## 1. Core Architectural Principle

NetVigil strictly separates **Deterministic Verification** from **AI Interpretation**:

```text
+-------------------------------------------------------------------------------+
|                           DETERMINISTIC LAYER (100% Auditable)                |
|                                                                               |
|  [Raw Config] --> [SHA-256 Digest] --> [Signature Vendor Detector]            |
|       |                                                                       |
|       v                                                                       |
|  [AST / Regex Parser] --> [Universal Security Normalization (Pydantic v2)]    |
|                                     |                                         |
|                                     v                                         |
|                 [Deterministic Compliance Rule Engine]                        |
|                                     |                                         |
|                                     v                                         |
|                 [Evidence-Based Findings & Severity Scoring]                  |
+-------------------------------------+-----------------------------------------+
                                      |
                                      | Finding Metadata & Evidence
                                      v
+-------------------------------------------------------------------------------+
|                            AI CO-PILOT LAYER (Assisted)                       |
|                                                                               |
|  * Semantic explanation of complex syntax                                     |
|  * Multi-vendor CLI remediation synthesis                                     |
|  * Natural language auditor interaction                                       |
|  * Adaptive training proposals (human-verified before adoption)               |
+-------------------------------------------------------------------------------+
```

> **Rule:** Never allow an LLM response alone to produce a trusted PASS/FAIL compliance result.

---

## 2. Universal Security Schema

Rather than evaluating compliance directly against vendor-specific CLI syntaxes, NetVigil normalizes configurations into 11 vendor-neutral domains:

1. **DeviceIdentity**: Hostname, domain name, legal warning banners, OS family & version.
2. **Authentication**: AAA state, password encryption, enable secret hashing algorithms (scrypt type 9, sha256 type 8), lockout policies.
3. **Authorization**: RBAC separation, command execution authorization, accounting audits.
4. **RemoteAccess**: SSH v2 enforcement, legacy cipher exclusions, Telnet/HTTP deactivation, VTY access classes, inactivity timeouts.
5. **AccessControl**: Control Plane Policing (CoPP), perimeter filtering, default-deny policies.
6. **Encryption**: IKEv2/IPSec transform suites, TLS 1.2+ minimums.
7. **Logging**: Remote SIEM syslog endpoints, log level traps, millisecond UTC timestamps, buffered logs.
8. **TimeSync**: NTP servers, MD5/SHA key authentication.
9. **Services**: SNMPv3-only enforcement, community string hygiene, CDP/LLDP boundaries, finger/proxy-arp deactivation.
10. **Management**: Rate-limiting brute force attempts, terminal exec timeouts.
11. **NetworkSecurity**: Spanning Tree BPDU Guard, DHCP Snooping, Dynamic ARP Inspection (DAI), IP Source Guard, Port Security.

---

## 3. Supported Multi-Vendor Matrix (Day 1 Focus)

| Vendor | Primary Platforms | Detection Method | Normalization Scope |
| :--- | :--- | :--- | :--- |
| **Cisco Systems** | IOS, IOS-XE, NX-OS | Deterministic Signatures | AAA, SSH, Logging, NTP, VTY, BPDU Guard, ACLs |
| **Juniper Networks** | JunOS (Hierarchical & Set) | Hierarchical / Set Syntax | System, Services, Syslog, Firewall, Zones |
| **Fortinet** | FortiOS (FortiGate 6.x/7.x) | Block Structure & Config Version | System Global, Interfaces, Policies, VPN |

---

## 4. Ingestion Security & Integrity

- **Cryptographic Hashing:** Every uploaded configuration is hashed using SHA-256 immediately upon arrival.
- **Isolated Storage:** Files are stored in an isolated filesystem path named by hash prefix to eliminate path traversal vulnerabilities.
- **Strict Content Validation:** Allowed extensions (`.cfg`, `.conf`, `.txt`, `.log`), MIME validation, text decode verification, and maximum file size limits (10MB).
- **Secret Redaction:** Passwords, enable secrets, and API tokens are dynamically redacted from application logs.
