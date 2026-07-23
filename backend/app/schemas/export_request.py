from __future__ import annotations

from pydantic import BaseModel

from .grading_response import GradingResponse


class ExportRequest(BaseModel):
    results: list[GradingResponse]
