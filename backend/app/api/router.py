from __future__ import annotations

from fastapi import APIRouter

from .routes import export, grading, health, templates


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(grading.router, prefix="/grading", tags=["grading"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
