import numpy as np


def recognize_exam_code(_: np.ndarray, fallback: str) -> tuple[str, str]:
    return fallback or "Chưa nhận diện", fallback or ""
