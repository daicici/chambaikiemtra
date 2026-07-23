from __future__ import annotations

from datetime import datetime

from .schemas import FieldOcrResult, QuestionRecognition, ScanResult


def normalize_exam_code(value: str) -> str:
    return "".join(character for character in value if character.isdigit())


def normalize_class_name(value: str) -> str:
    return value.replace(" ", "").upper()


def grade_recognitions(
    recognitions: list[dict],
    answer_key: list[str] | None,
    student_name: FieldOcrResult,
    subject: FieldOcrResult,
    class_name: FieldOcrResult,
    exam_code: FieldOcrResult,
    image_path: str | None,
    annotated_image_path: str | None,
    messages: list[str],
    max_score: float = 10.0,
) -> ScanResult:
    question_count = len(recognitions)
    points_per_question = max_score / question_count if question_count else 0.0
    correct_count = 0
    blank_count = 0
    multiple_count = 0
    review_count = 0
    answer_items: list[QuestionRecognition] = []

    for item in recognitions:
        selected = item["selected"]
        if selected == "BLANK":
            blank_count += 1
        if selected == "MULTIPLE":
            multiple_count += 1
        if selected in {"AMBIGUOUS", "ERROR"} or item["confidence"] < 0.58:
            review_count += 1

        correct_answer = answer_key[item["question"] - 1] if answer_key and item["question"] - 1 < len(answer_key) else None
        is_correct = selected == correct_answer if correct_answer and selected in {"A", "B", "C", "D"} else False
        if is_correct:
            correct_count += 1

        answer_items.append(
            QuestionRecognition(
                question=item["question"],
                selected=selected,
                correct_answer=correct_answer,
                is_correct=is_correct if correct_answer else None,
                confidence=item["confidence"],
                fill_scores=item["fill_scores"],
            )
        )

    wrong_count = question_count - correct_count - blank_count - multiple_count
    status = "OK"
    if answer_key is None:
        status = "NO_ANSWER_KEY"
        messages.append("Khong tim thay dap an chuan cho mon thi/ma de.")
    elif review_count > 0:
        status = "NEEDS_REVIEW"

    return ScanResult(
        scanned_at=datetime.now(),
        student_name=student_name,
        subject=subject,
        class_name=class_name,
        exam_code=exam_code,
        answers=answer_items,
        correct_count=correct_count,
        wrong_count=max(0, wrong_count),
        blank_count=blank_count,
        multiple_count=multiple_count,
        review_count=review_count,
        score=round(correct_count * points_per_question, 2),
        status=status,
        image_path=image_path,
        annotated_image_path=annotated_image_path,
        messages=messages,
    )
