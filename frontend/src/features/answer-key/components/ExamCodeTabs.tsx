"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ExamCodeTabs({ value, onChange }: Props) {
  const codes = ["101", "102", "103", "104"];
  return (
    <div className="action-row">
      {codes.map((code) => (
        <button className={value === code ? "primary-button" : "secondary-button"} key={code} type="button" onClick={() => onChange(code)}>
          Mã {code}
        </button>
      ))}
    </div>
  );
}
