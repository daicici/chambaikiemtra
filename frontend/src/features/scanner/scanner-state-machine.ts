import type { ScannerPhase } from "./scanner.types";

export function scannerMessage(phase: ScannerPhase) {
  const messages: Record<ScannerPhase, string> = {
    idle: "Bấm Bắt đầu để quét và chấm tự động.",
    ready: "Camera đang sẵn sàng.",
    detecting: "Đang quét phiếu trong khung hình.",
    grading: "Backend đang xử lý ảnh và chấm điểm.",
    saved: "Đã lưu kết quả vào danh sách xuất Excel.",
    "waiting-removal": "Hãy nhấc phiếu vừa chấm ra khỏi tập bài.",
    done: "Đã nhận kết quả chấm.",
    error: "Có lỗi, vui lòng thử lại."
  };
  return messages[phase];
}
