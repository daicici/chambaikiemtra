from __future__ import annotations

from ...schemas.answer_key import AnswerKeyPayload


def attach_correct_answers(recognized: list[dict], answer_key: AnswerKeyPayload) -> list[dict]:
    rows: list[dict] = []
    for item in recognized:
        correct_answer = answer_key.answers[item["question"] - 1]
        detected = item["detected_answer"]
        is_correct = detected == correct_answer
        rows.append({**item, "correct_answer": correct_answer, "is_correct": is_correct})
    return rows
