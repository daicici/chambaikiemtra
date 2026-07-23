from __future__ import annotations

import cv2
import numpy as np


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    point_sum = points.sum(axis=1)
    point_diff = np.diff(points, axis=1)
    rect[0] = points[np.argmin(point_sum)]
    rect[2] = points[np.argmax(point_sum)]
    rect[1] = points[np.argmin(point_diff)]
    rect[3] = points[np.argmax(point_diff)]
    return rect


def detect_paper_contour(image: np.ndarray) -> np.ndarray | None:
    ratio = image.shape[0] / 900.0
    resized = cv2.resize(image, (int(image.shape[1] / ratio), 900))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 50, 160)
    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:8]

    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        area = cv2.contourArea(approx)
        if len(approx) != 4 or area < resized.shape[0] * resized.shape[1] * 0.18:
            continue

        points = approx.reshape(4, 2).astype("float32") * ratio
        rect = order_points(points)
        width_top = np.linalg.norm(rect[1] - rect[0])
        width_bottom = np.linalg.norm(rect[2] - rect[3])
        height_left = np.linalg.norm(rect[3] - rect[0])
        height_right = np.linalg.norm(rect[2] - rect[1])
        aspect = max(width_top, width_bottom) / max(height_left, height_right)
        if 1.15 <= aspect <= 1.65 or 0.62 <= aspect <= 0.88:
            return rect
    return None


def warp_paper(image: np.ndarray, target_width: int, target_height: int) -> tuple[np.ndarray | None, float]:
    contour = detect_paper_contour(image)
    if contour is None:
        return None, 0.0

    width_top = np.linalg.norm(contour[1] - contour[0])
    width_bottom = np.linalg.norm(contour[2] - contour[3])
    height_left = np.linalg.norm(contour[3] - contour[0])
    height_right = np.linalg.norm(contour[2] - contour[1])
    source_width = max(width_top, width_bottom)
    source_height = max(height_left, height_right)
    output_width, output_height = (target_height, target_width) if source_width < source_height else (target_width, target_height)
    destination = np.array(
        [[0, 0], [output_width - 1, 0], [output_width - 1, output_height - 1], [0, output_height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(contour, destination)
    warped = cv2.warpPerspective(image, matrix, (output_width, output_height))
    confidence = min(1.0, cv2.contourArea(contour.astype("float32")) / float(image.shape[0] * image.shape[1]))
    return warped, confidence
