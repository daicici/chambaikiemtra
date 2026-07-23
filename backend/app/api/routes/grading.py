from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ...schemas.answer_key import AnswerKeyPayload
from ...schemas.grading_response import GradingResponse
from ...services.grading.grading_service import grade_uploaded_sheet


router = APIRouter()


@router.post("/scan", response_model=GradingResponse)
async def scan_sheet(image: UploadFile = File(...), answer_key: str = Form(...)) -> GradingResponse:
    try:
        payload = AnswerKeyPayload.model_validate(json.loads(answer_key))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Dap an chuan khong hop le.") from exc
    return await grade_uploaded_sheet(image, payload)
