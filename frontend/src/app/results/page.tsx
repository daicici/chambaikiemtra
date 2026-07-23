"use client";

import { useState } from "react";
import { ExportButton } from "@/features/export/components/ExportButton";
import { ResultTable } from "@/features/results/components/ResultTable";
import { ScoreSummary } from "@/features/results/components/ScoreSummary";
import type { GradingResult } from "@/types/grading-result";

export default function ResultsPage() {
  const [results, setResults] = useState<GradingResult[]>([]);
  return (
    <main className="page">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h1>Kết quả tạm thời</h1>
            <p>Sửa thông tin trước khi xuất file Excel.</p>
          </div>
          <ExportButton results={results} />
        </div>
        <ScoreSummary results={results} />
        <ResultTable onResultsChange={setResults} />
      </section>
    </main>
  );
}
