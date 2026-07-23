from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AnalysisStatusResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    progress: int = 0


class AnalysisListItem(BaseModel):
    id: uuid.UUID
    file_name: str
    overall_score: int | None
    pitch_score: int | None
    rhythm_score: int | None
    tempo_score: int | None
    duration_seconds: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    job_id: uuid.UUID
    status: str = "processing"
    message: str = "Analysis started"


class MistakeOut(BaseModel):
    timestamp: str
    time_seconds: float
    end_time_seconds: float
    type: str
    severity: str
    description: str
    confidence: float


class ExerciseOut(BaseModel):
    name: str
    why: str
    how: str


class AnalysisResultResponse(BaseModel):
    id: uuid.UUID
    file_name: str
    overall_score: int
    pitch_score: int
    rhythm_score: int
    tempo_score: int
    vocal_stability_score: int
    key_detected: str | None
    octave_shift: int | None
    tempo_bpm: float | None
    quality_warning: bool
    snr_db: float | None
    duration_seconds: float | None
    processing_time_seconds: float | None
    mistakes: list[MistakeOut]
    exercises: list[ExerciseOut]
    feedback_beginner: str
    feedback_musician: str
    pitch_data: list[dict]
    rhythm_data: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class WeeklyProgressOut(BaseModel):
    week_start: datetime
    avg_pitch: float
    avg_rhythm: float
    avg_tempo: float
    avg_overall: float
    analyses_count: int

    model_config = {"from_attributes": True}