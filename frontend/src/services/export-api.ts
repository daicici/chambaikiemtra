import type { GradingResult } from "@/types/grading-result";
import { API_BASE_URL } from "./api-client";

export async function exportExcel(results: GradingResult[]) {
  const response = await fetch(`${API_BASE_URL}/api/v1/export/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results })
  });
  if (!response.ok) throw new Error("Không tạo được file Excel.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ket-qua-cham-bai.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
