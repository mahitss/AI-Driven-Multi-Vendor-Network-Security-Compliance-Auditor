"""
SQLAlchemy Domain Models CRUD & Relationship Tests
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import Audit
from app.models.compliance import Control, Framework
from app.models.configuration import Configuration
from app.models.device import Device
from app.models.finding import Finding
from app.models.training import TrainingMapping
from app.models.user import User


@pytest.mark.asyncio
async def test_create_and_query_device_and_configuration(db_session: AsyncSession):
    # Create Device
    device = Device(
        hostname="CORE-RTR-01",
        vendor="cisco",
        platform="ios-xe",
        model="Catalyst-9300",
        serial_number="FOC12345XYZ",
    )
    db_session.add(device)
    await db_session.flush()

    # Create Configuration linked to device
    config = Configuration(
        device_id=device.id,
        filename="cfg_01.cfg",
        original_filename="core.cfg",
        storage_path="/storage/cfg_01.cfg",
        file_size_bytes=1024,
        hash="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        raw_content="hostname CORE-RTR-01\n",
        detected_vendor="cisco",
        detected_platform="ios-xe",
        detection_confidence=0.95,
        detection_method="signature",
    )
    db_session.add(config)
    await db_session.flush()

    # Query back
    stmt = select(Configuration).where(Configuration.id == config.id)
    result = await db_session.execute(stmt)
    fetched = result.scalars().first()

    assert fetched is not None
    assert fetched.detected_vendor == "cisco"
    assert fetched.device_id == device.id


@pytest.mark.asyncio
async def test_compliance_framework_control_and_finding(db_session: AsyncSession):
    # Create Framework
    framework = Framework(
        name="CIS",
        version="v4.1.0",
        description="CIS Cisco IOS 15 Benchmark",
    )
    db_session.add(framework)
    await db_session.flush()

    # Create Control
    control = Control(
        framework_id=framework.id,
        control_id="CIS-1.1.1",
        name="Ensure 'service password-encryption' is Enabled",
        category="Identity & Access Management",
        severity="HIGH",
    )
    db_session.add(control)
    await db_session.flush()

    # Create Config & Audit
    config = Configuration(
        filename="test.cfg",
        original_filename="test.cfg",
        storage_path="/storage/test.cfg",
        file_size_bytes=512,
        hash="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        raw_content="no service password-encryption\n",
        detected_vendor="cisco",
        detection_confidence=0.9,
    )
    db_session.add(config)
    await db_session.flush()

    audit = Audit(
        configuration_id=config.id,
        status="COMPLETED",
        score=78.5,
    )
    db_session.add(audit)
    await db_session.flush()

    # Create Finding
    finding = Finding(
        audit_id=audit.id,
        control_id=control.id,
        status="FAIL",
        severity="HIGH",
        title="Service password-encryption is disabled",
        evidence="no service password-encryption",
        expected_value="service password-encryption",
        actual_value="no service password-encryption",
        remediation="configure terminal\n service password-encryption\nend",
    )
    db_session.add(finding)
    await db_session.flush()

    # Verify Finding retrieval
    stmt = select(Finding).where(Finding.id == finding.id)
    res = await db_session.execute(stmt)
    saved_finding = res.scalars().first()

    assert saved_finding is not None
    assert saved_finding.status == "FAIL"
    assert saved_finding.severity == "HIGH"
    assert saved_finding.audit_id == audit.id


@pytest.mark.asyncio
async def test_create_user_and_training_mapping(db_session: AsyncSession):
    user = User(
        email="auditor@ntro.gov.in",
        name="Senior Network Auditor",
        role="admin",
    )
    db_session.add(user)

    mapping = TrainingMapping(
        vendor="fortinet",
        platform="fortios",
        raw_pattern="set admin-lockout-threshold (\d+)",
        normalized_control="authentication.failed_login_lockout_enabled",
        semantic_meaning="FortiOS administrative brute-force lockout threshold",
        confidence=0.95,
        human_verified=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    stmt = select(TrainingMapping).where(TrainingMapping.vendor == "fortinet")
    res = await db_session.execute(stmt)
    saved_map = res.scalars().first()

    assert saved_map is not None
    assert saved_map.human_verified is True
    assert saved_map.confidence == 0.95
