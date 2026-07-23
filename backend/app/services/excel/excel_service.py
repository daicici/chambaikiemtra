from __future__ import annotations

from io import BytesIO

from ...schemas.grading_response import GradingResponse
from .workbook_builder import build_workbook


def build_excel_response(results: list[GradingResponse]) -> BytesIO:
    return build_workbook(results)
