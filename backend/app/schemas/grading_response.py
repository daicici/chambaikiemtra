from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel

from .common import AnswerChoice, DetectedAnswer, SheetStatus
from .student_result import StudentInformation


class QuestionResult(BaseModel):
    question: int
    detected_answer: DetectedAnswer
    correct_answer: AnswerChoice
    is_correct: bool
    confidence: float
    status: str
    fill_scores: dict[str, float]


class ImageQuality(BaseModel):
    width: int
    height: int
    brightness: float
    blur_score: float
    warnings: list[str]


class GradingResponse(BaseModel):
    scan_id: str
    scanned_at: datetime
    fingerprint: str
    duplicate: bool
    student: StudentInformation
    image_quality: ImageQuality
    answers: list[QuestionResult]
    correct_count: int
    wrong_count: int
    blank_count: int
    multiple_count: int
    review_count: int
    score: float
    max_score: float
    status: SheetStatus
    messages: list[str]
