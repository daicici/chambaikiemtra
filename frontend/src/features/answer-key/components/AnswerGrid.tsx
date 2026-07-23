"use client";

import type { AnswerChoice } from "@/types/answer";

const CHOICES: AnswerChoice[] = ["A", "B", "C", "D"];

type Props = {
  answers: AnswerChoice[];
  onChange: (questionIndex: number, choice: AnswerChoice) => void;
};

export function AnswerGrid({ answers, onChange }: Props) {
  return (
    <div className="answer-grid">
      {[0, 1, 2, 3].map((group) => (
        <div className="answer-group" key={group}>
          <div className="answer-header">
            <span />
            {CHOICES.map((choice) => (
              <span key={choice}>{choice}</span>
            ))}
          </div>
          {Array.from({ length: 10 }, (_, row) => {
            const questionIndex = group * 10 + row;
            return (
              <div className="answer-row" key={questionIndex}>
                <span className="answer-number">{questionIndex + 1}</span>
                {CHOICES.map((choice) => (
                  <button
                    className={`bubble-button ${answers[questionIndex] === choice ? "active" : ""}`}
                    key={choice}
                    type="button"
                    onClick={() => onChange(questionIndex, choice)}
                    aria-label={`Câu ${questionIndex + 1} chọn ${choice}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
