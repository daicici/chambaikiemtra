import numpy as np


def brightness(gray: np.ndarray) -> float:
    return float(np.mean(gray))


def overexposed_ratio(gray: np.ndarray) -> float:
    return float(np.mean(gray > 245))


def underexposed_ratio(gray: np.ndarray) -> float:
    return float(np.mean(gray < 25))
