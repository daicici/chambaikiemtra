from __future__ import annotations

import cv2
import numpy as np


def create_fingerprint(aligned_sheet: np.ndarray) -> str:
    gray = cv2.cvtColor(aligned_sheet, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (16, 16), interpolation=cv2.INTER_AREA)
    average = float(np.mean(small))
    bits = ["1" if value > average else "0" for value in small.flatten()]
    return hex(int("".join(bits), 2))[2:].zfill(64)
