"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api-client";
import type { AnswerChoice, AnswerKey } from "@/types/answer";
import { emptyAnswers, loadAnswerKey, saveAnswerKey } from "@/stores/answer-key.store";
import { validateAnswerKey } from "../answer-key.validator";
import { AnswerGrid } from "./AnswerGrid";
import { ExamCodePreview } from "./ExamCodePreview";
import { ExamCodeTabs } from "./ExamCodeTabs";

export function AnswerKeyForm() {
  const [answerKey, setAnswerKey] = useState<AnswerKey>({ subject: "Toán", exam_code: "101", answers: emptyAnswers(), max_score: 10 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAnswerKey(loadAnswerKey());
  }, []);

  function updateAnswer(index: number, choice: AnswerChoice) {
    setAnswerKey((current) => {
      const answers = current.answers.length === 40 ? current.answers : emptyAnswers();
      return {
        ...current,
        answers: answers.map((answer, answerIndex) => (answerIndex === index ? choice : answer))
      };
    });
  }

  function updateExamCode(value: string) {
    setAnswerKey((current) => ({ ...current, exam_code: value.replace(/\D/g, "").slice(0, 3) }));
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
    <section className="panel answer-key-panel">
      <div className="section-heading">
        <div>
          <h1>Tạo đáp án chuẩn theo mẫu 40_cau.pdf</h1>
          <p>Mẫu mặc định gồm 40 câu, chia thành 4 bảng và mã đề thi gồm 3 chữ số.</p>
        </div>
        <div className="action-row">
          <a className="secondary-button" href={`${API_BASE_URL}/api/v1/templates/omr-40-v1/pdf`} rel="noreferrer" target="_blank">
            Tải PDF mẫu
          </a>
          <button className="primary-button" type="button" onClick={save}>
            Lưu đáp án
          </button>
        </div>
      </div>

      <div className="answer-key-layout">
        <aside className="answer-key-sidebar">
          <div className="form-grid compact">
            <label className="field">
              Môn thi
              <input value={answerKey.subject} onChange={(event) => setAnswerKey({ ...answerKey, subject: event.target.value })} />
            </label>
            <label className="field">
              Mã đề
              <input inputMode="numeric" maxLength={3} value={answerKey.exam_code} onChange={(event) => updateExamCode(event.target.value)} />
            </label>
            <label className="field">
              Thang điểm
              <input type="number" value={answerKey.max_score} onChange={(event) => setAnswerKey({ ...answerKey, max_score: Number(event.target.value) })} />
            </label>
          </div>
          <ExamCodeTabs value={answerKey.exam_code} onChange={updateExamCode} />
          <ExamCodePreview value={answerKey.exam_code} onChange={updateExamCode} />
        </aside>

        <div className="answer-sheet-panel">
          <div className="sheet-title-row">
            <span className="sheet-main-marker" aria-hidden="true" />
            <strong>PHIẾU TRẢ LỜI TRẮC NGHIỆM</strong>
          </div>
          <AnswerGrid answers={answerKey.answers} onChange={updateAnswer} />
        </div>
      </div>

      {message && <p className="review">{message}</p>}
    </section>
  );
}
