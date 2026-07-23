from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .exceptions import GradingError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(GradingError)
    async def handle_grading_error(_: Request, exc: GradingError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"ok": False, "message": exc.message})
