"""
Celery task that runs the audio analysis pipeline and stores results.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from .celery_app import celery_app
from app.config import get_settings
from app.models.analysis import Analysis, AnalysisTimestamp, AnalysisFeedback

logger = logging.getLogger("audiocoach.task")
settings = get_settings()

sync_url = settings.database_url.replace("+asyncpg", "").replace("postgresql://", "postgresql+psycopg2://")
if "+asyncpg" not in settings.database_url and "postgresql://" in settings.database_url:
    sync_url = settings.database_url.replace("postgresql://", "postgresql+psycopg2://")

sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(bind=sync_engine)


@celery_app.task(name="tasks.analyze_task.run_analysis", bind=True, max_retries=2)
def run_analysis(self, analysis_id: str, storage_key: str) -> dict:
    from app.services.storage import get_file_path
    from pipeline.analyze import analyze

    session = SyncSession()
    try:
        analysis = session.execute(
            select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
        ).scalar_one()

        import asyncio
        file_path = asyncio.run(get_file_path(storage_key))

        logger.info("Running pipeline on %s", file_path)
        result = analyze(file_path)

        analysis.status = "completed"
        analysis.overall_score = result["overall_score"]
        analysis.pitch_score = result["pitch_score"]
        analysis.rhythm_score = result["rhythm_score"]
        analysis.tempo_score = result["tempo_score"]
        analysis.vocal_stability_score = result.get("vocal_stability_score", 0)
        analysis.key_detected = result.get("key_detected")
        analysis.octave_shift = result.get("octave_shift", 0)
        analysis.tempo_bpm = result.get("tempo_bpm")
        analysis.quality_warning = result.get("quality_warning", False)
        analysis.snr_db = result.get("snr_db")
        analysis.duration_seconds = result.get("duration_seconds")
        analysis.processing_time_seconds = result.get("processing_time_seconds")
        analysis.result_json = result

        for m in result.get("mistakes", []):
            session.add(AnalysisTimestamp(
                analysis_id=analysis.id,
                time_seconds=m["time_seconds"],
                issue_type=m["type"],
                severity=m["severity"],
                description=m["description"],
            ))

        session.add(AnalysisFeedback(
            analysis_id=analysis.id,
            beginner_text=result.get("feedback_beginner", ""),
            musician_text=result.get("feedback_musician", ""),
        ))

        session.commit()
        logger.info("Analysis %s completed: score=%d", analysis_id, result["overall_score"])
        return {"status": "completed", "score": result["overall_score"]}

    except Exception as e:
        logger.exception("Analysis %s failed", analysis_id)
        try:
            analysis = session.execute(
                select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
            ).scalar_one()
            analysis.status = "failed"
            analysis.error_message = str(e)[:500]
            session.commit()
        except Exception:
            session.rollback()
        raise self.retry(exc=e, countdown=30)
    finally:
        session.close()
