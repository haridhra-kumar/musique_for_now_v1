"""
Central configuration for all tunable pipeline parameters.
Every threshold, weight, and magic number lives here so calibration
is a config change, not a code change.
"""

SAMPLE_RATE = 16_000  # Hz — universal rate; CREPE expects 16 kHz

# ── Audio loader ──────────────────────────────────────────────
SILENCE_TRIM_TOP_DB = 25          # dB below peak to consider silence
NOISE_REDUCE_PROP_DECREASE = 0.6  # 0 = none, 1 = full; 0.6 avoids eating quiet vocals
NOISE_REDUCE_STATIONARY = True    # True = constant-noise assumption (fan/AC)

# ── Quality check ─────────────────────────────────────────────
SNR_WARNING_THRESHOLD = 10.0  # dB — below this, flag quality_warning
NOISE_FLOOR_PERCENTILE = 10   # lowest-energy N% of frames = noise estimate

# ── Pitch detection ───────────────────────────────────────────
CREPE_MODEL_CAPACITY = "small"    # tiny | small | medium | large | full
CREPE_STEP_SIZE = 10              # ms per frame
CREPE_CONFIDENCE_THRESHOLD = 0.50 # below this = unvoiced / unreliable
PYIN_FMIN = 65.0                  # Hz — lowest expected vocal pitch (C2)
PYIN_FMAX = 1000.0                # Hz — highest expected vocal pitch (B5)
PYIN_AGREEMENT_CENTS = 30.0       # if CREPE & pYIN within this, boost confidence
OCTAVE_JUMP_CENTS = 1100.0        # detect tracker octave errors (< 1200 for tolerance)

# ── Key detection ─────────────────────────────────────────────
MIN_DURATION_FOR_KEY = 3.0  # seconds — below this, key detection unreliable

# ── Rhythm & tempo ────────────────────────────────────────────
USE_MADMOM = True                  # use madmom as secondary beat tracker
BEAT_AGREEMENT_TOLERANCE = 0.07    # seconds — within this, beats agree
TEMPO_DRIFT_WINDOW = 8            # beats — sliding window for drift detection

# ── Scoring weights ───────────────────────────────────────────
WEIGHT_PITCH = 0.50
WEIGHT_RHYTHM = 0.25
WEIGHT_TEMPO = 0.15
WEIGHT_VOCAL_STABILITY = 0.10

# ── Mistake detection ─────────────────────────────────────────
MISTAKE_MERGE_WINDOW = 0.3        # seconds — merge mistakes closer than this
PITCH_DEVIATION_MEDIUM = 30       # cents — deviation for "medium" severity
PITCH_DEVIATION_HIGH = 60         # cents — deviation for "high" severity
RHYTHM_DEVIATION_MEDIUM = 0.08    # seconds early/late for "medium"
RHYTHM_DEVIATION_HIGH = 0.15      # seconds early/late for "high"

# ── Feedback score bands ──────────────────────────────────────
SCORE_EXCELLENT = 85
SCORE_GOOD = 70
SCORE_FAIR = 55
SCORE_NEEDS_WORK = 40  # below this = "needs significant work"
