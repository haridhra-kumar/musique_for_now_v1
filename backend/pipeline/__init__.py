__all__ = ["analyze"]


def analyze(audio_path: str) -> dict:
    from .analyze import analyze as _analyze
    return _analyze(audio_path)
