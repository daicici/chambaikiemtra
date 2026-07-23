from __future__ import annotations

from typing import Literal


AnswerChoice = Literal["A", "B", "C", "D"]
DetectedAnswer = Literal["A", "B", "C", "D", "BLANK", "MULTIPLE", "AMBIGUOUS", "ERROR"]
SheetStatus = Literal["ok", "needs_review", "rejected", "duplicate"]
