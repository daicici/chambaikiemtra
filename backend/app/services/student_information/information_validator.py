from __future__ import annotations

import numpy as np

from ...schemas.answer_key import AnswerKeyPayload
from ...schemas.student_result import StudentInformation
from .class_recognizer import recognize_class
from .exam_code_recognizer import recognize_exam_code
from .name_recognizer import recognize_name


def recognize_student_information(aligned_sheet: np.ndarray, answer_key: AnswerKeyPayload) -> StudentInformation:
    name, raw_name = recognize_name(aligned_sheet)
    class_name, raw_class = recognize_class(aligned_sheet)
    exam_code, raw_code = recognize_exam_code(aligned_sheet, answer_key.exam_code)
    return StudentInformation(
        name=name,
        class_name=class_name,
        exam_code=exam_code,
        subject=answer_key.subject,
        raw_name=raw_name,
        raw_class_name=raw_class,
        raw_exam_code=raw_code,
    )
