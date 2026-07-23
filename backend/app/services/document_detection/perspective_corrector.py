from __future__ import annotations

import cv2
import numpy as np

from ...config import NORMALIZED_HEIGHT, NORMALIZED_WIDTH


def correct_perspective(image: np.ndarray, quad: np.ndarray) -> np.ndarray:
    width_top = np.linalg.norm(quad[1] - quad[0])
    width_bottom = np.linalg.norm(quad[2] - quad[3])
    height_left = np.linalg.norm(quad[3] - quad[0])
    height_right = np.linalg.norm(quad[2] - quad[1])
    is_portrait = max(height_left, height_right) > max(width_top, width_bottom)
    target_width, target_height = (NORMALIZED_HEIGHT, NORMALIZED_WIDTH) if is_portrait else (NORMALIZED_WIDTH, NORMALIZED_HEIGHT)
    destination = np.array(
        [[0, 0], [target_width - 1, 0], [target_width - 1, target_height - 1], [0, target_height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(quad, destination)
    return cv2.warpPerspective(image, matrix, (target_width, target_height))
