import { ClipboardCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import type { AnswerSheetTemplateKey, WorkState } from "../types";
import { Notice } from "./Notice";
import { SheetPreview } from "./SheetPreview";

type AnswerSheetDownloadProps = {
  sheetState: WorkState;
  sheetMessage: string;
  onDownload: (template: AnswerSheetTemplateKey) => void;
};

const templateOptions: Array<{
  key: AnswerSheetTemplateKey;
  title: string;
  description: string;
}> = [
  {
    key: "full",
    title: "Mẫu đầy đủ",
    description: "Gồm Phần I, Phần II và Phần III theo mẫu phiếu hiện tại."
  },
  {
    key: "forty",
    title: "Mẫu 40 câu trắc nghiệm",
    description: "Chỉ có một phần duy nhất gồm 40 câu A, B, C, D."
  }
];

export function AnswerSheetDownload({ sheetState, sheetMessage, onDownload }: AnswerSheetDownloadProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AnswerSheetTemplateKey | null>(null);

  function handlePickTemplate(template: AnswerSheetTemplateKey) {
    setSelectedTemplate(template);
    onDownload(template);
  }

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
        <button className="primary-button free-button" disabled={sheetState === "working"} onClick={() => setIsPickerOpen((value) => !value)}>
          {sheetState === "working" ? <Loader2 className="spin" size={20} /> : <ClipboardCheck size={20} />}
          <span>Chọn mẫu phiếu để tải miễn phí</span>
        </button>
      </div>

      {isPickerOpen && (
        <div className="template-picker" aria-label="Chọn loại phiếu trả lời">
          {templateOptions.map((template) => (
            <button
              className={`template-option ${selectedTemplate === template.key ? "is-selected" : ""}`}
              type="button"
              key={template.key}
              disabled={sheetState === "working"}
              onClick={() => handlePickTemplate(template.key)}
            >
              <span className="template-radio" aria-hidden="true" />
              <span>
                <strong>{template.title}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {sheetMessage && <Notice state={sheetState} message={sheetMessage} />}
    </section>
  );
}
