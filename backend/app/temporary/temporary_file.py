from pathlib import Path


def temporary_path(name: str) -> Path:
    return Path(__file__).resolve().parent / "tmp" / name
