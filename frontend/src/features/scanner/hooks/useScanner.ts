"use client";

import { useState } from "react";
import { captureFrame } from "@/features/camera/hooks/useFrameCapture";
import { scanSheet } from "@/services/grading-api";
import { loadAnswerKey } from "@/stores/answer-key.store";
import { loadResults, saveResults } from "@/stores/results.store";
import type { GradingResult } from "@/types/grading-result";
import type { ScannerPhase } from "../scanner.types";

export function useScanner(video: HTMLVideoElement | null) {
  const [phase, setPhase] = useState<ScannerPhase>("idle");
  const [message, setMessage] = useState("Mở camera để bắt đầu.");
  const [currentResult, setCurrentResult] = useState<GradingResult | null>(null);

  async function scan() {
    if (!video) return;
    setPhase("grading");
    setMessage("Đang chụp ảnh và gửi backend chấm điểm...");
    try {
      const blob = await captureFrame(video);
      const answerKey = loadAnswerKey();
      const result = await scanSheet(blob, answerKey);
      const results = [...loadResults(), result];
      saveResults(results);
      setCurrentResult(result);
      setPhase("done");
      setMessage("Đã chấm xong và lưu vào danh sách tạm.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Không chấm được phiếu.");
    }
  }

  return { phase, message, currentResult, scan };
}
