from __future__ import annotations

from fastapi import APIRouter

from ...services.templates.template_loader import load_template


router = APIRouter()


@router.get("/omr-40-v1")
def get_omr_template() -> dict:
    return load_template()
