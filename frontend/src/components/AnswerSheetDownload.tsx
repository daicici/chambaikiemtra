import { ClipboardCheck, Loader2 } from "lucide-react";
import type { WorkState } from "../types";
import { Notice } from "./Notice";
import { SheetPreview } from "./SheetPreview";

type AnswerSheetDownloadProps = {
  sheetState: WorkState;
  sheetMessage: string;
  onDownload: () => void;
};

export function AnswerSheetDownload({ sheetState, sheetMessage, onDownload }: AnswerSheetDownloadProps) {
  return (
    <section className="content-card" id="phieu-tra-loi" aria-labelledby="answer-sheet-title">
      <div className="section-heading">
        <span className="step-number">3</span>
        <div>
          <h2 id="answer-sheet-title">Phiếu trả lời trắc nghiệm</h2>
          <p>Tải mẫu PDF phiếu khoanh miễn phí, không cần đăng nhập hay nhập thông tin.</p>
        </div>
      </div>

      <SheetPreview />

      <div className="action-row">
        <button className="primary-button free-button" disabled={sheetState === "working"} onClick={onDownload}>
          {sheetState === "working" ? <Loader2 className="spin" size={20} /> : <ClipboardCheck size={20} />}
          <span>Tải PDF phiếu trả lời miễn phí</span>
        </button>
      </div>

      {sheetMessage && <Notice state={sheetState} message={sheetMessage} />}
    </section>
  );
}
