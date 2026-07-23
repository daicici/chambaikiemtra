from __future__ import annotations

import cv2
import numpy as np

from ...core.exceptions import GradingError
from .contour_detector import find_largest_quad
from .orientation_detector import normalize_orientation
from .perspective_corrector import correct_perspective


def detect_and_align_sheet(image: np.ndarray) -> np.ndarray:
    quad = find_largest_quad(image)
    if quad is None:
        raise GradingError("Không phát hiện đủ bốn cạnh phiếu. Vui lòng chụp lại toàn bộ tờ giấy.")
    warped = correct_perspective(image, quad)
    return normalize_orientation(warped)
