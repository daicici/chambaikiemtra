from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import FileResponse

from ...config import TEMPLATE_SOURCE_PDF_PATH
from ...services.templates.template_loader import load_template


router = APIRouter()


@router.get("/omr-40-v1")
def get_omr_template() -> dict:
    return load_template()


@router.get("/omr-40-v1/pdf")
def download_omr_template_pdf() -> FileResponse:
    return FileResponse(
        TEMPLATE_SOURCE_PDF_PATH,
        media_type="application/pdf",
        filename="40_cau.pdf",
    )
