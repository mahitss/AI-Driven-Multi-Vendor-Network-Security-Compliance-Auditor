"""
NetVigil Database Query Helpers
Provides dialect-agnostic, robust query helpers across SQLite, PostgreSQL, and MySQL.
"""
from typing import List, Set
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import Audit


async def get_latest_audit_ids(db: AsyncSession) -> List[str]:
    """
    Returns the list of Audit IDs representing the most recent audit for each unique configuration.
    Guaranteed to work reliably across all database engines without timezone/microsecond join collisions.
    """
    audits_res = await db.execute(
        select(Audit.id, Audit.configuration_id)
        .order_by(desc(Audit.created_at), desc(Audit.id))
    )
    audit_rows = audits_res.all()

    seen_cfg_ids: Set[str] = set()
    latest_ids: List[str] = []
    for audit_id, cfg_id in audit_rows:
        key = cfg_id or audit_id
        if key not in seen_cfg_ids:
            seen_cfg_ids.add(key)
            latest_ids.append(audit_id)

    return latest_ids


async def get_latest_audits(db: AsyncSession) -> List[Audit]:
    """
    Returns full Audit instances representing the most recent audit for each unique configuration.
    """
    audits_res = await db.execute(
        select(Audit).order_by(desc(Audit.created_at), desc(Audit.id))
    )
    audits = list(audits_res.scalars().all())

    seen_cfg_ids: Set[str] = set()
    latest_audits: List[Audit] = []
    for a in audits:
        key = a.configuration_id or a.id
        if key not in seen_cfg_ids:
            seen_cfg_ids.add(key)
            latest_audits.append(a)

    return latest_audits
