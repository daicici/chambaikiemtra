from __future__ import annotations

import cv2
import numpy as np

from .config import Bubble, expand_bubbles, load_sheet_config
from .image_quality import normalize_brightness


def _inner_circle_mask(size: int, radius_ratio: float = 0.70) -> np.ndarray:
    mask = np.zeros((size, size), dtype=np.uint8)
    center = size // 2
    radius = int(center * radius_ratio)
    cv2.circle(mask, (center, center), radius, 255, -1)
    return mask


def _safe_crop(image: np.ndarray, bubble: Bubble) -> np.ndarray | None:
    radius = bubble.radius
    x1 = bubble.x - radius
    y1 = bubble.y - radius
    x2 = bubble.x + radius
    y2 = bubble.y + radius
    if x1 < 0 or y1 < 0 or x2 >= image.shape[1] or y2 >= image.shape[0]:
        return None
    return image[y1:y2, x1:x2]


def _ink_color_mask(crop: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    blue = cv2.inRange(hsv, (90, 35, 20), (145, 255, 220))
    purple = cv2.inRange(hsv, (130, 25, 20), (170, 255, 230))
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    dark = cv2.inRange(gray, 0, 115)
    return cv2.bitwise_or(cv2.bitwise_or(blue, purple), dark)


def _largest_component_ratio(binary: np.ndarray, mask: np.ndarray) -> float:
    masked = cv2.bitwise_and(binary, binary, mask=mask)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(masked, 8)
    if count <= 1:
        return 0.0
    largest = max(stats[index, cv2.CC_STAT_AREA] for index in range(1, count))
    return float(largest / max(1, np.count_nonzero(mask)))


def compute_bubble_score(
    aligned: np.ndarray,
    reference: np.ndarray | None,
    bubble: Bubble,
    weights: dict[str, float],
) -> tuple[float, dict[str, float]]:
    crop = _safe_crop(aligned, bubble)
    if crop is None:
        return 0.0, {"error": 1.0}

    size = crop.shape[0]
    mask = _inner_circle_mask(size)
    gray = normalize_brightness(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY))
    masked_pixels = gray[mask > 0]
    dark_ratio = float(np.mean(masked_pixels < 142))

    if reference is not None:
        reference_crop = _safe_crop(reference, bubble)
        if reference_crop is not None:
            reference_gray = normalize_brightness(cv2.cvtColor(reference_crop, cv2.COLOR_BGR2GRAY))
            diff = cv2.absdiff(gray, reference_gray)
            diff_ratio = float(np.mean(diff[mask > 0] > 28))
        else:
            diff_ratio = 0.0
    else:
        diff_ratio = 0.0

    ink_mask = _ink_color_mask(crop)
    ink_color_ratio = float(np.mean(ink_mask[mask > 0] > 0))
    largest_component_ratio = _largest_component_ratio(ink_mask, mask)

    center_mask = _inner_circle_mask(size, radius_ratio=0.38)
    center_ink_ratio = float(np.mean(ink_mask[center_mask > 0] > 0))

    contrast = float((255.0 - np.mean(masked_pixels)) / 255.0)
    features = {
        "dark_ratio": dark_ratio,
        "diff_ratio": diff_ratio,
        "ink_color_ratio": ink_color_ratio,
        "largest_component_ratio": largest_component_ratio,
        "center_ink_ratio": center_ink_ratio,
        "contrast": contrast,
    }
    score = (
        weights["dark_ratio"] * dark_ratio
        + weights["diff_ratio"] * diff_ratio
        + weights["ink_color_ratio"] * ink_color_ratio
        + weights["largest_component_ratio"] * largest_component_ratio
        + weights["center_ink_ratio"] * center_ink_ratio
    )
    return float(score), features


def adaptive_threshold(scores: list[float]) -> float:
    values = np.array(scores, dtype=np.float32)
    if values.size < 2 or float(values.max() - values.min()) < 1e-6:
        return 0.18

    normalized = np.uint8(255 * (values - values.min()) / (values.max() - values.min()))
    threshold, _ = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    otsu_value = float(values.min() + (threshold / 255.0) * (values.max() - values.min()))

    try:
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.001)
        compactness, labels, centers = cv2.kmeans(values.reshape(-1, 1), 2, None, criteria, 5, cv2.KMEANS_PP_CENTERS)
        centers = sorted(float(center[0]) for center in centers)
        kmeans_value = (centers[0] + centers[1]) / 2.0
        return float((otsu_value + kmeans_value) / 2.0)
    except cv2.error:
        return otsu_value


def recognize_answers(aligned: np.ndarray, reference: np.ndarray | None, quality_factor: float, alignment_confidence: float) -> list[dict]:
    config = load_sheet_config()
    weights = config["fill_score_weights"]
    scoring = config["scoring"]
    bubbles = expand_bubbles()
    raw_scores: dict[int, dict[str, float]] = {}
    features_by_bubble: dict[tuple[int, str], dict[str, float]] = {}

    for bubble in bubbles:
        score, features = compute_bubble_score(aligned, reference, bubble, weights)
        raw_scores.setdefault(bubble.question, {})[bubble.choice] = score
        features_by_bubble[(bubble.question, bubble.choice)] = features

    threshold = adaptive_threshold([score for choices in raw_scores.values() for score in choices.values()])
    results: list[dict] = []

    for question in range(1, int(scoring["question_count"]) + 1):
        scores = raw_scores.get(question, {})
        if len(scores) != 4:
            results.append({"question": question, "selected": "ERROR", "confidence": 0.0, "fill_scores": scores})
            continue

        ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        best_choice, best_score = ordered[0]
        second_score = ordered[1][1]
        marked = [choice for choice, score in scores.items() if score >= threshold]
        margin = best_score - second_score
        confidence = float(max(0.0, min(1.0, (margin + max(0.0, best_score - threshold)) * 2.3)))
        confidence *= max(0.2, min(1.0, quality_factor))
        confidence *= max(0.2, min(1.0, alignment_confidence))

        if len(marked) == 0:
            selected = "BLANK"
            confidence = max(0.0, min(confidence, 0.75))
        elif len(marked) > 1:
            selected = "MULTIPLE"
            confidence = max(0.0, min(confidence, 0.72))
        elif margin < scoring["ambiguous_margin"] or abs(best_score - threshold) < scoring["ambiguous_margin"] / 2:
            selected = "AMBIGUOUS"
            confidence = max(0.0, min(confidence, 0.55))
        else:
            selected = best_choice

        results.append(
            {
                "question": question,
                "selected": selected,
                "confidence": round(confidence, 3),
                "fill_scores": {choice: round(float(score), 4) for choice, score in scores.items()},
                "features": {choice: features_by_bubble.get((question, choice), {}) for choice in scores},
            }
        )
    return results
