from __future__ import annotations

from pydantic import BaseModel, Field

from .common import AnswerChoice


class AnswerKeyPayload(BaseModel):
    subject: str = "Chưa xác định"
    exam_code: str = "000"
    answers: list[AnswerChoice] = Field(min_length=40, max_length=40)
    max_score: float = 10.0
