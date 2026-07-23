from __future__ import annotations

from threading import Lock

import cv2
import numpy as np
from fastapi import UploadFile

from ...config import MAX_IMAGE_BYTES
from ...core.exceptions import GradingError


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PDF_RENDER_LOCK = Lock()


def _filename(file: UploadFile) -> str:
    return (file.filename or "").lower()


def _has_extension(file: UploadFile, extensions: set[str]) -> bool:
    filename = _filename(file)
    return any(filename.endswith(extension) for extension in extensions)


def _is_pdf_upload(file: UploadFile, content: bytes) -> bool:
    content_type = (file.content_type or "").lower()
    return content_type in ALLOWED_PDF_CONTENT_TYPES or _filename(file).endswith(".pdf") or content.startswith(b"%PDF")


def _is_image_upload(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    return content_type in ALLOWED_IMAGE_CONTENT_TYPES or _has_extension(file, ALLOWED_IMAGE_EXTENSIONS)


def _decode_image(content: bytes) -> np.ndarray:
    array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise GradingError("Không đọc được ảnh. Vui lòng dùng file JPG, PNG, WEBP hoặc PDF rõ nét.", status_code=400)
    return image


def _decode_pdf_first_page(content: bytes) -> np.ndarray:
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:
        raise GradingError("Backend chưa cài thư viện đọc PDF. Vui lòng cài pypdfium2 rồi deploy lại.", status_code=500) from exc

    pdf = None
    page = None
    bitmap = None
    try:
        with PDF_RENDER_LOCK:
            pdf = pdfium.PdfDocument(content)
            if len(pdf) < 1:
                raise GradingError("File PDF không có trang nào.", status_code=400)

            page = pdf[0]
            bitmap = page.render(scale=3, rotation=0, fill_color=(255, 255, 255, 255))
            image = np.asarray(bitmap.to_numpy()).copy()

        if image.ndim == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
        elif image.shape[2] != 3:
            raise GradingError("Không đọc được màu ảnh từ PDF.", status_code=400)

        return image
    except GradingError:
        raise
    except Exception as exc:
        raise GradingError("Không đọc được PDF. Vui lòng dùng PDF một trang hoặc ảnh chụp phiếu rõ nét.", status_code=400) from exc
    finally:
        for resource in (bitmap, page, pdf):
            if resource is not None and hasattr(resource, "close"):
                resource.close()


async def load_upload_image(file: UploadFile) -> np.ndarray:
    content = await file.read()
    if not content:
        raise GradingError("File tải lên rỗng.", status_code=400)
    if len(content) > MAX_IMAGE_BYTES:
        raise GradingError("File quá lớn, vui lòng dùng file dưới 8MB.", status_code=413)

    if _is_pdf_upload(file, content):
        return _decode_pdf_first_page(content)
    if _is_image_upload(file):
        return _decode_image(content)

    raise GradingError("File phải là ảnh JPG, PNG, WEBP hoặc PDF.", status_code=400)
