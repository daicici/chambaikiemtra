from __future__ import annotations

import cv2
import numpy as np

from ...config import NORMALIZED_HEIGHT, NORMALIZED_WIDTH
from ..templates.coordinate_mapper import iter_bubble_coordinates
from ..templates.template_loader import load_template


def _fit_to_normalized_size(image: np.ndarray) -> np.ndarray:
    return cv2.resize(image, (NORMALIZED_WIDTH, NORMALIZED_HEIGHT), interpolation=cv2.INTER_AREA)


def _bubble_alignment_score(image: np.ndarray) -> float:
    template = load_template()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    scores: list[float] = []
    for bubble in iter_bubble_coordinates(template):
        x = int(round(float(bubble["x"])))
        y = int(round(float(bubble["y"])))
        radius = int(round(float(bubble["radius"])))
        padding = radius + 4
        if x - padding < 0 or y - padding < 0 or x + padding >= gray.shape[1] or y + padding >= gray.shape[0]:
            continue

        crop = gray[y - padding : y + padding + 1, x - padding : x + padding + 1]
        size = crop.shape[0]
        yy, xx = np.ogrid[:size, :size]
        center = size // 2
        distance = np.sqrt((xx - center) ** 2 + (yy - center) ** 2)
        ring = (distance >= radius * 0.72) & (distance <= radius * 1.32)
        if not np.any(ring):
            continue
        scores.append(float(np.mean(crop[ring] < 175)))
    return float(np.mean(scores)) if scores else 0.0


def normalize_orientation(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    if width < height:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

    base = _fit_to_normalized_size(image)
    candidates = [
        base,
        cv2.rotate(base, cv2.ROTATE_180),
        _fit_to_normalized_size(cv2.rotate(base, cv2.ROTATE_90_CLOCKWISE)),
        _fit_to_normalized_size(cv2.rotate(base, cv2.ROTATE_90_COUNTERCLOCKWISE)),
    ]
    return max(candidates, key=_bubble_alignment_score)
