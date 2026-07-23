from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AnswerChoice = Literal["A", "B", "C", "D"]
AnswerState = Literal["A", "B", "C", "D", "BLANK", "MULTIPLE", "AMBIGUOUS", "ERROR"]
SheetStatus = Literal["OK", "NEEDS_REVIEW", "RECAPTURE", "NO_ANSWER_KEY"]


class AnswerKeyIn(BaseModel):
    subject: str
    exam_code: str
    answers: list[AnswerChoice] = Field(min_length=40, max_length=40)


class FieldOcrResult(BaseModel):
    raw: str = ""
    normalized: str = ""
    confidence: float = 0.0
    needs_review: bool = True


class QuestionRecognition(BaseModel):
    question: int
    selected: AnswerState
    correct_answer: AnswerChoice | None = None
    is_correct: bool | None = None
    confidence: float
    fill_scores: dict[str, float]


class ScanResult(BaseModel):
    id: int | None = None
    scanned_at: datetime
    student_name: FieldOcrResult
    subject: FieldOcrResult
    class_name: FieldOcrResult
    exam_code: FieldOcrResult
    answers: list[QuestionRecognition]
    correct_count: int
    wrong_count: int
    blank_count: int
    multiple_count: int
    review_count: int
    score: float
    status: SheetStatus
    image_path: str | None = None
    annotated_image_path: str | None = None
    messages: list[str] = Field(default_factory=list)


class QualityReport(BaseModel):
    ok: bool
    width: int
    height: int
    brightness: float
    blur_score: float
    overexposed_ratio: float
    underexposed_ratio: float
    messages: list[str] = Field(default_factory=list)
