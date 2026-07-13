"""Seed script: creates default credit packs."""
import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, engine, Base
from app.models.credit import CreditPack


PACKS = [
    {"name": "Starter Pack", "credits": 10, "price_inr": 30},
    {"name": "Singer Pack", "credits": 50, "price_inr": 99},
    {"name": "Pro Pack", "credits": 150, "price_inr": 249},
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        existing = await db.execute(select(CreditPack))
        if existing.scalars().first():
            print("Credit packs already exist, skipping seed.")
            return

        for pack_data in PACKS:
            db.add(CreditPack(**pack_data))
        await db.commit()
        print(f"Seeded {len(PACKS)} credit packs.")


if __name__ == "__main__":
    asyncio.run(seed())
