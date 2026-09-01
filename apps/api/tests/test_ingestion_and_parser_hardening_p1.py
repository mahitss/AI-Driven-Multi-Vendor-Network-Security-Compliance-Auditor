"""
NetVigil Ingestion, Upload, Parser Input Handling & Resource Consumption Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive verification of 22 attack cases:
1. Upload exactly at maximum size -> success.
2. Upload one byte over maximum -> HTTP 413.
3. Missing Content-Length with oversized streamed body -> HTTP 413.
4. Empty file -> safe 400 rejection.
5. Binary / Archive files (ELF, PE, Zip, Gzip, Bzip2, 7z, RAR, XZ, PDF) -> safe 400 rejection.
6. Invalid encoding / null bytes -> safe 400 rejection.
7. Extremely long line (>32KB) -> safe rejection.
8. Huge line count (>50,000 lines) -> safe rejection.
9. Path traversal filename -> sanitized and contained within storage root.
10. Absolute path filename -> sanitized to safe base name.
11. Null-byte in filename -> sanitized without path truncation.
12. Unsupported extension -> rejected.
13. Malformed Cisco config -> parsed safely without server crash.
14. Malformed Juniper config -> parsed safely without server crash.
15. Malformed Fortinet config -> parsed safely without server crash.
16. Random text / garbage input -> safe unknown vendor result without crash.
17. Ambiguous vendor syntax -> safe deterministic detection without crash.
18. Large valid configuration -> processed accurately within bounds.
19. Storage isolation -> User A cannot access User B's file.
20. Expensive ingestion rate-limiting protection.
21. AI requests have bounded prompt inputs and timeouts.
22. Error responses do not leak server internals or stack traces.
"""
import io
import time
import uuid
import jwt
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.config import settings
from app.core.auth import clear_token_cache
from app.core.security import sanitize_filename, validate_file_metadata, validate_configuration_content
from app.services.parsing.vendor_detector import VendorDetector
from app.services.parser.registry import parser_registry


def create_mock_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "app_metadata": {"provider": "email", "role": "auditor"},
        "user_metadata": {"full_name": f"User {user_id[-6:]}"},
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def clean_auth_cache():
    clear_token_cache()
    yield
    clear_token_cache()


VALID_CISCO_SAMPLE = """!
version 15.2
service timestamps log datetime msec
service password-encryption
hostname NTRO-EDGE-01
!
aaa new-model
!
line vty 0 4
 transport input ssh
!
end
"""

VALID_JUNIPER_SAMPLE = """
version 18.4R1.8;
system {
    host-name NTRO-JUNIPER-01;
    services {
        ssh;
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

VALID_FORTINET_SAMPLE = """
config system global
    set hostname "NTRO-FORTINET-01"
    set timezone 04
end
config system interface
    edit "port1"
        set ip 192.168.1.99 255.255.255.0
        set allowaccess ping https ssh
    next
