import { Camera, FileCheck2, FileSpreadsheet, Lock, Play, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
  correct: number;
  total: number;
  score: number;
};

type AnswerValue = "A" | "B" | "C" | "D" | null;

const QUESTION_COUNT = 40;
const CHOICES: Exclude<AnswerValue, null>[] = ["A", "B", "C", "D"];

export function AutoGrader({ accountState, onRequireAuth }: AutoGraderProps) {
  const isSignedIn = accountState === "active" || accountState === "trial";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<AnswerValue[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [cameraMessage, setCameraMessage] = useState("");
  const [graderMessage, setGraderMessage] = useState("");
  const [isReadingKey, setIsReadingKey] = useState(false);

  const detectedAnswerCount = useMemo(() => answerKey.filter(Boolean).length, [answerKey]);
  const canStart = Boolean(answerFile) && detectedAnswerCount > 0;
  const canCapture = sessionStarted && canStart && Boolean(studentName.trim()) && Boolean(studentClass.trim());

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
        setCameraMessage("Camera đã sẵn sàng. Có thể chụp từng phiếu sau khi tải đáp án đúng.");
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

  function stopCurrentCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function handleAnswerFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setAnswerFile(nextFile);
    setAnswerKey([]);
    setSessionStarted(false);
    setGraderMessage("");

    if (!nextFile) return;

    setIsReadingKey(true);
    try {
      const canvas = await fileToCanvas(nextFile);
      const key = extractMultipleChoiceAnswers(canvas);
      const count = key.filter(Boolean).length;
      setAnswerKey(key);

      if (count === 0) {
        setGraderMessage("Chưa nhận diện được đáp án đã tô. Hãy dùng ảnh/PDF phiếu đáp án đúng chụp thẳng và tô rõ.");
      } else {
        setGraderMessage(`Đã nhận diện ${count}/${QUESTION_COUNT} đáp án đúng. Nút Bắt đầu đã sẵn sàng.`);
      }
    } catch (error) {
      setGraderMessage(error instanceof Error ? error.message : "Không đọc được file đáp án đúng.");
    } finally {
      setIsReadingKey(false);
    }
  }

  function handleStart() {
    if (!canStart) return;
    setSessionStarted(true);
    setGraderMessage("Đã bắt đầu chấm bài. Nhập tên, lớp rồi chụp phiếu của từng học sinh.");
  }

  function handleCaptureAndGrade() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setGraderMessage("Camera chưa có hình ảnh để chụp.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const studentAnswers = extractMultipleChoiceAnswers(canvas);
    const total = detectedAnswerCount;
    const correct = answerKey.reduce((sum, keyAnswer, index) => {
      if (!keyAnswer) return sum;
      return sum + (studentAnswers[index] === keyAnswer ? 1 : 0);
    }, 0);
    const score = total > 0 ? Number(((correct / total) * 10).toFixed(2)) : 0;

    setResults((current) => [
      ...current,
      {
        id: Date.now(),
        name: studentName.trim(),
        className: studentClass.trim(),
        correct,
        total,
        score
      }
    ]);
    setStudentName("");
    setStudentClass("");
    setGraderMessage(`Đã chấm xong ${correct}/${total} câu. Tiếp tục nhập học sinh kế tiếp.`);
  }

  function handleDownloadExcel() {
    const html = buildExcelHtml(results);
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    downloadBlob(blob, "ket-qua-cham-bai-trac-nghiem.xls");
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
          <p>Tải đáp án đúng, chụp phiếu trả lời của từng học sinh và xuất kết quả thành file Excel.</p>
        </div>
      </div>

      <div className="grader-grid">
        <div className="grader-controls">
          <label className={`answer-key-upload ${answerFile ? "has-file" : ""}`}>
            <Upload size={24} />
            <strong>{answerFile ? answerFile.name : "Tải đáp án đúng PDF hoặc ảnh"}</strong>
            <span>Trên điện thoại có thể chọn chụp ảnh trực tiếp bằng camera.</span>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              capture="environment"
              onChange={handleAnswerFileChange}
            />
          </label>

          <div className="status-strip">
            <FileCheck2 size={19} />
            <span>
              {isReadingKey
                ? "Đang đọc đáp án đúng..."
                : answerFile
                  ? `${detectedAnswerCount}/${QUESTION_COUNT} đáp án đã nhận diện`
                  : "Chưa tải đáp án đúng"}
            </span>
          </div>

          <button className="primary-button full-width" type="button" disabled={!canStart || isReadingKey} onClick={handleStart}>
            <Play size={19} />
            <span>Bắt đầu</span>
          </button>

          <div className="student-form">
            <label>
              Họ và tên học sinh
              <input value={studentName} onChange={(event) => setStudentName(event.target.value)} />
            </label>
            <label>
              Lớp
              <input value={studentClass} onChange={(event) => setStudentClass(event.target.value)} />
            </label>
          </div>

          <button className="primary-button full-width free-button" type="button" disabled={!canCapture} onClick={handleCaptureAndGrade}>
            <Camera size={19} />
            <span>Chụp và chấm bài</span>
          </button>

          <button className="ghost-button full-width" type="button" disabled={results.length === 0} onClick={handleDownloadExcel}>
            <FileSpreadsheet size={19} />
            <span>Tải file kết quả Excel</span>
          </button>
        </div>

        <div className="camera-panel">
          <div className="camera-frame">
            <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
          </div>
          <div className="camera-caption">
            <Camera size={18} />
            <span>{cameraMessage || "Camera đang khởi động..."}</span>
          </div>
        </div>
      </div>

      {graderMessage && <Notice state={detectedAnswerCount > 0 ? "done" : "idle"} message={graderMessage} />}

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
                  <th>Số câu đúng/Tổng số câu</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.name}</td>
                    <td>{result.className}</td>
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

async function fileToCanvas(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return pdfToCanvas(file);
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng tải file PDF hoặc ảnh đáp án đúng.");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

async function pdfToCanvas(file: File) {
  const pdfjsModule = await import("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js");
  const pdfjs = (pdfjsModule as { default?: unknown }).default ?? pdfjsModule;
  const getDocument = (pdfjs as { getDocument: (params: unknown) => { promise: Promise<unknown> } }).getDocument;
  const data = new Uint8Array(await file.arrayBuffer());
  const documentTask = getDocument({ data, disableWorker: true });
  const pdfDocument = (await documentTask.promise) as {
    getPage: (pageNumber: number) => Promise<{
      getViewport: (params: { scale: number }) => { width: number; height: number };
      render: (params: unknown) => { promise: Promise<void> };
    }>;
  };
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được vùng đọc PDF.");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
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

function buildExcelHtml(results: StudentResult[]) {
  const rows = results
    .map(
      (result) => `
        <tr>
          <td>${escapeHtml(result.name)}</td>
          <td>${escapeHtml(result.className)}</td>
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
