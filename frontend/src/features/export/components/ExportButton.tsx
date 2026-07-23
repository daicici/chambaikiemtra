"use client";

import { useState } from "react";
import { exportExcel } from "@/services/export-api";
import type { GradingResult } from "@/types/grading-result";

type Props = {
  results: GradingResult[];
};

export function ExportButton({ results }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      await exportExcel(results);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="primary-button" type="button" disabled={busy || results.length === 0} onClick={handleExport}>
      {busy ? "Đang tạo Excel..." : "Tải Excel"}
    </button>
  );
}
