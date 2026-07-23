from __future__ import annotations

import cv2
import numpy as np

from .config import expand_bubbles, field_regions


def annotate_sheet(aligned: np.ndarray, recognitions: list[dict]) -> np.ndarray:
    output = aligned.copy()
    for x, y, w, h in field_regions().values():
        cv2.rectangle(output, (x, y), (x + w, y + h), (255, 170, 0), 3)

    bubbles_by_question = {(bubble.question, bubble.choice): bubble for bubble in expand_bubbles()}
    for item in recognitions:
        selected = item["selected"]
        if selected not in {"A", "B", "C", "D"}:
            color = (0, 165, 255) if selected in {"AMBIGUOUS", "MULTIPLE"} else (0, 0, 255)
            for choice in ("A", "B", "C", "D"):
                bubble = bubbles_by_question[(item["question"], choice)]
                cv2.circle(output, (bubble.x, bubble.y), bubble.radius + 5, color, 2)
            continue

        bubble = bubbles_by_question[(item["question"], selected)]
        color = (0, 190, 0) if item["confidence"] >= 0.58 else (0, 165, 255)
        cv2.circle(output, (bubble.x, bubble.y), bubble.radius + 6, color, 3)
        cv2.putText(output, str(item["question"]), (bubble.x - 13, bubble.y - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.48, color, 2)
    return output
