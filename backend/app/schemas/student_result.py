from __future__ import annotations

from pydantic import BaseModel


class StudentInformation(BaseModel):
    name: str = "Chưa nhận diện"
    class_name: str = "Chưa nhận diện"
    exam_code: str = "Chưa nhận diện"
    subject: str = "Chưa nhận diện"
    raw_name: str = ""
    raw_class_name: str = ""
    raw_exam_code: str = ""
