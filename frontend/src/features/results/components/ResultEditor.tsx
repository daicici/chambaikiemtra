"use client";

import type { GradingResult } from "@/types/grading-result";

type Props = {
  result: GradingResult;
  onChange: (result: GradingResult) => void;
};

export function ResultEditor({ result, onChange }: Props) {
  return (
    <div className="form-grid">
      <label className="field">
        Họ và tên
        <input value={result.student.name} onChange={(event) => onChange({ ...result, student: { ...result.student, name: event.target.value } })} />
      </label>
      <label className="field">
        Lớp
        <input value={result.student.class_name} onChange={(event) => onChange({ ...result, student: { ...result.student, class_name: event.target.value } })} />
      </label>
      <label className="field">
        Mã đề
        <input value={result.student.exam_code} onChange={(event) => onChange({ ...result, student: { ...result.student, exam_code: event.target.value } })} />
      </label>
    </div>
  );
}
