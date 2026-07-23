from __future__ import annotations

import cv2
import numpy as np
from rapidfuzz import fuzz, process

from .config import field_regions
from .grading import normalize_class_name, normalize_exam_code
from .schemas import FieldOcrResult


VALID_SUBJECTS = ["Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý"]


def crop_field(aligned: np.ndarray, field_name: str) -> np.ndarray:
    x, y, w, h = field_regions()[field_name]
    return aligned[y : y + h, x : x + w]


def preprocess_handwriting_region(crop: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    enlarged = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    return cv2.equalizeHist(enlarged)


def normalize_text(value: str) -> str:
    return " ".join(value.replace("|", " ").strip().split())


def match_student_name(raw: str, roster: list[str] | None) -> FieldOcrResult:
    normalized = normalize_text(raw)
    if not roster or not normalized:
        return FieldOcrResult(raw=raw, normalized=normalized, confidence=0.0, needs_review=True)

    match = process.extractOne(normalized, roster, scorer=fuzz.WRatio)
    if match and match[1] >= 90:
        return FieldOcrResult(raw=raw, normalized=match[0], confidence=match[1] / 100.0, needs_review=False)
    return FieldOcrResult(raw=raw, normalized=normalized, confidence=(match[1] / 100.0 if match else 0.0), needs_review=True)


def match_subject(raw: str) -> FieldOcrResult:
    normalized = normalize_text(raw)
    match = process.extractOne(normalized, VALID_SUBJECTS, scorer=fuzz.WRatio) if normalized else None
    if match and match[1] >= 82:
        return FieldOcrResult(raw=raw, normalized=match[0], confidence=match[1] / 100.0, needs_review=False)
    return FieldOcrResult(raw=raw, normalized=normalized, confidence=(match[1] / 100.0 if match else 0.0), needs_review=True)


def recognize_fields_stub(
    aligned: np.ndarray,
    provided_name: str | None,
    provided_subject: str | None,
    provided_class_name: str | None,
    provided_exam_code: str | None,
) -> tuple[FieldOcrResult, FieldOcrResult, FieldOcrResult, FieldOcrResult]:
    # OCR handwriting should be connected to Google Cloud Vision or Azure Read here.
    # The crops are prepared now so the integration point is isolated from OMR.
    for field_name in ("student_name", "subject", "class_name", "exam_code"):
        _ = preprocess_handwriting_region(crop_field(aligned, field_name))

    student_name = FieldOcrResult(raw=provided_name or "", normalized=normalize_text(provided_name or ""), confidence=1.0 if provided_name else 0.0, needs_review=not bool(provided_name))
    subject = match_subject(provided_subject or "")
    class_name = FieldOcrResult(raw=provided_class_name or "", normalized=normalize_class_name(provided_class_name or ""), confidence=1.0 if provided_class_name else 0.0, needs_review=not bool(provided_class_name))
    exam_code = FieldOcrResult(raw=provided_exam_code or "", normalized=normalize_exam_code(provided_exam_code or ""), confidence=1.0 if provided_exam_code else 0.0, needs_review=not bool(provided_exam_code))
    return student_name, subject, class_name, exam_code
