from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from ..models.user import User
from ..schemas.credit import CreditPackOut, PurchaseRequest, PurchaseResponse
from ..services.credits import get_packs, add_credits

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/packs", response_model=list[CreditPackOut])
async def list_packs(db: AsyncSession = Depends(get_db)):
    packs = await get_packs(db)
    return [CreditPackOut.model_validate(p) for p in packs]


@router.post("/purchase", response_model=PurchaseResponse)
async def purchase(
    body: PurchaseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        new_balance = await add_credits(db, user, body.pack_id, body.payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return PurchaseResponse(
        new_balance=new_balance,
        credits_added=new_balance - (user.credits - new_balance),
    )
