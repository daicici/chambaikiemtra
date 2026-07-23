from __future__ import annotations

import cv2
import numpy as np

from .contour_detector import order_points


def _dark_square_candidates(image: np.ndarray) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    dark_mask = cv2.inRange(blurred, 0, 75)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = image.shape[0] * image.shape[1]
    candidates: list[dict] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.00012 or area > image_area * 0.018:
            continue

        x, y, width, height = cv2.boundingRect(contour)
        if not width or not height:
            continue
        ratio = width / height
        fill_ratio = area / float(width * height)
        if ratio < 0.65 or ratio > 1.55 or fill_ratio < 0.55:
            continue

        candidates.append(
            {
                "x": x + width / 2,
                "y": y + height / 2,
                "area": area,
                "rect": (x, y, width, height),
            }
        )
    return candidates


def find_marker_quad(image: np.ndarray) -> np.ndarray | None:
    candidates = _dark_square_candidates(image)
    if len(candidates) < 4:
        return None

    width = image.shape[1]
    height = image.shape[0]
    corners = [
        ("top_left", np.array([0.0, 0.0])),
        ("top_right", np.array([float(width), 0.0])),
        ("bottom_right", np.array([float(width), float(height)])),
        ("bottom_left", np.array([0.0, float(height)])),
    ]

    selected: list[np.ndarray] = []
    used_indexes: set[int] = set()
    for _, corner in corners:
        ranked = sorted(
            enumerate(candidates),
            key=lambda item: np.linalg.norm(np.array([item[1]["x"], item[1]["y"]]) - corner),
        )
        for index, candidate in ranked:
            if index in used_indexes:
                continue
            used_indexes.add(index)
            selected.append(np.array([candidate["x"], candidate["y"]], dtype="float32"))
            break

    if len(selected) != 4:
        return None

    quad = order_points(np.array(selected, dtype="float32"))
    marker_width = max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3]))
    marker_height = max(np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1]))
    if marker_width < width * 0.45 or marker_height < height * 0.45:
        return None
    return quad


def marker_confidence(image: np.ndarray) -> float:
    return 1.0 if find_marker_quad(image) is not None else 0.0
