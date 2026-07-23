"use client";

import type { AnswerChoice } from "@/types/answer";

const CHOICES: AnswerChoice[] = ["A", "B", "C", "D"];
const GROUPS = [
  { start: 1, end: 10 },
  { start: 11, end: 20 },
  { start: 21, end: 30 },
  { start: 31, end: 40 }
];

type Props = {
  answers: AnswerChoice[];
  onChange: (questionIndex: number, choice: AnswerChoice) => void;
};

export function AnswerGrid({ answers, onChange }: Props) {
  return (
    <div className="answer-sheet-grid">
      {GROUPS.map((group) => (
        <section className="answer-sheet-group" key={group.start}>
          <span className="sheet-mini-marker" aria-hidden="true" />
          <div className="answer-choice-header" aria-hidden="true">
            <span />
            {CHOICES.map((choice) => (
              <span className="choice-label" key={choice}>
                {choice}
              </span>
            ))}
          </div>
          {Array.from({ length: group.end - group.start + 1 }, (_, row) => {
            const questionNumber = group.start + row;
            const questionIndex = questionNumber - 1;
            return (
              <div className={`answer-sheet-row${row === 5 ? " section-break" : ""}`} key={questionNumber}>
                <span className="answer-number">{questionNumber}</span>
                {CHOICES.map((choice) => (
                  <button
                    aria-label={`Câu ${questionNumber} chọn ${choice}`}
                    className={`bubble-button ${answers[questionIndex] === choice ? "active" : ""}`}
                    key={choice}
                    onClick={() => onChange(questionIndex, choice)}
                    type="button"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
