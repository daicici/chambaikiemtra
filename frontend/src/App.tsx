import { ChangeEvent, useState } from "react";
import { AnswerSheetDownload } from "./components/AnswerSheetDownload";
import { AuthModal } from "./components/AuthModal";
import { AutoGrader } from "./components/AutoGrader";
import { ClassManager } from "./components/ClassManager";
import { ExamGenerator } from "./components/ExamGenerator";
import { FeatureTabs } from "./components/FeatureTabs";
import { HeroSection } from "./components/HeroSection";
import { SiteHeader } from "./components/SiteHeader";
import { UploadPanel } from "./components/UploadPanel";
import type { AccountState, AnswerSheetTemplateKey, AuthMode, FeatureKey, WorkState } from "./types";
import { downloadBlob, slug } from "./utils/file";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function App() {
  const [accountState, setAccountState] = useState<AccountState>("anonymous");
  const [accountEmail, setAccountEmail] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("Đề kiểm tra trắc nghiệm");
  const [baseCode, setBaseCode] = useState("MD");
  const [variantCount, setVariantCount] = useState(8);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [generateState, setGenerateState] = useState<WorkState>("idle");
  const [message, setMessage] = useState("");
  const [sheetState, setSheetState] = useState<WorkState>("idle");
  const [sheetMessage, setSheetMessage] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("exam");

  function selectFeature(feature: FeatureKey) {
    setActiveFeature(feature);
    window.setTimeout(() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setGenerateState("idle");
    setMessage(nextFile ? `Đã chọn file: ${nextFile.name}` : "");
  }

  function handleLogin(email: string) {
    setAccountEmail(email);
    setAccountState("active");
    setMessage("Đăng nhập mẫu thành công. Bạn có thể tạo mã đề.");
  }

  function handleSignup(email: string) {
    setAccountEmail(email);
    setAccountState("trial");
    setMessage("Đã tạo tài khoản dùng thử 1 ngày. Bạn có thể tạo mã đề.");
  }

  async function handleGenerate() {
    if (!file) {
      setMessage("Vui lòng chọn file đề trước.");
      setGenerateState("error");
      return;
    }

    setGenerateState("working");
    setMessage("Đang tạo mã đề và đóng gói file ZIP...");

    const formData = new FormData();
    formData.append("examFile", file);
    formData.append("title", title);
    formData.append("baseCode", baseCode);
    formData.append("variantCount", String(variantCount));
    formData.append("shuffleQuestions", String(shuffleQuestions));
    formData.append("shuffleAnswers", String(shuffleAnswers));
    formData.append("includeAnswerKey", String(includeAnswerKey));

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Không thể tạo file ZIP.");
      }

      const blob = await response.blob();
      downloadBlob(blob, `${slug(title)}-ma-de.zip`);
      setGenerateState("done");
      setMessage(`Đã tạo ${variantCount} mã đề và tải file ZIP về máy.`);
    } catch (error) {
      setGenerateState("error");
      setMessage(error instanceof Error ? error.message : "Có lỗi khi tạo mã đề.");
    }
  }

  async function handleDownloadAnswerSheet(template: AnswerSheetTemplateKey) {
    setSheetState("working");
    setSheetMessage("Đang chuẩn bị file phiếu trả lời trắc nghiệm...");

    try {
      const response = await fetch(`${API_URL}/api/answer-sheet-template?type=${template}`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Không thể tải phiếu trả lời.");
      }

      const blob = await response.blob();
      const filename =
        template === "forty" ? "mau-phieu-trac-nghiem-40-cau.pdf" : "mau-phieu-trac-nghiem-2025-rut-gon.pdf";
      downloadBlob(blob, filename);
      setSheetState("done");
      setSheetMessage("Đã tải PDF phiếu trả lời miễn phí.");
    } catch (error) {
      setSheetState("error");
      setSheetMessage(error instanceof Error ? error.message : "Có lỗi khi tải phiếu trả lời.");
    }
  }

  return (
    <div className="site-shell">
      <div className="education-backdrop" aria-hidden="true" />
      <SiteHeader
        accountState={accountState}
        accountEmail={accountEmail}
        activeFeature={activeFeature}
        onSelectFeature={selectFeature}
        onOpenAuth={setAuthMode}
      />

      <main>
        <HeroSection
          onSignup={() => setAuthMode("signup")}
          onJumpToTool={() => selectFeature("exam")}
        />

        <div className="tool-layout" id="features" aria-label="Khu chức năng">
          <FeatureTabs activeFeature={activeFeature} onSelectFeature={selectFeature} />

          {activeFeature === "exam" && (
            <div className="feature-panel" aria-label="Chức năng tạo mã đề">
              <UploadPanel file={file} onFileChange={handleFileChange} />
              <ExamGenerator
                accountState={accountState}
                file={file}
                title={title}
                baseCode={baseCode}
                variantCount={variantCount}
                shuffleQuestions={shuffleQuestions}
                shuffleAnswers={shuffleAnswers}
                includeAnswerKey={includeAnswerKey}
                generateState={generateState}
                message={message}
                onTitleChange={setTitle}
                onBaseCodeChange={setBaseCode}
                onVariantCountChange={setVariantCount}
                onShuffleQuestionsChange={setShuffleQuestions}
                onShuffleAnswersChange={setShuffleAnswers}
                onIncludeAnswerKeyChange={setIncludeAnswerKey}
                onGenerate={handleGenerate}
                onResetState={() => setGenerateState("idle")}
                onRequireAuth={() => setAuthMode("login")}
              />
            </div>
          )}

          {activeFeature === "answerSheet" && (
            <AnswerSheetDownload sheetState={sheetState} sheetMessage={sheetMessage} onDownload={handleDownloadAnswerSheet} />
          )}

          {activeFeature === "autoGrader" && <AutoGrader accountState={accountState} onRequireAuth={() => setAuthMode("login")} />}

          {activeFeature === "classroom" && <ClassManager />}
        </div>
      </main>

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onLogin={handleLogin} onSignup={handleSignup} />
      )}
    </div>
  );
}
