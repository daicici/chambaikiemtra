from __future__ import annotations

import base64

import cv2
import numpy as np

from ..templates.coordinate_mapper import iter_bubble_coordinates
from ..templates.template_loader import load_template


SUCCESS_COLOR = (70, 170, 55)
ERROR_COLOR = (36, 54, 214)


def _bubble_lookup(template: dict) -> dict[tuple[int, str], dict]:
    return {(int(item["question"]), str(item["choice"])): item for item in iter_bubble_coordinates(template)}


def _draw_result_marker(image: np.ndarray, bubble: dict, is_correct: bool) -> None:
    x = int(bubble["x"])
    y = int(bubble["y"])
    radius = int(bubble["radius"]) + 5
    color = SUCCESS_COLOR if is_correct else ERROR_COLOR
    cv2.circle(image, (x, y), radius, color, thickness=-1, lineType=cv2.LINE_AA)
    cv2.circle(image, (x, y), radius + 4, color, thickness=3, lineType=cv2.LINE_AA)


def _detected_choice(answer: dict) -> str | None:
    detected = answer.get("detected_answer")
    if detected in {"A", "B", "C", "D"}:
        return str(detected)

    fill_scores = answer.get("fill_scores") or {}
    if detected in {"MULTIPLE", "AMBIGUOUS"} and fill_scores:
        return str(max(fill_scores.items(), key=lambda item: float(item[1]))[0])
    return None


def build_annotated_image(aligned_sheet: np.ndarray, answers: list[dict]) -> str | None:
    template = load_template()
    bubbles = _bubble_lookup(template)
    annotated = aligned_sheet.copy()

    for answer in answers:
        detected = _detected_choice(answer)
        if detected is None:
            continue
        bubble = bubbles.get((int(answer["question"]), str(detected)))
        if bubble is None:
            continue
        _draw_result_marker(annotated, bubble, bool(answer.get("is_correct")))

    ok, buffer = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    if not ok:
        return None
    encoded = base64.b64encode(buffer).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"
