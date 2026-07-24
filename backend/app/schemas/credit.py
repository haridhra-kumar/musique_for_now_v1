from __future__ import annotations

import uuid

from pydantic import BaseModel


class CreditPackOut(BaseModel):
    id: uuid.UUID
    name: str
    credits: int
    price_inr: float

    model_config = {"from_attributes": True}


class PurchaseRequest(BaseModel):
    pack_id: uuid.UUID
    payment_id: str | None = None


class PurchaseResponse(BaseModel):
    new_balance: int
    credits_added: int
