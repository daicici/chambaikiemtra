from __future__ import annotations

import numpy as np

from ..templates.template_loader import load_template
from .answer_classifier import adaptive_threshold, classify_question
from .bubble_detector import score_all_bubbles


def recognize_40_answers(aligned_sheet: np.ndarray) -> list[dict]:
    template = load_template()
    score_map = score_all_bubbles(aligned_sheet, template)
    all_scores = [score for choices in score_map.values() for score in choices.values()]
    threshold = adaptive_threshold(all_scores)
    return [classify_question(question, score_map.get(question, {}), threshold) for question in range(1, 41)]
