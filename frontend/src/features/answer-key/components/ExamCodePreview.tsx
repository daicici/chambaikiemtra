"use client";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const CODE_LENGTH = 3;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function ExamCodePreview({ value, onChange }: Props) {
  const code = normalizeCode(value);

  function updateDigit(index: number, digit: string) {
    const next = code.padEnd(CODE_LENGTH, "0").split("");
    next[index] = digit;
    onChange(next.join(""));
  }

  return (
    <div className="exam-code-preview" aria-label="Mã đề theo mẫu phiếu 40 câu">
      <div className="exam-code-title">8. Mã đề thi</div>
      <div className="exam-code-boxes" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span key={index}>{code[index] ?? ""}</span>
        ))}
      </div>
      <div className="exam-code-digit-grid">
        {DIGITS.map((digit) => (
          <div className="exam-code-digit-row" key={digit}>
            <span>{digit}</span>
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <button
                aria-label={`Cột ${index + 1} chọn số ${digit}`}
                className={`code-bubble ${code[index] === digit ? "active" : ""}`}
                key={`${digit}-${index}`}
                onClick={() => updateDigit(index, digit)}
                type="button"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
