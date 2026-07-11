from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    credits: int
    plan_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
