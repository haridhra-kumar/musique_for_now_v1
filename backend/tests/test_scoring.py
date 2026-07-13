"""Unit tests for the scoring engine with synthetic inputs."""

from pipeline.scoring import overall_score, score_pitch, score_rhythm, score_vocal_stability


def _make_frames(n: int, confidence: float = 0.9, cents: float = 5.0) -> list[dict]:
    return [
        {"time": i * 0.01, "freq": 440.0, "confidence": confidence,
         "cents_deviation": cents, "nearest_note": "A4", "is_voiced": True}
        for i in range(n)
    ]


def test_perfect_pitch():
    frames = _make_frames(100, confidence=0.95, cents=3.0)
    assert score_pitch(frames) >= 95


def test_terrible_pitch():
    frames = _make_frames(100, confidence=0.9, cents=90.0)
    assert score_pitch(frames) <= 15


def test_mixed_pitch():
    good = _make_frames(70, confidence=0.9, cents=10.0)
    bad = _make_frames(30, confidence=0.9, cents=70.0)
    assert 30 < score_pitch(good + bad) < 80


def test_empty_frames():
    assert score_pitch([]) == 0


def test_unvoiced_frames_ignored():
    frames = [{"time": 0, "freq": 0, "confidence": 0.2,
               "cents_deviation": 0, "nearest_note": "", "is_voiced": False}] * 50
    assert score_pitch(frames) == 0


def test_rhythm_score_regular_beats():
    beats = [i * 0.5 for i in range(20)]  # perfectly regular
    assert score_rhythm({"beat_times": beats, "rhythm_score": None}) >= 90


def test_rhythm_score_irregular_beats():
    import random
    random.seed(42)
    beats = sorted([random.uniform(0, 10) for _ in range(20)])
    score = score_rhythm({"beat_times": beats})
    assert 0 <= score <= 100


def test_overall_score_range():
    s = overall_score(80, 70, 90, 75)
    assert 0 <= s <= 100


def test_overall_score_weighted():
    s = overall_score(100, 100, 100, 100)
    assert s == 100

    s2 = overall_score(0, 0, 0, 0)
    assert s2 == 0


def test_vocal_stability_steady():
    frames = _make_frames(100, confidence=0.9, cents=2.0)
    assert score_vocal_stability(frames) >= 70
