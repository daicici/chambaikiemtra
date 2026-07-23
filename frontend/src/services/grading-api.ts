import type { AnswerKey } from "@/types/answer";
import type { GradingResult } from "@/types/grading-result";
import { API_BASE_URL } from "./api-client";

export async function scanSheet(image: Blob, answerKey: AnswerKey): Promise<GradingResult> {
  const formData = new FormData();
  formData.append("image", image, "sheet.jpg");
  formData.append("answer_key", JSON.stringify(answerKey));

  const response = await fetch(`${API_BASE_URL}/api/v1/grading/scan`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? error?.detail ?? "Không chấm được phiếu.");
  }
  return response.json();
}
