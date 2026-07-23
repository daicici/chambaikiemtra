"use client";

import { useEffect, useState } from "react";
import type { AnswerChoice, AnswerKey } from "@/types/answer";
import { loadAnswerKey, saveAnswerKey } from "@/stores/answer-key.store";
import { validateAnswerKey } from "../answer-key.validator";
import { AnswerGrid } from "./AnswerGrid";
import { ExamCodeTabs } from "./ExamCodeTabs";

export function AnswerKeyForm() {
  const [answerKey, setAnswerKey] = useState<AnswerKey>({ subject: "Toán", exam_code: "101", answers: [], max_score: 10 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAnswerKey(loadAnswerKey());
  }, []);

  function updateAnswer(index: number, choice: AnswerChoice) {
    setAnswerKey((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => (answerIndex === index ? choice : answer))
    }));
  }

  function save() {
    const messages = validateAnswerKey(answerKey);
    if (messages.length) {
      setMessage(messages.join(" "));
      return;
    }
    saveAnswerKey(answerKey);
    setMessage("Đã lưu đáp án chuẩn trong trình duyệt.");
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h1>Tạo đáp án chuẩn</h1>
          <p>Mẫu mặc định gồm 40 câu trắc nghiệm, mỗi câu có A, B, C, D.</p>
        </div>
        <button className="primary-button" type="button" onClick={save}>
          Lưu đáp án
        </button>
      </div>
      <div className="form-grid">
        <label className="field">
          Môn thi
          <input value={answerKey.subject} onChange={(event) => setAnswerKey({ ...answerKey, subject: event.target.value })} />
        </label>
        <label className="field">
          Mã đề
          <input value={answerKey.exam_code} onChange={(event) => setAnswerKey({ ...answerKey, exam_code: event.target.value })} />
        </label>
        <label className="field">
          Thang điểm
          <input type="number" value={answerKey.max_score} onChange={(event) => setAnswerKey({ ...answerKey, max_score: Number(event.target.value) })} />
        </label>
      </div>
      <div style={{ margin: "14px 0" }}>
        <ExamCodeTabs value={answerKey.exam_code} onChange={(exam_code) => setAnswerKey({ ...answerKey, exam_code })} />
      </div>
      <AnswerGrid answers={answerKey.answers} onChange={updateAnswer} />
      {message && <p className="review">{message}</p>}
    </section>
  );
}
