from __future__ import annotations

import cv2
import numpy as np

from .confidence_calculator import confidence_from_scores


def adaptive_threshold(scores: list[float]) -> float:
    values = np.array(scores, dtype=np.float32)
    if values.size == 0 or float(values.max() - values.min()) < 0.001:
        return 0.18
    normalized = np.uint8(255 * (values - values.min()) / (values.max() - values.min()))
    threshold, _ = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return float(values.min() + (threshold / 255.0) * (values.max() - values.min()))


def classify_question(question: int, scores: dict[str, float], threshold: float) -> dict:
    if len(scores) != 4:
        return {"question": question, "detected_answer": "ERROR", "confidence": 0.0, "status": "error", "fill_scores": scores}

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best_choice, best_score = ranked[0]
    second_score = ranked[1][1]
    marked = [choice for choice, score in scores.items() if score >= threshold]
    confidence = confidence_from_scores(best_score, second_score, threshold)

    if not marked:
        answer, status = "BLANK", "blank"
    elif len(marked) > 1:
        answer, status = "MULTIPLE", "multiple"
    elif best_score - second_score < 0.055 or abs(best_score - threshold) < 0.035:
        answer, status = "AMBIGUOUS", "review"
        confidence = min(confidence, 0.55)
    else:
        answer, status = best_choice, "detected"

    return {
        "question": question,
        "detected_answer": answer,
        "confidence": confidence,
        "status": status,
        "fill_scores": scores,
    }
