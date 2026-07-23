import type { ScannerPhase } from "./scanner.types";

export function scannerMessage(phase: ScannerPhase) {
  const messages: Record<ScannerPhase, string> = {
    idle: "Mở camera để bắt đầu.",
    ready: "Đặt phiếu trong khung và bấm chụp.",
    grading: "Backend đang xử lý ảnh và chấm điểm.",
    done: "Đã nhận kết quả chấm.",
    error: "Có lỗi, vui lòng thử lại."
  };
  return messages[phase];
}
