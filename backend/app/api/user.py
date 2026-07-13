from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from ..models.analysis import Analysis
from ..models.credit import WeeklyProgress
from ..models.user import User
from ..schemas.analysis import AnalysisListItem, WeeklyProgressOut

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/history", response_model=list[AnalysisListItem])
async def get_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user.id, Analysis.status == "completed")
        .order_by(desc(Analysis.created_at))
        .limit(50)
    )
    return [AnalysisListItem.model_validate(a) for a in result.scalars().all()]


@router.get("/progress", response_model=list[WeeklyProgressOut])
async def get_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WeeklyProgress)
        .where(WeeklyProgress.user_id == user.id)
        .order_by(desc(WeeklyProgress.week_start))
        .limit(12)
    )
    return [WeeklyProgressOut.model_validate(p) for p in result.scalars().all()]
