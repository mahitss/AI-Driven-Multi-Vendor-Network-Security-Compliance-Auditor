"""
NetVigil Demo State Reset Script
All Things Agentic Hackathon — Taskmaster Track

Idempotently resets all configurations, findings, and agent execution sessions
back to the canonical, un-remediated baseline for repeated demo rehearsals.
"""
import sys
import asyncio
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.db.session import AsyncSessionLocal, async_engine
from app.models.base import Base
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.remediation import RemediationProposal
from app.services.agent.memory import AgentMemoryManager
from app.db.seed import seed_database_if_empty
from sqlalchemy import delete


async def reset_demo():
    print("=" * 70)
    print(" NETVIGIL — RESETTING DEMO STATE TO CANONICAL BASELINE")
    print("=" * 70)

    # 1. Clear in-memory / session state
    AgentMemoryManager._in_memory_store.clear()
    print("[1/3] Cleared active agent session memory.")

    # 2. Reset database tables
    async with AsyncSessionLocal() as session:
        # Delete audits, findings, remediations, configurations
        await session.execute(delete(Finding))
        await session.execute(delete(RemediationProposal))
        await session.execute(delete(Audit))
        await session.execute(delete(Configuration))
        await session.commit()
        print("[2/3] Cleared previous audit runs, diffs, and findings.")

        # Re-seed canonical fixtures
        await seed_database_if_empty(session)
        print("[3/3] Re-seeded canonical multi-vendor demo configurations.")

    print("=" * 70)
    print(" SUCCESS: Demo state reset! Ready for autonomous agent rehearsal.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(reset_demo())
