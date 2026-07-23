from __future__ import annotations

import cv2
import numpy as np

from ...schemas.grading_response import ImageQuality
from .blur_detector import blur_score
from .brightness_detector import brightness, overexposed_ratio, underexposed_ratio


def validate_image_quality(image: np.ndarray) -> ImageQuality:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = image.shape[:2]
    blur = blur_score(gray)
    bright = brightness(gray)
    warnings: list[str] = []

    if width < 900 or height < 700:
        warnings.append("Ảnh có độ phân giải thấp, hãy chụp gần hơn.")
    if blur < 45:
        warnings.append("Ảnh có thể bị nhòe, hãy giữ điện thoại ổn định.")
    if bright < 45:
        warnings.append("Ảnh quá tối, hãy tăng ánh sáng.")
    if bright > 225:
        warnings.append("Ảnh quá sáng, hãy tránh phản sáng.")
    if overexposed_ratio(gray) > 0.2:
        warnings.append("Ảnh có vùng phản sáng lớn.")
    if underexposed_ratio(gray) > 0.28:
        warnings.append("Ảnh có nhiều vùng tối.")

    return ImageQuality(width=width, height=height, brightness=round(bright, 2), blur_score=round(blur, 2), warnings=warnings)
