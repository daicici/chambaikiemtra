from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import UploadFile

from ...schemas.answer_key import AnswerKeyPayload
from ...schemas.grading_response import GradingResponse, QuestionResult
from ...core.exceptions import GradingError
from ..document_detection.sheet_detector import detect_and_align_sheet
from ..duplicate_detection.duplicate_checker import is_duplicate
from ..duplicate_detection.sheet_fingerprint import create_fingerprint
from ..image_processing.image_loader import load_upload_image
from ..image_quality.quality_validator import validate_image_quality
from ..omr.omr_pipeline import recognize_40_answers
from ..student_information.information_validator import recognize_student_information
from ...temporary.cleanup import cleanup_after_scan
from .annotated_image import build_annotated_image
from .answer_comparator import attach_correct_answers
from .score_calculator import summarize_score


async def grade_uploaded_sheet(file: UploadFile, answer_key: AnswerKeyPayload) -> GradingResponse:
    image = await load_upload_image(file)
    quality = validate_image_quality(image)
    messages = list(quality.warnings)
    if quality.warnings:
        raise GradingError(" ".join(quality.warnings), status_code=422)
    aligned_sheet = detect_and_align_sheet(image)
    fingerprint = create_fingerprint(aligned_sheet)
    duplicate = is_duplicate(fingerprint)
    recognized = recognize_40_answers(aligned_sheet)
    compared = attach_correct_answers(recognized, answer_key)
    summary = summarize_score(compared, answer_key.max_score)
    student = recognize_student_information(aligned_sheet, answer_key)
    annotated_image = build_annotated_image(aligned_sheet, compared)

    status = "duplicate" if duplicate else "ok"
    if quality.warnings or summary["review_count"] > 0:
        status = "needs_review"

    cleanup_after_scan()
    return GradingResponse(
        scan_id=uuid4().hex,
        scanned_at=datetime.now(),
        fingerprint=fingerprint,
        duplicate=duplicate,
        student=student,
        image_quality=quality,
        answers=[QuestionResult(**row) for row in compared],
        max_score=answer_key.max_score,
        messages=messages,
        status=status,
        annotated_image=annotated_image,
        **summary,
    )
