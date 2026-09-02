import asyncio
import sys
from pathlib import Path
from sqlalchemy import select, func

sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from app.db.session import AsyncSessionLocal
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.device import Device
from app.models.risk import RiskItem
from app.core.config import settings

async def check_db():
    print("DATABASE_URL:", settings.DATABASE_URL)
    async with AsyncSessionLocal() as session:
        cfg_count = (await session.execute(select(func.count(Configuration.id)))).scalar()
        audit_count = (await session.execute(select(func.count(Audit.id)))).scalar()
        finding_count = (await session.execute(select(func.count(Finding.id)))).scalar()
        device_count = (await session.execute(select(func.count(Device.id)))).scalar()
        risk_count = (await session.execute(select(func.count(RiskItem.id)))).scalar()
        print(f"Total DB records: Configs={cfg_count}, Audits={audit_count}, Findings={finding_count}, Devices={device_count}, Risks={risk_count}")
        
        configs = (await session.execute(select(Configuration.id, Configuration.original_filename, Configuration.user_id, Configuration.detected_vendor))).all()
        print("Configurations in DB:")
        for c in configs:
            print(f"  ID={c[0]} | File={c[1]} | User={c[2]} | Vendor={c[3]}")

if __name__ == "__main__":
    asyncio.run(check_db())
