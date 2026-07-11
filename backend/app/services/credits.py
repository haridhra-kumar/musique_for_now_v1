from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.user import User
from ..models.analysis import Analysis
from ..models.credit import CreditPack, Transaction

settings = get_settings()


async def check_can_analyze(db: AsyncSession, user: User) -> bool:
    """Check if user has credits or free daily analyses remaining."""
    if user.credits > 0:
        return True

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Analysis.id))
        .where(Analysis.user_id == user.id)
        .where(Analysis.created_at >= today_start)
    )
    today_count = result.scalar() or 0
    return today_count < settings.free_analyses_per_day


async def deduct_credit(db: AsyncSession, user: User) -> None:
    """Deduct 1 credit, or use free daily analysis."""
    can = await check_can_analyze(db, user)
    if not can:
        raise ValueError("No credits remaining. Purchase a credit pack to continue.")

    if user.credits > 0:
        user.credits -= 1
        db.add(Transaction(
            user_id=user.id,
            amount=-1,
            description="Analysis credit used",
        ))
        await db.flush()


async def add_credits(db: AsyncSession, user: User, pack_id: uuid.UUID,
                      payment_id: str | None = None) -> int:
    result = await db.execute(select(CreditPack).where(CreditPack.id == pack_id, CreditPack.active == True))
    pack = result.scalar_one_or_none()
    if not pack:
        raise ValueError("Credit pack not found")

    user.credits += pack.credits
    db.add(Transaction(
        user_id=user.id,
        pack_id=pack.id,
        amount=pack.credits,
        description=f"Purchased {pack.name}",
        payment_id=payment_id,
    ))
    await db.flush()
    return user.credits


async def get_packs(db: AsyncSession) -> list[CreditPack]:
    result = await db.execute(select(CreditPack).where(CreditPack.active == True))
    return list(result.scalars().all())
