from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ...schemas.export_request import ExportRequest
from ...services.excel.excel_service import build_excel_response


router = APIRouter()


@router.post("/excel")
def export_excel(payload: ExportRequest) -> StreamingResponse:
    stream = build_excel_response(payload.results)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=ket-qua-cham-bai.xlsx"},
    )
