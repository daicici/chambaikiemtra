from __future__ import annotations

import cv2
import numpy as np


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1)
    rect[0] = points[np.argmin(sums)]
    rect[2] = points[np.argmax(sums)]
    rect[1] = points[np.argmin(diffs)]
    rect[3] = points[np.argmax(diffs)]
    return rect


def _quad_from_contours(contours: tuple, image_area: int) -> np.ndarray | None:
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.18:
            continue

        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4:
            return order_points(approx.reshape(4, 2).astype("float32"))

        if area > image_area * 0.42:
            box = cv2.boxPoints(cv2.minAreaRect(contour))
            return order_points(box.astype("float32"))
    return None


def _find_bright_page_quad(resized: np.ndarray) -> np.ndarray | None:
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    _, paper_mask = cv2.threshold(gray, 165, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    paper_mask = cv2.morphologyEx(paper_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    paper_mask = cv2.morphologyEx(paper_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    contours, _ = cv2.findContours(paper_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = tuple(sorted(contours, key=cv2.contourArea, reverse=True)[:8])
    return _quad_from_contours(contours, resized.shape[0] * resized.shape[1])


def find_largest_quad(image: np.ndarray) -> np.ndarray | None:
    ratio = image.shape[0] / 900.0
    resized = cv2.resize(image, (int(image.shape[1] / ratio), 900))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = tuple(sorted(contours, key=cv2.contourArea, reverse=True)[:10])

    image_area = resized.shape[0] * resized.shape[1]
    quad = _quad_from_contours(contours, image_area)
    if quad is None:
        quad = _find_bright_page_quad(resized)
    if quad is None:
        return None
    return order_points(quad * ratio)
