from __future__ import annotations

import numpy as np

from ..templates.coordinate_mapper import iter_bubble_coordinates
from .answer_region_extractor import crop_circle_region
from .bubble_analyzer import analyze_bubble


def score_all_bubbles(aligned_sheet: np.ndarray, template: dict) -> dict[int, dict[str, float]]:
    scores: dict[int, dict[str, float]] = {}
    for bubble in iter_bubble_coordinates(template):
        crop = crop_circle_region(aligned_sheet, int(bubble["x"]), int(bubble["y"]), int(bubble["radius"]))
        score = analyze_bubble(crop)
        scores.setdefault(int(bubble["question"]), {})[str(bubble["choice"])] = score
    return scores
