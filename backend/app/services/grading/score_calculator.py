from __future__ import annotations


def summarize_score(rows: list[dict], max_score: float) -> dict:
    correct = sum(1 for row in rows if row["is_correct"])
    blank = sum(1 for row in rows if row["detected_answer"] == "BLANK")
    multiple = sum(1 for row in rows if row["detected_answer"] == "MULTIPLE")
    review = sum(1 for row in rows if row["detected_answer"] in {"AMBIGUOUS", "ERROR"} or row["confidence"] < 0.58)
    wrong = len(rows) - correct - blank - multiple
    return {
        "correct_count": correct,
        "wrong_count": max(0, wrong),
        "blank_count": blank,
        "multiple_count": multiple,
        "review_count": review,
        "score": round(correct * (max_score / len(rows)), 2) if rows else 0.0,
    }
