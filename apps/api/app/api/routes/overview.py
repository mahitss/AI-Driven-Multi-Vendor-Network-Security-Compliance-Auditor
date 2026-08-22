"""
NetVigil System Overview & Stats Route
"""
from typing import Any, Dict
from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.dependencies import DatabaseDep
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.device import Device
from app.models.finding import Finding

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/stats", summary="Get system overview metrics")
async def get_system_overview_stats(
    db: DatabaseDep,
) -> Dict[str, Any]:
    """Provides high-level counts for the NetVigil command overview."""
    total_configs_stmt = select(func.count(Configuration.id))
    total_configs = (await db.execute(total_configs_stmt)).scalar() or 0

    total_devices_stmt = select(func.count(Device.id))
    total_devices = (await db.execute(total_devices_stmt)).scalar() or 0

    total_audits_stmt = select(func.count(Audit.id))
    total_audits = (await db.execute(total_audits_stmt)).scalar() or 0

    total_findings_stmt = select(func.count(Finding.id))
    total_findings = (await db.execute(total_findings_stmt)).scalar() or 0

    # Vendor distribution
    vendor_dist_stmt = select(Configuration.detected_vendor, func.count(Configuration.id)).group_by(
        Configuration.detected_vendor
    )
    vendor_dist = (await db.execute(vendor_dist_stmt)).all()
    vendor_counts = {vendor: count for vendor, count in vendor_dist}

    return {
        "total_configurations": total_configs,
        "total_devices": total_devices,
        "total_audits": total_audits,
        "total_findings": total_findings,
        "vendor_breakdown": vendor_counts,
        "supported_vendors": ["cisco", "juniper", "fortinet"],
        "supported_frameworks": ["CIS", "NIST", "STIG", "ISO"],
    }
