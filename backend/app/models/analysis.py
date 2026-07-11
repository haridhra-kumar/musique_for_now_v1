from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Uuid, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="processing", nullable=False)  # processing | completed | failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scores
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pitch_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rhythm_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tempo_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vocal_stability_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Metadata
    key_detected: Mapped[str | None] = mapped_column(String(20), nullable=True)
    octave_shift: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tempo_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_warning: Mapped[bool] = mapped_column(Boolean, default=False)
    snr_db: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Full result JSON (for the frontend to consume)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analyses")
    timestamps = relationship("AnalysisTimestamp", back_populates="analysis", lazy="selectin", cascade="all, delete-orphan")
    feedback = relationship("AnalysisFeedback", back_populates="analysis", uselist=False, lazy="selectin", cascade="all, delete-orphan")


class AnalysisTimestamp(Base):
    __tablename__ = "timestamps"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("analyses.id"), nullable=False, index=True)
    time_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    issue_type: Mapped[str] = mapped_column(String(20), nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    analysis = relationship("Analysis", back_populates="timestamps")


class AnalysisFeedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("analyses.id"), unique=True, nullable=False)
    beginner_text: Mapped[str] = mapped_column(Text, nullable=False)
    musician_text: Mapped[str] = mapped_column(Text, nullable=False)
    llm_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    analysis = relationship("Analysis", back_populates="feedback")
