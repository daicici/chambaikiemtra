from __future__ import annotations

import numpy as np


def crop_circle_region(image: np.ndarray, x: int, y: int, radius: int) -> np.ndarray | None:
    padding = max(2, radius)
    x1, y1 = x - padding, y - padding
    x2, y2 = x + padding, y + padding
    if x1 < 0 or y1 < 0 or x2 >= image.shape[1] or y2 >= image.shape[0]:
        return None
    return image[y1:y2, x1:x2]
