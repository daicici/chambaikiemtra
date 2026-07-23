from __future__ import annotations

import cv2
import numpy as np
from fastapi import UploadFile

from ...config import MAX_IMAGE_BYTES
from ...core.exceptions import GradingError


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def load_upload_image(file: UploadFile) -> np.ndarray:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise GradingError("File phải là ảnh JPG, PNG hoặc WEBP.", status_code=400)

    content = await file.read()
    if not content:
        raise GradingError("File ảnh rỗng.", status_code=400)
    if len(content) > MAX_IMAGE_BYTES:
        raise GradingError("Ảnh quá lớn, vui lòng dùng ảnh dưới 8MB.", status_code=413)

    array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise GradingError("Không đọc được ảnh.", status_code=400)
    return image
