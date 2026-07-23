from __future__ import annotations

import cv2
import numpy as np

from ...config import NORMALIZED_HEIGHT, NORMALIZED_WIDTH


def normalize_orientation(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    if width < height:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    return cv2.resize(image, (NORMALIZED_WIDTH, NORMALIZED_HEIGHT), interpolation=cv2.INTER_AREA)
