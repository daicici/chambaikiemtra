from __future__ import annotations

_SEEN_FINGERPRINTS: set[str] = set()


def is_duplicate(fingerprint: str) -> bool:
    if fingerprint in _SEEN_FINGERPRINTS:
        return True
    _SEEN_FINGERPRINTS.add(fingerprint)
    return False