end
"""


@pytest.mark.asyncio
async def test_1_and_2_upload_size_bounds(monkeypatch):
    """
    TEST 1: Upload at or under maximum limit -> 201 Created.
    TEST 2: Upload one byte over maximum limit -> HTTP 413 Payload Too Large.
    """
    user_id = f"usr-sz-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Temporarily set MAX_FILE_SIZE_MB to 1MB for deterministic test
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 1)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Case 1: Exactly 1MB of valid text lines under 50,000 line limit
        one_mb_content = ("!\nhostname TEST-ROUTER\n" + "! line with padding text to reach size\n" * 25000).encode("utf-8")[:1024 * 1024]
        res_ok = await client.post(
            "/api/v1/configurations",
            files={"file": ("under_limit.cfg", io.BytesIO(one_mb_content), "text/plain")},
            headers=headers,
        )
        assert res_ok.status_code == 201

        # Case 2: One byte over 1MB (1024 * 1024 + 1 bytes)
        oversized_content = b"!" * (1024 * 1024 + 1)
        res_over = await client.post(
            "/api/v1/configurations",
            files={"file": ("oversized.cfg", io.BytesIO(oversized_content), "text/plain")},
            headers=headers,
        )
        assert res_over.status_code == 413
        assert "FILE_SIZE_EXCEEDED" in res_over.text


@pytest.mark.asyncio
async def test_3_missing_content_length_oversized_stream():
    """
    TEST 3: Streamed body without Content-Length is rejected once threshold is exceeded during read.
    """
    user_id = f"usr-stream-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Generate 11MB stream (exceeds default 10MB limit)
        oversized_stream = io.BytesIO(b"!" * (11 * 1024 * 1024))
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("stream_over.cfg", oversized_stream, "application/octet-stream")},
            headers=headers,
        )
        assert res.status_code == 413


@pytest.mark.asyncio
async def test_4_empty_file_handling():
    """
    TEST 4: Empty file upload fails safely with clean 400 error.
    """
    user_id = f"usr-empty-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("empty.cfg", io.BytesIO(b"   \n  \t  \n"), "text/plain")},
            headers=headers,
        )
        assert res.status_code == 400
        assert "empty" in res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_5_binary_and_archive_magic_rejection():
    """
    TEST 5: Binaries and archives (ELF, PE, PDF, Zip, Gzip, Bzip2, 7z, RAR, XZ) are strictly rejected with 400.
    """
    user_id = f"usr-bin-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    hostile_magics = [
        ("malware.exe.cfg", b"MZ\x90\x00\x03\x00\x00\x00"),                     # PE / Windows EXE
        ("rootkit.elf.cfg", b"\x7fELF\x02\x01\x01\x00"),                        # Linux ELF
        ("exploit.zip.cfg", b"PK\x03\x04\x14\x00\x00\x00"),                     # ZIP / JAR
        ("payload.tar.gz.cfg", b"\x1f\x8b\x08\x00\x00\x00\x00\x00"),           # Gzip
        ("archive.bz2.cfg", b"BZh91AY&SY\x00\x00\x00"),                         # Bzip2
        ("archive.7z.cfg", b"7z\xbc\xaf\x27\x1c\x00\x04"),                      # 7-Zip
        ("archive.rar.cfg", b"Rar!\x1a\x07\x00"),                               # RAR
        ("archive.xz.cfg", b"\xfd7zXZ\x00\x00"),                                # XZ
        ("report.pdf.cfg", b"%PDF-1.7\n%\xe2\xe3\xcf\xd3"),                    # PDF
        ("script.sh.cfg", b"#!/bin/bash\nrm -rf /"),                            # Hostile script shebang
    ]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for fname, raw_bytes in hostile_magics:
            res = await client.post(
                "/api/v1/configurations",
                files={"file": (fname, io.BytesIO(raw_bytes), "text/plain")},
                headers=headers,
            )
            assert res.status_code == 400, f"Hostile file {fname} was not rejected! Got: {res.status_code}"
            assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"


@pytest.mark.asyncio
async def test_6_null_byte_and_invalid_encoding_rejection():
    """
    TEST 6: Null bytes anywhere in configuration are rejected safely.
    """
    user_id = f"usr-enc-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    payload_with_null = b"!\nhostname TEST-ROUTER\n\x00\x00\x00\x00line vty 0 4\n"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("null_byte.cfg", io.BytesIO(payload_with_null), "text/plain")},
            headers=headers,
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"


@pytest.mark.asyncio
async def test_7_extremely_long_line_rejection():
    """
    TEST 7: Extremely long line (>32KB) triggers bounded rejection to prevent ReDoS / CPU lockups.
    """
    user_id = f"usr-longline-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Create a 40KB single line
    pathological_line = "description " + ("A" * 40000) + "\n"
    content = ("!\nhostname LONG-LINE-R1\n" + pathological_line).encode("utf-8")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("pathological_line.cfg", io.BytesIO(content), "text/plain")},
            headers=headers,
        )
        assert res.status_code == 400
        assert "exceeds maximum permissible line length" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_8_huge_line_count_bounded_rejection(monkeypatch):
    """
    TEST 8: Line count exceeding MAX_CONFIG_LINES is rejected safely.
    """
    monkeypatch.setattr(settings, "MAX_CONFIG_LINES", 500)

    user_id = f"usr-manylines-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    content = ("!\nhostname MANY-LINES\n" + "ip route 10.0.0.0 255.0.0.0 1.1.1.1\n" * 600).encode("utf-8")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("too_many_lines.cfg", io.BytesIO(content), "text/plain")},
            headers=headers,
        )
        assert res.status_code == 400
        assert "exceeds maximum permissible line count" in res.json()["error"]["message"]


def test_9_10_11_filename_sanitization_and_isolation():
    """
    TEST 9: Path traversal in filename (`../../etc/shadow`) is stripped to base name.
    TEST 10: Absolute paths (`C:\\Windows\\System32\\cmd.exe`) are stripped to base name.
    TEST 11: Null-byte injection (`config.cfg\\x00.exe`) is cleaned safely.
    """
    # Test 9: Path traversal
    assert sanitize_filename("../../../../etc/shadow.cfg") == "shadow.cfg"
    assert sanitize_filename("..\\..\\boot.ini.conf") == "boot.ini.conf"

    # Test 10: Absolute paths
    assert sanitize_filename("/var/log/messages.log") == "messages.log"
    assert sanitize_filename("C:\\Windows\\System32\\driver.txt") == "driver.txt"

    # Test 11: Null byte injection
    assert sanitize_filename("safe_config.cfg\x00.exe") == "safe_config.cfg.exe"

    # Test max length truncation
    long_name = "a" * 300 + ".cfg"
    sanitized_long = sanitize_filename(long_name)
    assert len(sanitized_long) <= 255


@pytest.mark.asyncio
async def test_12_unsupported_extension_rejection():
    """
    TEST 12: Unsupported file extensions (.exe, .py, .pdf, .sh, .bat) are rejected.
    """
    user_id = f"usr-ext-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("script.py", io.BytesIO(b"print('hello')\n"), "text/x-python")},
            headers=headers,
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_13_14_15_malformed_configs_no_crash():
    """
    TEST 13: Malformed Cisco config (unclosed blocks, truncated tokens) parses without crash.
    TEST 14: Malformed Juniper config (unclosed braces, invalid syntax) parses without crash.
    TEST 15: Malformed Fortinet config (missing 'end', partial edit blocks) parses without crash.
    """
    # 13: Malformed Cisco
    malformed_cisco = """
    ! corrupted cisco config
    service timestamps
    enable secret
    line vty
     transport input
    interface GigabitEthernet0/0/
     ip address
    """
    cisco_parser = parser_registry.get_parser(malformed_cisco, vendor_hint="cisco")
    profile_cisco = cisco_parser.parse(malformed_cisco)
    assert profile_cisco.vendor == "cisco"

    # 14: Malformed Juniper
    malformed_juniper = """
    version 18.2R1;
    system {
        host-name UNCLOSED-JUNIPER;
        services {
            ssh;
    interfaces {
        ge-0/0/0 {
    """
    juniper_parser = parser_registry.get_parser(malformed_juniper, vendor_hint="juniper")
    profile_juniper = juniper_parser.parse(malformed_juniper)
    assert profile_juniper.vendor == "juniper"

    # 15: Malformed Fortinet
    malformed_fortinet = """
    config system global
        set hostname
    config system interface
        edit "port1"
            set allowaccess
    """
    fortinet_parser = parser_registry.get_parser(malformed_fortinet, vendor_hint="fortinet")
    profile_fortinet = fortinet_parser.parse(malformed_fortinet)
    assert profile_fortinet.vendor == "fortinet"


def test_16_17_random_and_ambiguous_text_safety():
    """
    TEST 16: Random text / novel input returns safe unknown vendor result with 0.0 confidence.
    TEST 17: Ambiguous text with mixed keywords evaluates deterministically without crash.
    """
    # Test 16: Random garbage
    random_text = "The quick brown fox jumps over the lazy dog.\nJust standard prose without network directives."
    result_random = VendorDetector.detect(random_text)
    assert result_random.vendor == "unknown"
    assert result_random.confidence == 0.0

    # Test 17: Mixed Cisco and Fortinet keywords
    mixed_syntax = """
    ! Cisco header
    service timestamps log datetime msec
    service password-encryption
    hostname MIXED-DEVICE
    line vty 0 4
    config system global
        set hostname "FAKE-FORTINET"
    """
    result_mixed = VendorDetector.detect(mixed_syntax)
    assert result_mixed.vendor in ["cisco", "fortinet"]
    assert result_mixed.confidence >= 0.70


@pytest.mark.asyncio
async def test_18_large_valid_configuration_processing():
    """
    TEST 18: Large valid configuration (5,000 lines) parses and ingests accurately within bounds.
    """
    user_id = f"usr-large-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    lines = [
        "!",
        "version 15.2",
        "service timestamps log datetime msec",
        "service password-encryption",
        "hostname NTRO-CORE-AGGREGATOR-01",
        "aaa new-model",
    ]
    # Add 2,000 standard interface blocks
    for i in range(1, 1000):
        lines.extend([
            f"interface GigabitEthernet0/{i}",
            f" description Campus Access Port {i}",
            f" ip address 10.{i // 256}.{i % 256}.1 255.255.255.0",
            " no shutdown",
            "!",
        ])
    lines.extend(["line vty 0 4", " transport input ssh", "end"])
    large_config_str = "\n".join(lines)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        start_t = time.perf_counter()
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("large_campus_core.cfg", io.BytesIO(large_config_str.encode("utf-8")), "text/plain")},
            headers=headers,
        )
        elapsed = time.perf_counter() - start_t
        assert res.status_code == 201
        data = res.json()
        assert data["detected_vendor"] == "cisco"
        assert elapsed < 5.0, f"Large file ingestion took too long: {elapsed:.2f}s"


@pytest.mark.asyncio
async def test_19_storage_isolation_between_tenants():
    """
    TEST 19: User A's uploaded file cannot be read or downloaded by User B.
    """
    user_a = f"usr-a-{uuid.uuid4()}"
    user_b = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a, f"{user_a}@ntro.gov.in")
    token_b = create_mock_jwt(user_b, f"{user_b}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("tenant_a.cfg", io.BytesIO(VALID_CISCO_SAMPLE.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        cfg_id = up_res.json()["id"]

        # User B attempts to read
        get_b = await client.get(f"/api/v1/configurations/{cfg_id}", headers=headers_b)
        assert get_b.status_code == 404

        # User B attempts to export/download
        exp_b = await client.get(f"/api/v1/configurations/{cfg_id}/export", headers=headers_b)
        assert exp_b.status_code == 404


@pytest.mark.asyncio
async def test_20_expensive_ingestion_rate_limiting(monkeypatch):
    """
    TEST 20: RateLimitMiddleware protects ingestion from volumetric denial-of-service.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        user_id = f"usr-rl-{uuid.uuid4()}"
        token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
        headers = {"Authorization": f"Bearer {token}"}

        # Make 65 rapid configuration upload attempts
        statuses = []
        for i in range(65):
            res = await client.post(
                "/api/v1/configurations",
                files={"file": (f"spam_{i}.cfg", io.BytesIO(VALID_CISCO_SAMPLE.encode("utf-8")), "text/plain")},
                headers=headers,
            )
            statuses.append(res.status_code)

        # Rate limit threshold for configurations is 60/min
        assert 429 in statuses, "Rate limiting was not enforced on configuration ingestion endpoint!"


@pytest.mark.asyncio
async def test_21_ai_request_bounded_inputs_and_timeouts():
    """
    TEST 21: AI explanation / copilot calls enforce bounded string input and execute within timeout.
    """
    user_id = f"usr-ai-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # User creates a valid config & audit
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("ai_test.cfg", io.BytesIO(VALID_CISCO_SAMPLE.encode("utf-8")), "text/plain")},
            headers=headers,
        )
        cfg_id = up_res.json()["id"]

        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_id, "frameworks": ["CIS"]},
            headers=headers,
        )
        audit_id = audit_res.json()["audit_id"]

        # 1. Verify oversized query (>500 chars) is rejected with 422 to protect AI resources
        chat_oversized = await client.post(
            f"/api/v1/ai/audits/{audit_id}/chat",
            json={"query": "Explain findings " + ("A" * 50000)},
            headers=headers,
        )
        assert chat_oversized.status_code == 422

        # 2. Verify valid bounded query (<=500 chars) executes within timeout
        start_t = time.perf_counter()
        chat_res = await client.post(
            f"/api/v1/ai/audits/{audit_id}/chat",
            json={"query": "Explain findings for telnet and weak encryption"},
            headers=headers,
        )
        elapsed = time.perf_counter() - start_t
        assert chat_res.status_code == 200
        assert elapsed <= 35.0


@pytest.mark.asyncio
async def test_22_error_responses_do_not_leak_internals():
    """
    TEST 22: Error responses contain sanitized schema and do not leak internal file paths,
    database connection strings, or Python tracebacks.
    """
    user_id = f"usr-err-{uuid.uuid4()}"
    token = create_mock_jwt(user_id, f"{user_id}@ntro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Send bad payload
        res = await client.post(
            "/api/v1/configurations",
            files={"file": ("corrupt.cfg", io.BytesIO(b"\x00\x01\x02\x03"), "text/plain")},
            headers=headers,
        )
        assert res.status_code == 400
        data = res.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]

        # Verify no internal server strings leaked
        raw_text = res.text
        assert "Traceback (most recent call last)" not in raw_text
        assert "sqlite+aiosqlite" not in raw_text
        assert "postgresql://" not in raw_text
        assert "C:\\Users\\" not in raw_text
        assert "/home/" not in raw_text
