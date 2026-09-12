"""
Celery task that runs the audio analysis pipeline and stores results.
"""
from __future__ import annotations

import logging
import os
import re
import time
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import pipeline.numpy_compat  # noqa: F401
from app.config import get_settings
from app.models.analysis import Analysis, AnalysisFeedback, AnalysisTimestamp

from .celery_app import celery_app

logger = logging.getLogger("audiocoach.task")
settings = get_settings()

sync_url = settings.database_url.replace("+asyncpg", "").replace("postgresql://", "postgresql+psycopg2://")
if sync_url.startswith("postgres://"):
    sync_url = sync_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif "+asyncpg" not in settings.database_url and "postgresql://" in settings.database_url:
    sync_url = settings.database_url.replace("postgresql://", "postgresql+psycopg2://")
if sync_url.startswith("sqlite+aiosqlite://"):
    sync_url = sync_url.replace("sqlite+aiosqlite://", "sqlite://")
if "postgresql" in sync_url:
    sync_url = re.sub(r"([?&])ssl=([^&]+)", r"\1sslmode=\2", sync_url)

sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(bind=sync_engine)


def to_native(obj):
    """Recursively convert numpy scalars/arrays to plain Python types so the
    result dict can be JSON-serialized by the DB driver."""
    import numpy as np

    if isinstance(obj, dict):
        return {k: to_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_native(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return [to_native(v) for v in obj.tolist()]
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    return obj


def process_analysis(analysis_id: str, storage_key: str) -> dict:
    """Core analysis execution used by both Celery and FastAPI BackgroundTasks."""
    from app.services.storage import get_file_path_info
    from pipeline import analyze

    session = SyncSession()
    file_path = None
    is_temp = False

    try:
        analysis = None
        for _ in range(5):
            analysis = session.execute(
                select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
            ).scalar_one_or_none()
            if analysis:
                break
            time.sleep(0.5)

        if not analysis:
            raise ValueError(f"Analysis record {analysis_id} not found in database")

        import asyncio
        file_path, is_temp = asyncio.run(get_file_path_info(storage_key))

        logger.info("Running pipeline on %s", file_path)
        result = to_native(analyze(file_path))

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
        logger.exception("Analysis %s failed: %s", analysis_id, e)
        try:
            session.rollback()
        except Exception:
            pass

        try:
            with SyncSession() as err_session:
                err_analysis = err_session.execute(
                    select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
                ).scalar_one_or_none()
                if err_analysis:
                    err_analysis.status = "failed"
                    err_analysis.error_message = str(e)[:500]
                    err_session.commit()
                    logger.info("Updated analysis %s to failed: %s", analysis_id, err_analysis.error_message)
        except Exception as save_err:
            logger.exception("Failed to save error status for analysis %s: %s", analysis_id, save_err)
        raise
    finally:
        session.close()
        if is_temp and file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass


@celery_app.task(name="tasks.analyze_task.run_analysis", bind=True, max_retries=2)
def run_analysis(self, analysis_id: str, storage_key: str) -> dict:
    try:
        return process_analysis(analysis_id, storage_key)
    except Exception as e:
        recoverable = isinstance(e, (ConnectionError, TimeoutError))
        try:
            from psycopg2 import OperationalError as PsycopgOperationalError
            if isinstance(e, PsycopgOperationalError):
                recoverable = True
        except ImportError:
            pass

        if recoverable and self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=15)
        raise


def run_analysis_background(analysis_id: str, storage_key: str) -> dict:
    """Direct execution for FastAPI BackgroundTasks when Celery is not available."""
    try:
        return process_analysis(analysis_id, storage_key)
    except Exception as e:
        logger.error("Background task analysis %s failed: %s", analysis_id, e)
        return {"status": "failed", "error": str(e)}

