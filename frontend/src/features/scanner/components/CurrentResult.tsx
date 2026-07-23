import type { GradingResult } from "@/types/grading-result";

type Props = {
  result: GradingResult | null;
};

export function CurrentResult({ result }: Props) {
  if (!result) return null;
  return (
    <div className="result-card">
      <span>Điểm bài vừa chấm</span>
      <strong className="score-number">{result.score}</strong>
      <span>
        Đúng {result.correct_count}/40 câu. Cần kiểm tra: {result.review_count}
      </span>
    </div>
  );
}
