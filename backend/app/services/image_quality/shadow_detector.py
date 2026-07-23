import cv2
import numpy as np


def shadow_ratio(gray: np.ndarray) -> float:
    small = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA)
    return float(np.std(small) / 255.0)
