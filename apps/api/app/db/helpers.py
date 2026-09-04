"""
NetVigil Database Query Helpers
Provides dialect-agnostic, robust tenant-isolated query helpers across SQLite, PostgreSQL, and MySQL.
"""
from typing import List, Optional, Set
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import Audit
from app.models.configuration import Configuration


async def get_latest_audit_ids(db: AsyncSession, user_id: Optional[str] = None) -> List[str]:
    """
    Returns the list of Audit IDs representing the most recent completed audit for each unique configuration asset,
    strictly isolated by the authenticated user_id. Repeated audits of the same asset take the latest completed scan.
    """
    if not user_id:
        return []

    stmt = (
        select(Audit.id, Audit.device_id, Audit.configuration_id, Configuration.device_id, Configuration.original_filename)
        .outerjoin(Configuration, Audit.configuration_id == Configuration.id)
        .where(
            Audit.user_id == user_id,
            or_(func.upper(Audit.status) == "COMPLETED", Audit.score.is_not(None)),
        )
        .order_by(desc(Audit.created_at), desc(Audit.id))
    )

    audits_res = await db.execute(stmt)
    audit_rows = audits_res.all()

    seen_asset_keys: Set[str] = set()
    latest_ids: List[str] = []
    for audit_id, a_dev_id, cfg_id, c_dev_id, orig_filename in audit_rows:
        # Resolve canonical asset identity (Device ID -> Config filename -> Configuration ID -> Audit ID)
        asset_key = a_dev_id or c_dev_id or orig_filename or cfg_id or audit_id
        if asset_key not in seen_asset_keys:
            seen_asset_keys.add(asset_key)
            latest_ids.append(audit_id)

    return latest_ids


async def get_latest_audits(db: AsyncSession, user_id: Optional[str] = None) -> List[Audit]:
    """
    Returns full Audit instances representing the most recent completed audit for each unique configuration asset,
    strictly isolated by the authenticated user_id. Deduplicates repeated audits of the same asset.
    """
    if not user_id:
        return []

    stmt = (
        select(Audit, Configuration)
        .outerjoin(Configuration, Audit.configuration_id == Configuration.id)
        .where(
            Audit.user_id == user_id,
            or_(func.upper(Audit.status) == "COMPLETED", Audit.score.is_not(None)),
        )
        .order_by(desc(Audit.created_at), desc(Audit.id))
    )

    audits_res = await db.execute(stmt)
    rows = audits_res.all()

    seen_asset_keys: Set[str] = set()
    latest_audits: List[Audit] = []
    for a, cfg in rows:
        # Resolve canonical asset identity (Device ID -> Config filename -> Configuration ID -> Audit ID)
        asset_key = (
            a.device_id
            or (cfg.device_id if cfg else None)
            or (cfg.original_filename if cfg else None)
            or a.configuration_id
            or a.id
        )
        if asset_key not in seen_asset_keys:
            seen_asset_keys.add(asset_key)
            latest_audits.append(a)

    return latest_audits
