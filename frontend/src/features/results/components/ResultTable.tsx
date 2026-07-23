"use client";

import { useEffect, useState } from "react";
import { loadResults, saveResults } from "@/stores/results.store";
import type { GradingResult } from "@/types/grading-result";
import { ResultEditor } from "./ResultEditor";

type Props = {
  onResultsChange?: (results: GradingResult[]) => void;
};

export function ResultTable({ onResultsChange }: Props) {
  const [results, setResults] = useState<GradingResult[]>([]);

  useEffect(() => {
    const next = loadResults();
    setResults(next);
    onResultsChange?.(next);
  }, [onResultsChange]);

  function update(index: number, result: GradingResult) {
    const next = results.map((current, currentIndex) => (currentIndex === index ? result : current));
    setResults(next);
    saveResults(next);
    onResultsChange?.(next);
  }

  if (results.length === 0) return <p>Chưa có kết quả tạm thời.</p>;

  return (
    <div className="status-list">
      {results.map((result, index) => (
        <div className="panel" key={result.scan_id}>
          <div className="section-heading">
            <div>
              <h2>
                {index + 1}. {result.student.name}
              </h2>
              <p>
                Điểm {result.score}/{result.max_score} - Trạng thái {result.status}
              </p>
            </div>
          </div>
          <ResultEditor result={result} onChange={(next) => update(index, next)} />
        </div>
      ))}
    </div>
  );
}
