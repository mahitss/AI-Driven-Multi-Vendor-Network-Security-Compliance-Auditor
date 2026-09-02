import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from app.db.session import AsyncSessionLocal
from app.db.seed import clean_demo_records
from app.core.logging import logger

async def run_clean():
    print("Executing database cleanup of synthetic demo records...")
    async with AsyncSessionLocal() as session:
        purged = await clean_demo_records(session)
        print(f"Purged {purged} synthetic demo configurations and associated records.")

if __name__ == "__main__":
    asyncio.run(run_clean())
