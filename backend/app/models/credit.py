from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class CreditPack(Base):
    __tablename__ = "credit_packs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    price_inr: Mapped[float] = mapped_column(Float, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    pack_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("credit_packs.id"), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = purchase, negative = usage
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")


class WeeklyProgress(Base):
    __tablename__ = "weekly_progress"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    week_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    avg_pitch: Mapped[float] = mapped_column(Float, default=0)
    avg_rhythm: Mapped[float] = mapped_column(Float, default=0)
    avg_tempo: Mapped[float] = mapped_column(Float, default=0)
    avg_overall: Mapped[float] = mapped_column(Float, default=0)
    analyses_count: Mapped[int] = mapped_column(Integer, default=0)
