from __future__ import annotations

import cv2
import numpy as np

from .config import load_sheet_config
from .schemas import QualityReport


def assess_image_quality(image: np.ndarray) -> QualityReport:
    config = load_sheet_config()["quality"]
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    overexposed_ratio = float(np.mean(gray > 245))
    underexposed_ratio = float(np.mean(gray < 25))

    messages: list[str] = []
    if width < config["min_width"] or height < config["min_height"]:
        messages.append("Anh co do phan giai thap, vui long chup lai gan hon va ro hon.")
    if blur_score < config["min_blur_score"]:
        messages.append("Anh bi nhoe, vui long giu camera on dinh va chup lai.")
    if brightness < config["min_brightness"]:
        messages.append("Anh qua toi, vui long tang anh sang.")
    if brightness > config["max_brightness"]:
        messages.append("Anh qua sang, vui long tranh anh sang gat.")
    if overexposed_ratio > config["max_overexposed_ratio"]:
        messages.append("Anh co vung phan sang lon, vui long doi goc chup.")
    if underexposed_ratio > config["max_underexposed_ratio"]:
        messages.append("Anh co qua nhieu vung toi, vui long chup lai.")

    return QualityReport(
        ok=len(messages) == 0,
        width=width,
        height=height,
        brightness=brightness,
        blur_score=blur_score,
        overexposed_ratio=overexposed_ratio,
        underexposed_ratio=underexposed_ratio,
        messages=messages,
    )


def normalize_brightness(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)
