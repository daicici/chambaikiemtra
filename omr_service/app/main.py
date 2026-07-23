from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .alignment import align_to_reference, auto_rotate, load_reference_image
from .annotation import annotate_sheet
from .config import load_sheet_config, target_size
from .excel import export_results_to_excel
from .grading import grade_recognitions
from .image_quality import assess_image_quality
from .ocr import recognize_fields_stub
from .omr import recognize_answers
from .paper_detection import warp_paper
from .schemas import AnswerKeyIn, ScanResult
from .storage import ensure_storage, list_scan_results, load_answer_key, save_answer_key, save_scan_result, storage_path


app = FastAPI(title="Cham Bai Kiem Tra OMR Service", version="0.1.0")
allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    ensure_storage()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "omr"}


@app.post("/answer-keys")
def upsert_answer_key(answer_key: AnswerKeyIn) -> dict:
    save_answer_key(answer_key)
    return {"ok": True, "subject": answer_key.subject, "exam_code": answer_key.exam_code, "count": len(answer_key.answers)}


@app.post("/scan", response_model=ScanResult)
async def scan_sheet(
    file: UploadFile = File(...),
    student_name: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    class_name: str | None = Form(default=None),
    exam_code: str | None = Form(default=None),
) -> ScanResult:
    content = await file.read()
    image_array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Khong doc duoc anh phieu.")

    quality = assess_image_quality(image)
    if not quality.ok:
        raise HTTPException(status_code=422, detail={"status": "RECAPTURE", "quality": quality.model_dump()})

    width, height = target_size()
    warped, paper_confidence = warp_paper(image, width, height)
    if warped is None:
        raise HTTPException(status_code=422, detail={"status": "RECAPTURE", "messages": ["Khong nhin thay du bon canh cua phieu."]})

    rotated = auto_rotate(warped)
    reference = load_reference_image()
    aligned, alignment_confidence = align_to_reference(rotated, reference)

    quality_factor = min(1.0, max(0.25, quality.blur_score / 180.0)) * min(1.0, max(0.25, paper_confidence * 2.0))
    recognitions = recognize_answers(aligned, reference, quality_factor=quality_factor, alignment_confidence=alignment_confidence)
    messages = []
    if alignment_confidence < 0.55:
        messages.append("Do chinh xac can chinh thap, can giao vien kiem tra lai.")

    student_result, subject_result, class_result, exam_code_result = recognize_fields_stub(
        aligned,
        provided_name=student_name,
        provided_subject=subject,
        provided_class_name=class_name,
        provided_exam_code=exam_code,
    )
    answer_key = load_answer_key(subject_result.normalized, exam_code_result.normalized) if subject_result.normalized and exam_code_result.normalized else None
    config = load_sheet_config()

    upload_name = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:8]}.jpg"
    upload_path = storage_path("uploads", upload_name)
    annotated_path = storage_path("annotated", upload_name)
    cv2.imwrite(str(upload_path), image)
    cv2.imwrite(str(annotated_path), annotate_sheet(aligned, recognitions))

    result = grade_recognitions(
        recognitions=recognitions,
        answer_key=answer_key,
        student_name=student_result,
        subject=subject_result,
        class_name=class_result,
        exam_code=exam_code_result,
        image_path=str(upload_path),
        annotated_image_path=str(annotated_path),
        messages=messages,
        max_score=float(config["scoring"]["max_score"]),
    )
    result.id = save_scan_result(result)
    return result


@app.get("/results/export")
def export_results() -> FileResponse:
    output_path = storage_path("ket-qua-cham-bai.xlsx")
    export_results_to_excel(list_scan_results(), output_path)
    return FileResponse(
        path=output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="ket-qua-cham-bai.xlsx",
    )
