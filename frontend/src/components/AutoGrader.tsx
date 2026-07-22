import { Camera, FileCheck2, FileSpreadsheet, Lock, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountState } from "../types";
import { downloadBlob } from "../utils/file";
import { Notice } from "./Notice";

type AutoGraderProps = {
  accountState: AccountState;
  onRequireAuth: () => void;
};

type StudentResult = {
  id: number;
  name: string;
  className: string;
  examCode: string;
  correct: number;
  total: number;
  score: number;
};

type AnswerValue = "A" | "B" | "C" | "D" | null;

type OcrWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
};

type StudentMetadata = {
  name: string;
  className: string;
  examCode: string;
  rawText: string;
};

const QUESTION_COUNT = 40;
const CHOICES: Exclude<AnswerValue, null>[] = ["A", "B", "C", "D"];
const STABLE_FRAME_DIFF = 5.5;
const CHANGE_FRAME_DIFF = 16;
const STABLE_CAPTURE_MS = 1400;
const SCAN_INTERVAL_MS = 360;
const SCORE_DISPLAY_MS = 1800;

type ScanState = {
  signature: number[] | null;
  stableSince: number;
  waitingForChange: boolean;
  inFlight: boolean;
};

export function AutoGrader({ accountState, onRequireAuth }: AutoGraderProps) {
  const isSignedIn = accountState === "active" || accountState === "trial";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ocrWorkerRef = useRef<OcrWorker | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const scoreTimeoutRef = useRef<number | null>(null);
  const scanStateRef = useRef<ScanState>({
    signature: null,
    stableSince: 0,
    waitingForChange: false,
    inFlight: false
  });
  const [answerKey, setAnswerKey] = useState<AnswerValue[]>(createEmptyAnswerKey());
  const [draftAnswerKey, setDraftAnswerKey] = useState<AnswerValue[]>(createEmptyAnswerKey());
  const [isAnswerKeyEditorOpen, setIsAnswerKeyEditorOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [cameraMessage, setCameraMessage] = useState("");
  const [graderMessage, setGraderMessage] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [lastMetadata, setLastMetadata] = useState<StudentMetadata | null>(null);
  const [lastScoreResult, setLastScoreResult] = useState<StudentResult | null>(null);
  const [fullscreenScoreResult, setFullscreenScoreResult] = useState<StudentResult | null>(null);
  const [frozenFrameUrl, setFrozenFrameUrl] = useState("");
  const [isCaptureFlash, setIsCaptureFlash] = useState(false);

  const detectedAnswerCount = useMemo(() => answerKey.filter(Boolean).length, [answerKey]);
  const draftAnswerCount = useMemo(() => draftAnswerKey.filter(Boolean).length, [draftAnswerKey]);
  const canStart = detectedAnswerCount === QUESTION_COUNT;

  useEffect(() => {
    if (!isSignedIn) {
      stopCurrentCamera();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Trình duyệt chưa hỗ trợ mở camera trực tiếp.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraMessage("Camera đã sẵn sàng. Tạo đáp án đúng rồi bấm Bắt đầu để chấm toàn màn hình.");
      } catch {
        setCameraMessage("Không mở được camera. Vui lòng cấp quyền camera cho trình duyệt.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCurrentCamera();
    };
  }, [isSignedIn]);

  useEffect(() => {
    return () => {
      stopAutoScan();
      clearCaptureTimers();
      ocrWorkerRef.current?.terminate();
      ocrWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionStarted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionStarted || !canStart || !isSignedIn) {
      stopAutoScan();
      return;
    }

    startAutoScan();

    return () => {
      stopAutoScan();
    };
  }, [sessionStarted, canStart, isSignedIn, answerKey, detectedAnswerCount]);

  function stopCurrentCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function openAnswerKeyEditor() {
    setDraftAnswerKey(answerKey.map((answer) => answer));
    setIsAnswerKeyEditorOpen(true);
  }

  function handleDraftAnswerChange(questionIndex: number, answer: Exclude<AnswerValue, null>) {
    setDraftAnswerKey((current) => current.map((currentAnswer, index) => (index === questionIndex ? answer : currentAnswer)));
  }

  function handleSaveAnswerKey() {
    const count = draftAnswerKey.filter(Boolean).length;
    if (count < QUESTION_COUNT) {
      setGraderMessage(`Vui lòng chọn đủ ${QUESTION_COUNT} đáp án trước khi lưu. Hiện đã chọn ${count}/${QUESTION_COUNT}.`);
      return;
    }

    setAnswerKey(draftAnswerKey.map((answer) => answer));
    setSessionStarted(false);
    setLastMetadata(null);
    setLastScoreResult(null);
    setFullscreenScoreResult(null);
    setFrozenFrameUrl("");
    clearCaptureTimers();
    stopAutoScan();
    setIsAnswerKeyEditorOpen(false);
    setGraderMessage(`Đã lưu đủ ${QUESTION_COUNT}/${QUESTION_COUNT} đáp án đúng. Nút Bắt đầu đã sẵn sàng.`);
  }

  function handleStart() {
    if (!canStart) return;
    setLastScoreResult(null);
    setFullscreenScoreResult(null);
    setFrozenFrameUrl("");
    clearCaptureTimers();
    setSessionStarted(true);
    setGraderMessage("Đã bắt đầu chấm tự động. Đặt tập bài trước camera và giữ bài đầu tiên ổn định trong khung.");
  }

  function handleStop() {
    setSessionStarted(false);
    stopAutoScan();
    clearCaptureTimers();
    setIsGrading(false);
    setFrozenFrameUrl("");
    setFullscreenScoreResult(null);
    setIsCaptureFlash(false);
    setGraderMessage("Đã dừng chấm tự động. Bạn có thể tải file Excel hoặc bấm Bắt đầu để chấm tiếp.");
  }

  function clearCaptureTimers() {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    if (scoreTimeoutRef.current !== null) {
      window.clearTimeout(scoreTimeoutRef.current);
      scoreTimeoutRef.current = null;
    }
  }

  function startAutoScan() {
    stopAutoScan();
    scanStateRef.current = {
      signature: null,
      stableSince: 0,
      waitingForChange: false,
      inFlight: false
    };

    scanIntervalRef.current = window.setInterval(() => {
      void observeFrameForAutoScan();
    }, SCAN_INTERVAL_MS);
  }

  function stopAutoScan() {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    scanStateRef.current.inFlight = false;
  }

  async function observeFrameForAutoScan() {
    const video = videoRef.current;
    const scanState = scanStateRef.current;
    if (!video || video.readyState < 2 || scanState.inFlight || isGrading) return;

    const signature = getVideoFrameSignature(video);
    if (!signature) return;

    const now = Date.now();
    const diff = scanState.signature ? getSignatureDiff(scanState.signature, signature) : Number.POSITIVE_INFINITY;
    scanState.signature = signature;

    if (scanState.waitingForChange) {
      if (diff > CHANGE_FRAME_DIFF) {
        scanState.waitingForChange = false;
        scanState.stableSince = 0;
        setGraderMessage("Đã phát hiện giáo viên đổi bài. Đang chờ bài kế tiếp ổn định để chấm tự động...");
      }
      return;
    }

    if (diff <= STABLE_FRAME_DIFF && hasLikelyPaper(signature)) {
      if (!scanState.stableSince) {
        scanState.stableSince = now;
        setGraderMessage("Đã thấy bài trong khung. Giữ yên một chút để hệ thống tự chấm...");
        return;
      }

      if (now - scanState.stableSince >= STABLE_CAPTURE_MS) {
        scanState.inFlight = true;
        const canvas = captureVideoCanvas(video);
        if (!canvas) {
          scanState.inFlight = false;
          return;
        }

        if (scoreTimeoutRef.current !== null) {
          window.clearTimeout(scoreTimeoutRef.current);
          scoreTimeoutRef.current = null;
        }
        setFrozenFrameUrl(canvas.toDataURL("image/jpeg", 0.86));
        setIsCaptureFlash(true);
        if (flashTimeoutRef.current !== null) {
          window.clearTimeout(flashTimeoutRef.current);
        }
        flashTimeoutRef.current = window.setTimeout(() => {
          setIsCaptureFlash(false);
          flashTimeoutRef.current = null;
        }, 240);

        const success = await gradeCapturedCanvas(canvas);
        scanState.waitingForChange = success;
        scanState.stableSince = 0;
        scanState.signature = success ? signature : null;
        scanState.inFlight = false;

        if (success) {
          if (scoreTimeoutRef.current !== null) {
            window.clearTimeout(scoreTimeoutRef.current);
          }
          scoreTimeoutRef.current = window.setTimeout(() => {
            setFrozenFrameUrl("");
            setFullscreenScoreResult(null);
            scoreTimeoutRef.current = null;
          }, SCORE_DISPLAY_MS);
        } else {
          setFrozenFrameUrl("");
          setFullscreenScoreResult(null);
        }
      }
      return;
    }

    scanState.stableSince = 0;
  }

  async function gradeCapturedCanvas(canvas: HTMLCanvasElement) {
    setIsGrading(true);
    setOcrProgress(0);
    setLastScoreResult(null);
    setFullscreenScoreResult(null);
    setGraderMessage("Đang tự động chụp, nhận diện họ tên/lớp/mã đề và đối chiếu đáp án...");

    try {
      const metadata = await extractStudentMetadata(canvas, getOcrWorker, setOcrProgress);
      const studentAnswers = extractMultipleChoiceAnswers(canvas);
      const total = detectedAnswerCount;
      const correct = answerKey.reduce((sum, keyAnswer, index) => {
        if (!keyAnswer) return sum;
        return sum + (studentAnswers[index] === keyAnswer ? 1 : 0);
      }, 0);
      const score = total > 0 ? Number(((correct / total) * 10).toFixed(2)) : 0;
      const nextResult = {
        id: Date.now(),
        name: metadata.name,
        className: metadata.className,
        examCode: metadata.examCode,
        correct,
        total,
        score
      };

      setLastMetadata(metadata);
      setLastScoreResult(nextResult);
      setFullscreenScoreResult(nextResult);
      setResults((current) => [...current, nextResult]);
      setGraderMessage(
        `Đã chấm xong ${correct}/${total} câu. Hãy nhấc bài vừa chấm ra khỏi tập, hệ thống sẽ tự chấm bài kế tiếp.`
      );
      return true;
    } catch (error) {
      setLastScoreResult(null);
      setFullscreenScoreResult(null);
      setGraderMessage(error instanceof Error ? error.message : "Không thể nhận diện thông tin trên phiếu.");
      return false;
    } finally {
      setIsGrading(false);
    }
  }

  function handleDownloadExcel() {
    const html = buildExcelHtml(results);
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    downloadBlob(blob, "ket-qua-cham-bai-trac-nghiem.xls");
  }

  async function getOcrWorker() {
    if (ocrWorkerRef.current) return ocrWorkerRef.current;

    const { createWorker } = await import("tesseract.js");
    const worker = (await createWorker("vie+eng", 1, {
      logger: (message: { status?: string; progress?: number }) => {
        if (message.status === "recognizing text" && typeof message.progress === "number") {
          setOcrProgress(Math.round(message.progress * 100));
        }
      }
    })) as OcrWorker;
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "6"
    });
    ocrWorkerRef.current = worker;
    return worker;
  }

  if (!isSignedIn) {
    return (
      <section className="content-card grader-section" id="cham-bai" aria-labelledby="grader-title">
        <div className="section-heading">
          <span className="step-number">4</span>
          <div>
            <h2 id="grader-title">Chấm bài tự động</h2>
            <p>Tính năng này yêu cầu giáo viên đăng nhập để mở camera, lưu lượt chấm và tải file kết quả.</p>
          </div>
        </div>

        <div className="locked-panel">
          <Lock size={36} />
          <div>
            <strong>Cần đăng nhập để dùng chấm bài tự động</strong>
            <p>Đăng nhập tài khoản đã đăng kí hoặc dùng tài khoản dùng thử để bắt đầu.</p>
          </div>
          <button className="primary-button" type="button" onClick={onRequireAuth}>
            <Lock size={18} />
            <span>Đăng nhập để chấm bài</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="content-card grader-section" id="cham-bai" aria-labelledby="grader-title">
      <div className="section-heading">
        <span className="step-number">4</span>
        <div>
          <h2 id="grader-title">Chấm bài tự động</h2>
          <p>Tạo đáp án đúng theo mẫu 40 câu, đặt tập bài trước camera và để hệ thống tự chấm từng bài vào file Excel.</p>
        </div>
      </div>

      <div className="grader-grid">
        <div className="grader-controls">
          <button className={`answer-key-upload ${canStart ? "has-file" : ""}`} type="button" onClick={openAnswerKeyEditor}>
            <FileCheck2 size={24} />
            <strong>{canStart ? "Sửa đáp án đúng 40 câu" : "Tạo đáp án đúng 40 câu"}</strong>
            <span>Giáo viên chọn đáp án A, B, C, D theo đúng mẫu phiếu trắc nghiệm 40 câu rồi bấm Lưu.</span>
          </button>

          <div className="status-strip">
            <FileCheck2 size={19} />
            <span>
              {canStart ? `${detectedAnswerCount}/${QUESTION_COUNT} đáp án đúng đã lưu` : "Chưa tạo đáp án đúng"}
            </span>
          </div>

          <button
            className="primary-button full-width"
            type="button"
            disabled={sessionStarted || !canStart}
            onClick={handleStart}
          >
            <Play size={19} />
            <span>{sessionStarted ? "Đang chấm tự động" : "Bắt đầu"}</span>
          </button>

          <div className="ocr-hint">
            <FileCheck2 size={18} />
            <span>
              Sau khi bấm Bắt đầu, hệ thống tự chụp khi bài ổn định. Chấm xong một bài, hãy nhấc bài đó ra khỏi tập để
              chuyển sang bài kế tiếp.
            </span>
          </div>

          <button className="ghost-button full-width" type="button" disabled={results.length === 0} onClick={handleDownloadExcel}>
            <FileSpreadsheet size={19} />
            <span>Tải file kết quả Excel</span>
          </button>
        </div>

        <div className="camera-panel">
          <div className="camera-frame">
            {!sessionStarted && <video ref={videoRef} className="camera-video" autoPlay muted playsInline />}
            {sessionStarted && (
              <div className="camera-standby">
                <Camera size={24} />
                <span>Đang chấm trong chế độ toàn màn hình</span>
              </div>
            )}
          </div>
          <div className="camera-caption">
            <Camera size={18} />
            <span>{cameraMessage || "Camera đang khởi động..."}</span>
          </div>
        </div>
      </div>

      {sessionStarted && (
        <div className="grading-fullscreen" role="dialog" aria-modal="true" aria-label="Chấm bài tự động toàn màn hình">
          <video ref={videoRef} className="grading-fullscreen-video" autoPlay muted playsInline />
          {frozenFrameUrl && <img className="grading-frozen-frame" src={frozenFrameUrl} alt="Ảnh bài vừa được chụp để chấm" />}
          {isCaptureFlash && <div className="grading-capture-flash" aria-hidden="true" />}

          <button className="grading-close-button" type="button" onClick={handleStop} aria-label="Thoát chấm bài tự động">
            <X size={22} />
          </button>

          <div className="grading-overlay-status">
            <span className={`grading-live-dot ${isGrading ? "working" : ""}`} />
            <strong>{isGrading ? `Đang chấm ${ocrProgress}%` : "Camera đang tự nhận diện"}</strong>
            <p>{graderMessage || "Đặt bài kiểm tra ngay ngắn trong khung camera."}</p>
          </div>

          {fullscreenScoreResult && (
            <div className="grading-score-overlay" aria-live="polite">
              <span>Điểm</span>
              <strong>{formatScore(fullscreenScoreResult.score)}</strong>
              <p>
                Đúng {fullscreenScoreResult.correct}/{fullscreenScoreResult.total} câu
                {fullscreenScoreResult.name !== "Chưa nhận diện" ? ` - ${fullscreenScoreResult.name}` : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {isAnswerKeyEditorOpen && (
        <AnswerKeyEditor
          answers={draftAnswerKey}
          selectedCount={draftAnswerCount}
          onAnswerChange={handleDraftAnswerChange}
          onClose={() => setIsAnswerKeyEditorOpen(false)}
          onSave={handleSaveAnswerKey}
        />
      )}

      {lastMetadata && (
        <div className="detected-strip" aria-label="Thông tin nhận diện gần nhất">
          <span>
            <strong>Họ tên:</strong> {lastMetadata.name}
          </span>
          <span>
            <strong>Lớp:</strong> {lastMetadata.className}
          </span>
          <span>
            <strong>Mã đề:</strong> {lastMetadata.examCode}
          </span>
        </div>
      )}

      {lastScoreResult && (
        <div className="score-result-card" aria-live="polite" aria-label="Điểm bài vừa chấm">
          <div>
            <span>Điểm bài vừa quét</span>
            <strong>{formatScore(lastScoreResult.score)}</strong>
          </div>
          <p>
            Đúng {lastScoreResult.correct}/{lastScoreResult.total} câu
            {lastScoreResult.name !== "Chưa nhận diện" ? ` - ${lastScoreResult.name}` : ""}
          </p>
        </div>
      )}

      {graderMessage && <Notice state={isGrading ? "working" : detectedAnswerCount > 0 ? "done" : "idle"} message={graderMessage} />}

      {results.length > 0 && (
        <div className="result-panel" aria-label="Bảng kết quả chấm bài">
          <div className="result-heading">
            <h3>Kết quả đã chấm</h3>
            <span>{results.length} học sinh</span>
          </div>
          <div className="result-table-wrap">
            <table className="result-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Lớp</th>
                  <th>Mã đề</th>
                  <th>Số câu đúng/Tổng số câu</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.name}</td>
                    <td>{result.className}</td>
                    <td>{result.examCode}</td>
                    <td>
                      {result.correct}/{result.total}
                    </td>
                    <td>{result.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

type AnswerKeyEditorProps = {
  answers: AnswerValue[];
  selectedCount: number;
  onAnswerChange: (questionIndex: number, answer: Exclude<AnswerValue, null>) => void;
  onClose: () => void;
  onSave: () => void;
};

function AnswerKeyEditor({ answers, selectedCount, onAnswerChange, onClose, onSave }: AnswerKeyEditorProps) {
  return (
    <div className="answer-editor-backdrop" role="dialog" aria-modal="true" aria-label="Tạo đáp án đúng 40 câu">
      <div className="answer-editor-shell">
        <div className="answer-editor-actions">
          <button className="ghost-button compact-button" type="button" onClick={onClose}>
            <X size={17} />
            <span>Đóng</span>
          </button>
          <button className="primary-button compact-button" type="button" onClick={onSave}>
            <FileCheck2 size={17} />
            <span>Lưu đáp án</span>
          </button>
        </div>

        <div className="answer-sheet-form" aria-label="Mẫu nhập đáp án trắc nghiệm 40 câu">
          <div className="answer-sheet-frame">
            <div className="answer-sheet-top">
              <div className="answer-info-grid">
                <label>
                  <span>Họ và tên:</span>
                  <input value="ĐÁP ÁN ĐÚNG" readOnly aria-label="Họ và tên" />
                </label>
                <label>
                  <span>Môn thi:</span>
                  <input value="" readOnly aria-label="Môn thi" />
                </label>
                <label>
                  <span>Lớp:</span>
                  <input value="" readOnly aria-label="Lớp" />
                </label>
                <label>
                  <span>Mã đề:</span>
                  <input value="" readOnly aria-label="Mã đề" />
                </label>
              </div>

              <h3>PHIẾU TRẢ LỜI TRẮC NGHIỆM</h3>
            </div>

            <div className="answer-sheet-part-title">
              <span aria-hidden="true">■</span>
              <strong>PHẦN I</strong>
            </div>

            <div className="answer-bubble-grid">
              {[0, 1, 2, 3].map((groupIndex) => (
                <div className="answer-bubble-group" key={groupIndex}>
                  <div className="answer-choice-header">
                    <span />
                    {CHOICES.map((choice) => (
                      <span key={choice}>{choice}</span>
                    ))}
                  </div>

                  {Array.from({ length: 10 }, (_, rowIndex) => {
                    const questionIndex = groupIndex * 10 + rowIndex;
                    const questionNumber = questionIndex + 1;

                    return (
                      <div className="answer-row" key={questionNumber}>
                        <span className="answer-question-number">{questionNumber}</span>
                        {CHOICES.map((choice) => (
                          <label className="answer-choice" key={choice} aria-label={`Câu ${questionNumber} đáp án ${choice}`}>
                            <input
                              type="radio"
                              name={`answer-${questionNumber}`}
                              checked={answers[questionIndex] === choice}
                              onChange={() => onAnswerChange(questionIndex, choice)}
                            />
                            <span />
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="answer-sheet-note">Lưu ý: Phiếu này chỉ dùng cho đề gồm 40 câu trắc nghiệm A, B, C, D.</p>
          </div>
        </div>

        <div className="answer-editor-footer">
          <span>Đã chọn {selectedCount}/{QUESTION_COUNT} đáp án</span>
          <button className="primary-button" type="button" onClick={onSave}>
            <FileCheck2 size={18} />
            <span>Lưu đáp án</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function createEmptyAnswerKey(): AnswerValue[] {
  return Array.from({ length: QUESTION_COUNT }, () => null);
}

function captureVideoCanvas(video: HTMLVideoElement) {
  if (video.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function getVideoFrameSignature(video: HTMLVideoElement) {
  if (video.readyState < 2) return null;

  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(video, 0, 0, size, size);
  const imageData = context.getImageData(0, 0, size, size);
  const signature: number[] = [];

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    signature.push(red * 0.3 + green * 0.59 + blue * 0.11);
  }

  return signature;
}

function getSignatureDiff(previous: number[], next: number[]) {
  if (previous.length !== next.length) return Number.POSITIVE_INFINITY;
  const total = previous.reduce((sum, value, index) => sum + Math.abs(value - next[index]), 0);
  return total / previous.length;
}

function hasLikelyPaper(signature: number[]) {
  const average = signature.reduce((sum, value) => sum + value, 0) / signature.length;
  const variance =
    signature.reduce((sum, value) => {
      const delta = value - average;
      return sum + delta * delta;
    }, 0) / signature.length;
  const contrast = Math.sqrt(variance);

  return average > 62 && contrast > 8;
}

function extractMultipleChoiceAnswers(source: HTMLCanvasElement): AnswerValue[] {
  const canvas = normalizeCanvas(source, 900, 1273);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return Array.from({ length: QUESTION_COUNT }, () => null);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result: AnswerValue[] = [];
  const columns = [
    { x: 0.07, y: 0.18, w: 0.17, h: 0.23 },
    { x: 0.30, y: 0.18, w: 0.17, h: 0.23 },
    { x: 0.53, y: 0.18, w: 0.17, h: 0.23 },
    { x: 0.76, y: 0.18, w: 0.17, h: 0.23 }
  ];

  columns.forEach((column) => {
    for (let row = 0; row < 10; row += 1) {
      const scores = CHOICES.map((_, choiceIndex) => {
        const x = (column.x + column.w * (0.38 + choiceIndex * 0.19)) * canvas.width;
        const y = (column.y + column.h * (0.17 + row * 0.079)) * canvas.height;
        return sampleDarkness(imageData, canvas.width, canvas.height, x, y, 9);
      });

      const bestScore = Math.max(...scores);
      const runnerUp = [...scores].sort((a, b) => b - a)[1] ?? 0;
      const answer = bestScore > 34 && bestScore - runnerUp > 7 ? CHOICES[scores.indexOf(bestScore)] : null;
      result.push(answer);
    }
  });

  return result;
}

function normalizeCanvas(source: HTMLCanvasElement, targetWidth: number, targetHeight: number) {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  const sourceRatio = source.width / source.height;
  const targetRatio = targetWidth / targetHeight;
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let drawX = 0;
  let drawY = 0;

  if (sourceRatio > targetRatio) {
    drawHeight = targetHeight;
    drawWidth = drawHeight * sourceRatio;
    drawX = (targetWidth - drawWidth) / 2;
  } else {
    drawWidth = targetWidth;
    drawHeight = drawWidth / sourceRatio;
    drawY = (targetHeight - drawHeight) / 2;
  }

  context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
  return canvas;
}

function sampleDarkness(imageData: ImageData, width: number, height: number, centerX: number, centerY: number, radius: number) {
  let total = 0;
  let count = 0;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance > radius) continue;
      const index = (y * width + x) * 4;
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const brightness = (red + green + blue) / 3;
      total += 255 - brightness;
      count += 1;
    }
  }

  return count ? total / count : 0;
}

async function extractStudentMetadata(
  source: HTMLCanvasElement,
  getOcrWorker: () => Promise<OcrWorker>,
  onProgress: (progress: number) => void
): Promise<StudentMetadata> {
  onProgress(0);
  const ocrCanvas = createStudentInfoCanvas(source);
  const worker = await getOcrWorker();
  const {
    data: { text }
  } = await worker.recognize(ocrCanvas);
  onProgress(100);
  return parseStudentMetadata(text);
}

function createStudentInfoCanvas(source: HTMLCanvasElement) {
  const normalized = normalizeCanvas(source, 1200, 1697);
  const cropHeight = Math.round(normalized.height * 0.23);
  const scale = 1.45;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(normalized.width * scale);
  canvas.height = Math.round(cropHeight * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(normalized, 0, 0, normalized.width, cropHeight, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    const gray = red * 0.3 + green * 0.59 + blue * 0.11;
    const highContrast = gray > 182 ? 255 : Math.max(0, gray - 34);
    imageData.data[index] = highContrast;
    imageData.data[index + 1] = highContrast;
    imageData.data[index + 2] = highContrast;
  }
  context.putImageData(imageData, 0, 0);

  return canvas;
}

function parseStudentMetadata(rawText: string): StudentMetadata {
  const cleanedText = rawText
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim();
  const lines = cleanedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    name: findFieldValue(lines, ["ho va ten", "ho ten", "ten"], ["lop", "ma de", "mon", "truong"]) || "Chưa nhận diện",
    className: findFieldValue(lines, ["lop", "l0p"], ["ma de", "mon", "truong", "ho va ten"]) || "Chưa nhận diện",
    examCode: findFieldValue(lines, ["ma de", "ma de thi", "made", "ma oe"], ["lop", "mon", "truong"]) || "Chưa nhận diện",
    rawText: cleanedText
  };
}

function findFieldValue(lines: string[], labels: string[], nextLabels: string[]) {
  for (const line of lines) {
    const foldedLine = foldVietnamese(line);
    const matchedLabel = labels.find((label) => foldedLine.includes(label));
    if (!matchedLabel) continue;

    const startIndex = Math.min(foldedLine.indexOf(matchedLabel) + matchedLabel.length, line.length);
    let value = line.slice(startIndex);
    for (const nextLabel of nextLabels) {
      const nextIndex = foldVietnamese(value).indexOf(nextLabel);
      if (nextIndex >= 0) {
        value = value.slice(0, nextIndex);
      }
    }

    const normalizedValue = cleanFieldValue(value);
    if (normalizedValue) return normalizedValue;
  }

  const compact = lines.join(" ");
  const foldedCompact = foldVietnamese(compact);
  for (const label of labels) {
    const startIndex = foldedCompact.indexOf(label);
    if (startIndex < 0) continue;

    let endIndex = compact.length;
    for (const nextLabel of nextLabels) {
      const candidate = foldedCompact.indexOf(nextLabel, startIndex + label.length);
      if (candidate > startIndex && candidate < endIndex) {
        endIndex = candidate;
      }
    }

    const value = cleanFieldValue(compact.slice(startIndex + label.length, endIndex));
    if (value) return value;
  }

  return "";
}

function cleanFieldValue(value: string) {
  return value
    .replace(/^[\s:：.\-_/\\]+/, "")
    .replace(/[._]{2,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^(la|là)\s+/i, "")
    .trim()
    .slice(0, 80);
}

function foldVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function buildExcelHtml(results: StudentResult[]) {
  const rows = results
    .map(
      (result) => `
        <tr>
          <td>${escapeHtml(result.name)}</td>
          <td>${escapeHtml(result.className)}</td>
          <td>${escapeHtml(result.examCode)}</td>
          <td>${result.correct}/${result.total}</td>
          <td>${result.score}</td>
        </tr>`
    )
    .join("");

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Lớp</th>
              <th>Mã đề</th>
              <th>Số câu đúng/Tổng số câu</th>
              <th>Điểm</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
