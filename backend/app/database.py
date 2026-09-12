from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()

db_url = settings.database_url
if "postgresql" in db_url:
    if not db_url.startswith("postgresql+asyncpg://") and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    db_url = re.sub(r"([?&])sslmode=([^&]+)", r"\1ssl=\2", db_url)

engine = create_async_engine(db_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
