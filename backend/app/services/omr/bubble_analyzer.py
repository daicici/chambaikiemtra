from __future__ import annotations

import cv2
import numpy as np


def inner_mask(size: int) -> np.ndarray:
    mask = np.zeros((size, size), dtype=np.uint8)
    cv2.circle(mask, (size // 2, size // 2), int(size * 0.34), 255, -1)
    return mask


def ink_mask(crop: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    dark = cv2.inRange(gray, 0, 135)
    blue = cv2.inRange(hsv, (85, 30, 20), (145, 255, 230))
    purple = cv2.inRange(hsv, (125, 25, 20), (172, 255, 230))
    return cv2.bitwise_or(dark, cv2.bitwise_or(blue, purple))


def analyze_bubble(crop: np.ndarray | None) -> float:
    if crop is None:
        return 0.0
    size = min(crop.shape[:2])
    crop = cv2.resize(crop, (size, size))
    mask = inner_mask(size)
    marked = ink_mask(crop)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    inside = mask > 0
    dark_ratio = float(np.mean(gray[inside] < 150))
    ink_ratio = float(np.mean(marked[inside] > 0))
    contrast = float((255 - np.mean(gray[inside])) / 255)
    return round((dark_ratio * 0.45) + (ink_ratio * 0.4) + (contrast * 0.15), 4)
