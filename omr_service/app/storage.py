from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .config import DB_PATH, STORAGE_DIR
from .schemas import AnswerKeyIn, ScanResult


def ensure_storage() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    (STORAGE_DIR / "annotated").mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS answer_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                exam_code TEXT NOT NULL,
                answers_json TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, exam_code)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scanned_at TEXT NOT NULL,
                student_name TEXT,
                class_name TEXT,
                subject TEXT,
                exam_code TEXT,
                result_json TEXT NOT NULL,
                status TEXT NOT NULL,
                score REAL NOT NULL
            )
            """
        )


def save_answer_key(answer_key: AnswerKeyIn) -> None:
    ensure_storage()
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO answer_keys(subject, exam_code, answers_json)
            VALUES (?, ?, ?)
            ON CONFLICT(subject, exam_code)
            DO UPDATE SET answers_json = excluded.answers_json
            """,
            (answer_key.subject, answer_key.exam_code, json.dumps(answer_key.answers, ensure_ascii=False)),
        )


def load_answer_key(subject: str, exam_code: str) -> list[str] | None:
    ensure_storage()
    with sqlite3.connect(DB_PATH) as connection:
        row = connection.execute(
            "SELECT answers_json FROM answer_keys WHERE subject = ? AND exam_code = ?",
            (subject, exam_code),
        ).fetchone()
    return json.loads(row[0]) if row else None


def save_scan_result(result: ScanResult) -> int:
    ensure_storage()
    payload = result.model_dump(mode="json")
    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            INSERT INTO scan_results(scanned_at, student_name, class_name, subject, exam_code, result_json, status, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.scanned_at.isoformat(),
                result.student_name.normalized,
                result.class_name.normalized,
                result.subject.normalized,
                result.exam_code.normalized,
                json.dumps(payload, ensure_ascii=False),
                result.status,
                result.score,
            ),
        )
        return int(cursor.lastrowid)


def list_scan_results() -> list[dict]:
    ensure_storage()
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute("SELECT result_json FROM scan_results ORDER BY id ASC").fetchall()
    return [json.loads(row[0]) for row in rows]


def storage_path(*parts: str) -> Path:
    ensure_storage()
    return STORAGE_DIR.joinpath(*parts)
