from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.credit import CreditPack, Transaction
from ..models.user import User

settings = get_settings()


async def check_can_analyze(db: AsyncSession, user: User) -> bool:
    """Analysis is unrestricted."""
    return True


async def deduct_credit(db: AsyncSession, user: User) -> None:
    """Deduct 1 credit if available, without blocking analysis."""
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
    result = await db.execute(select(CreditPack).where(CreditPack.id == pack_id, CreditPack.active.is_(True)))
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
    result = await db.execute(select(CreditPack).where(CreditPack.active.is_(True)))
    return list(result.scalars().all())
