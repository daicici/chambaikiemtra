import type { GradingResult } from "@/types/grading-result";

type Props = {
  results: GradingResult[];
};

export function ScoreSummary({ results }: Props) {
  const average = results.length ? results.reduce((sum, result) => sum + result.score, 0) / results.length : 0;
  return (
    <div className="result-card">
      <strong>{results.length} phiếu đã chấm</strong>
      <span>Điểm trung bình: {average.toFixed(2)}</span>
    </div>
  );
}
