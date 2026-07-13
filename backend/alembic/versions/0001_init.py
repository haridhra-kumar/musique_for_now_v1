"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-11
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("credits", sa.Integer, default=5, nullable=False),
        sa.Column("plan_type", sa.String(20), default="free", nullable=False),
        sa.Column("firebase_uid", sa.String(128), unique=True, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "analyses",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), default="processing", nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("overall_score", sa.Integer, nullable=True),
        sa.Column("pitch_score", sa.Integer, nullable=True),
        sa.Column("rhythm_score", sa.Integer, nullable=True),
        sa.Column("tempo_score", sa.Integer, nullable=True),
        sa.Column("vocal_stability_score", sa.Integer, nullable=True),
        sa.Column("key_detected", sa.String(20), nullable=True),
        sa.Column("octave_shift", sa.Integer, nullable=True),
        sa.Column("tempo_bpm", sa.Float, nullable=True),
        sa.Column("quality_warning", sa.Boolean, default=False),
        sa.Column("snr_db", sa.Float, nullable=True),
        sa.Column("duration_seconds", sa.Float, nullable=True),
        sa.Column("processing_time_seconds", sa.Float, nullable=True),
        sa.Column("result_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "timestamps",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("analysis_id", sa.Uuid, sa.ForeignKey("analyses.id"), nullable=False, index=True),
        sa.Column("time_seconds", sa.Float, nullable=False),
        sa.Column("issue_type", sa.String(20), nullable=False),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
    )

    op.create_table(
        "feedback",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("analysis_id", sa.Uuid, sa.ForeignKey("analyses.id"), unique=True, nullable=False),
        sa.Column("beginner_text", sa.Text, nullable=False),
        sa.Column("musician_text", sa.Text, nullable=False),
        sa.Column("llm_generated", sa.Boolean, default=False),
    )

    op.create_table(
        "credit_packs",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("credits", sa.Integer, nullable=False),
        sa.Column("price_inr", sa.Float, nullable=False),
        sa.Column("active", sa.Boolean, default=True),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("pack_id", sa.Uuid, sa.ForeignKey("credit_packs.id"), nullable=True),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("payment_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "weekly_progress",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("week_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("avg_pitch", sa.Float, default=0),
        sa.Column("avg_rhythm", sa.Float, default=0),
        sa.Column("avg_tempo", sa.Float, default=0),
        sa.Column("avg_overall", sa.Float, default=0),
        sa.Column("analyses_count", sa.Integer, default=0),
    )


def downgrade() -> None:
    op.drop_table("weekly_progress")
    op.drop_table("transactions")
    op.drop_table("credit_packs")
    op.drop_table("feedback")
    op.drop_table("timestamps")
    op.drop_table("analyses")
    op.drop_table("users")
