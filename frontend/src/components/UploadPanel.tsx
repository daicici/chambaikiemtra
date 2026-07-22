import { ChangeEvent } from "react";
import { UploadCloud } from "lucide-react";
import { formatBytes } from "../utils/file";

type UploadPanelProps = {
  file: File | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function UploadPanel({ file, onFileChange }: UploadPanelProps) {
  return (
    <section className="content-card" aria-labelledby="upload-title">
      <div className="section-heading">
        <span className="step-number">1</span>
        <div>
          <h2 id="upload-title">Tải file đề gốc</h2>
          <p>Hỗ trợ .txt, .docx, .pdf. Mỗi câu nên có lựa chọn A, B, C, D trên các dòng riêng.</p>
        </div>
      </div>

      <label className={`drop-zone ${file ? "has-file" : ""}`}>
        <input type="file" accept=".txt,.docx,.pdf" onChange={onFileChange} aria-label="Chọn file đề thi" />
        <UploadCloud size={34} />
        <strong>{file ? file.name : "Bấm để chọn file đề thi"}</strong>
        <span>{file ? formatBytes(file.size) : "File sẽ được gửi tới backend để xử lý."}</span>
      </label>
    </section>
  );
}
