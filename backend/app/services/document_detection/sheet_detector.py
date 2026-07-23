from __future__ import annotations

import cv2
import numpy as np

from ...core.exceptions import GradingError
from .contour_detector import find_largest_quad
from .marker_detector import find_marker_quad
from .orientation_detector import normalize_orientation
from .perspective_corrector import correct_perspective, correct_perspective_from_markers


def detect_and_align_sheet(image: np.ndarray) -> np.ndarray:
    marker_quad = find_marker_quad(image)
    if marker_quad is not None:
        warped = correct_perspective_from_markers(image, marker_quad)
        return normalize_orientation(warped)

    quad = find_largest_quad(image)
    if quad is None:
        raise GradingError("Không phát hiện đủ bốn marker hoặc bốn cạnh phiếu. Vui lòng chụp lại toàn bộ tờ giấy.")
    warped = correct_perspective(image, quad)
    return normalize_orientation(warped)
