"""NumPy 1.x / 2.0+ cross-compatibility patch for audio and signal libraries."""
import warnings

import numpy as np

# 1. Provide legacy NumPy 1.x aliases removed in NumPy 2.0+
with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=FutureWarning)
    for _name, _target in [
        ("long", int),
        ("ulong", int),
        ("longlong", int),
        ("ulonglong", int),
        ("int", int),
        ("float", float),
        ("complex", complex),
        ("bool", bool),
        ("object", object),
        ("str", str),
        ("unicode", str),
        ("bytes", bytes),
    ]:
        try:
            if not hasattr(np, _name):
                setattr(np, _name, _target)
        except Exception:
            setattr(np, _name, _target)

# 2. Provide NumPy 2.0 exceptions module for SciPy 1.15+ running on NumPy 1.x
try:
    import numpy.exceptions as _npe
    if not hasattr(_npe, "RankWarning"):
        _npe.RankWarning = getattr(np, "RankWarning", UserWarning)
except Exception:
    pass

# 3. Allow copy=None in np.array for SciPy 1.15+ running on NumPy 1.x
_orig_array = np.array


def _compat_array(*args, **kwargs):
    if kwargs.get("copy") is None:
        kwargs["copy"] = False
    return _orig_array(*args, **kwargs)


np.array = _compat_array
warnings.filterwarnings("ignore", category=FutureWarning, module="numpy")
warnings.filterwarnings("ignore", category=UserWarning, message=".*NumPy version.*")
