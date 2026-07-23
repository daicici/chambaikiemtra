from __future__ import annotations

import numpy as np

from ..omr.answer_classifier import adaptive_threshold
from ..omr.answer_region_extractor import crop_circle_region
from ..omr.bubble_analyzer import analyze_bubble
from ..templates.template_loader import load_template


def _column_x(column: dict | float | int) -> float:
    if isinstance(column, dict):
        return float(column["x"])
    return float(column)


def _score_digit_columns(aligned_sheet: np.ndarray, grid: dict) -> list[dict[str, float]]:
    digits = [str(digit) for digit in grid.get("digits", list("0123456789"))]
    radius = int(round(float(grid.get("radius", 8))))
    start_y = float(grid["y"])
    row_gap = float(grid["rowGap"])

    columns: list[dict[str, float]] = []
    for column in grid.get("columns", []):
        x = int(round(_column_x(column)))
        scores: dict[str, float] = {}
        for row_index, digit in enumerate(digits):
            y = int(round(start_y + row_index * row_gap))
            crop = crop_circle_region(aligned_sheet, x, y, radius)
            scores[digit] = analyze_bubble(crop)
        columns.append(scores)
    return columns


def _pick_digit(scores: dict[str, float], threshold: float, min_gap: float) -> tuple[str | None, float]:
    if not scores:
        return None, 0.0

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best_digit, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0.0
    if best_score < threshold:
        return None, best_score
    if best_score - second_score < min_gap:
        return None, best_score
    return best_digit, best_score


def recognize_exam_code(aligned_sheet: np.ndarray, fallback: str) -> tuple[str, str]:
    template = load_template()
    grid = template.get("examCodeGrid")
    if not grid:
        return fallback or "Chưa nhận diện", fallback or ""

    column_scores = _score_digit_columns(aligned_sheet, grid)
    all_scores = [score for scores in column_scores for score in scores.values()]
    threshold = max(adaptive_threshold(all_scores), float(grid.get("minFillScore", 0.12)))
    min_gap = float(grid.get("minGap", 0.04))

    detected: list[str] = []
    raw_parts: list[str] = []
    for scores in column_scores:
        digit, score = _pick_digit(scores, threshold, min_gap)
        detected.append(digit or "?")
        raw_parts.append(f"{digit or '?'}:{score:.3f}")

    raw_code = "".join(detected)
    if "?" in raw_code:
        return fallback or "Chưa nhận diện", "; ".join(raw_parts)
    return raw_code, raw_code
