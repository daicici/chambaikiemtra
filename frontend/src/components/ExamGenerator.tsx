import { Download, Loader2, RefreshCw } from "lucide-react";
import type { AccountState, WorkState } from "../types";
import { Notice } from "./Notice";
import { ToggleRow } from "./ToggleRow";

type ExamGeneratorProps = {
  accountState: AccountState;
  file: File | null;
  title: string;
  baseCode: string;
  variantCount: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  includeAnswerKey: boolean;
  generateState: WorkState;
  message: string;
  onTitleChange: (value: string) => void;
  onBaseCodeChange: (value: string) => void;
  onVariantCountChange: (value: number) => void;
  onShuffleQuestionsChange: (checked: boolean) => void;
  onShuffleAnswersChange: (checked: boolean) => void;
  onIncludeAnswerKeyChange: (checked: boolean) => void;
  onGenerate: () => void;
  onResetState: () => void;
  onRequireAuth: () => void;
};

export function ExamGenerator({
  accountState,
  file,
  title,
  baseCode,
  variantCount,
  shuffleQuestions,
  shuffleAnswers,
  includeAnswerKey,
  generateState,
  message,
  onTitleChange,
  onBaseCodeChange,
  onVariantCountChange,
  onShuffleQuestionsChange,
  onShuffleAnswersChange,
  onIncludeAnswerKeyChange,
  onGenerate,
  onResetState,
  onRequireAuth
}: ExamGeneratorProps) {
  const canGenerate = accountState !== "anonymous" && accountState !== "deactivated" && Boolean(file);

  function handleGenerateClick() {
    if (accountState === "anonymous") {
      onRequireAuth();
      return;
    }
    onGenerate();
  }

  return (
    <section className="content-card" id="tao-ma-de" aria-labelledby="generator-title">
      <div className="section-heading">
        <span className="step-number">2</span>
        <div>
          <h2 id="generator-title">Tạo nhiều mã đề</h2>
          <p>Trộn câu hỏi và đáp án, xuất từng mã đề thành PDF riêng rồi tải ZIP.</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Tên đề
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label>
          Tiền tố mã đề
          <input value={baseCode} onChange={(event) => onBaseCodeChange(event.target.value)} maxLength={10} />
        </label>
        <label>
          Số mã đề cần tạo
          <input
            type="number"
            min={1}
            max={60}
            value={variantCount}
            onChange={(event) => onVariantCountChange(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="toggle-list">
        <ToggleRow
          checked={shuffleQuestions}
          onChange={onShuffleQuestionsChange}
          title="Xáo trộn thứ tự câu hỏi"
          description="Câu hỏi trong mỗi mã đề sẽ có thứ tự khác nhau."
        />
        <ToggleRow
          checked={shuffleAnswers}
          onChange={onShuffleAnswersChange}
          title="Xáo trộn đáp án A, B, C, D"
          description="Đáp án đúng được giữ theo nội dung sau khi đổi vị trí."
        />
        <ToggleRow
          checked={includeAnswerKey}
          onChange={onIncludeAnswerKeyChange}
          title="Kèm trang đáp án cuối mỗi PDF"
          description="Dùng khi file gốc có dòng Đáp án: A hoặc đánh dấu * trước đáp án đúng."
        />
      </div>

      {accountState === "deactivated" && (
        <Notice state="error" message="Tài khoản đã hết hạn dùng thử. Cần kích hoạt lại trước khi tạo mã đề." />
      )}

      <div className="action-row">
        <button className="primary-button" disabled={!canGenerate || generateState === "working"} onClick={handleGenerateClick}>
          {generateState === "working" ? <Loader2 className="spin" size={20} /> : <Download size={20} />}
          <span>Tạo PDF và tải ZIP</span>
        </button>
        <button className="ghost-button" type="button" onClick={onResetState}>
          <RefreshCw size={18} />
          <span>Làm mới trạng thái</span>
        </button>
      </div>

      {message && <Notice state={generateState} message={message} />}
    </section>
  );
}
