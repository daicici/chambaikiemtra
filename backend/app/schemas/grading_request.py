from __future__ import annotations

from pydantic import BaseModel

from .answer_key import AnswerKeyPayload


class GradingRequest(BaseModel):
    answer_key: AnswerKeyPayload
