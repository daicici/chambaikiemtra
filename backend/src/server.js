import archiver from "archiver";
import cors from "cors";
import express from "express";
import mammoth from "mammoth";
import multer from "multer";
import pdfParse from "pdf-parse";
import PdfPrinter from "pdfmake";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

const PORT = process.env.PORT || 4000;
const ALLOWED_FILE_TYPES = new Set([
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword"
]);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/answer-sheet-template", (_req, res) => {
  const filename = "mau-phieu-trac-nghiem-2025-rut-gon.pdf";
  const candidates = [
    path.resolve(process.cwd(), "output/pdf", filename),
    path.resolve(process.cwd(), "../output/pdf", filename)
  ];
  const templatePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!templatePath) {
    return res.status(404).json({
      message: "Chưa tìm thấy file mẫu phiếu trả lời trắc nghiệm."
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(templatePath);
});

app.post("/api/generate", upload.single("examFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng tải lên một file đề thi." });
    }

    if (!isSupportedFile(req.file)) {
      return res.status(400).json({
        message: "File chưa được hỗ trợ. Vui lòng dùng .txt, .docx hoặc .pdf."
      });
    }

    const text = await extractText(req.file);
    const questions = parseQuestions(text);

    if (questions.length === 0) {
      return res.status(422).json({
        message:
          "Không tìm thấy câu hỏi trắc nghiệm. Hãy kiểm tra định dạng: mỗi câu bắt đầu bằng 'Câu 1.' hoặc '1.', đáp án bắt đầu bằng A., B., C., D."
      });
    }

    const variantCount = clampNumber(req.body.variantCount, 1, 60, 8);
    const title = sanitizeTitle(req.body.title || "De kiem tra trac nghiem");
    const shuffleQuestions = req.body.shuffleQuestions !== "false";
    const shuffleAnswers = req.body.shuffleAnswers !== "false";
    const includeAnswerKey = req.body.includeAnswerKey === "true";
    const baseCode = normalizeCode(req.body.baseCode || "MD");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFilename(title)}-ma-de.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      throw error;
    });
    archive.pipe(res);

    for (let index = 1; index <= variantCount; index += 1) {
      const examCode = `${baseCode}${String(index).padStart(3, "0")}`;
      const variant = createVariant(questions, {
        seed: `${Date.now()}-${examCode}-${req.file.originalname}`,
        shuffleQuestions,
        shuffleAnswers
      });
      const pdfBuffer = await createPdf({
        title,
        examCode,
        questions: variant,
        includeAnswerKey
      });

      archive.append(pdfBuffer, { name: `${asciiFilename(title)}-${examCode}.pdf` });
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Có lỗi khi tạo mã đề. Vui lòng kiểm tra file và thử lại."
      });
    }
  }
});

app.post("/api/answer-sheet", upload.single("examFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng tải lên một file đề thi để đếm số câu." });
    }

    if (!isSupportedFile(req.file)) {
      return res.status(400).json({
        message: "File chưa được hỗ trợ. Vui lòng dùng .txt, .docx hoặc .pdf."
      });
    }

    const text = await extractText(req.file);
    const questions = parseQuestions(text);
    const manualQuestionCount = clampNumber(req.body.questionCount, 1, 200, 0);
    const questionCount = questions.length || manualQuestionCount;

    if (questionCount === 0) {
      return res.status(422).json({
        message:
          "Không đếm được số câu từ file. Hãy kiểm tra định dạng câu hỏi hoặc nhập số câu thủ công."
      });
    }

    const studentName = sanitizeOptionalText(req.body.studentName);
    const className = sanitizeOptionalText(req.body.className);
    const schoolName = sanitizeOptionalText(req.body.schoolName);
    const examCode = sanitizeOptionalText(req.body.examCode);
    const pdfBuffer = await createAnswerSheetPdf({
      studentName,
      className,
      schoolName,
      examCode,
      questionCount
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="phieu-tra-loi-${asciiFilename(examCode || studentName || "trac-nghiem")}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Có lỗi khi tạo phiếu trả lời. Vui lòng kiểm tra file và thử lại."
      });
    }
  }
});

function isSupportedFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return (
    ALLOWED_FILE_TYPES.has(file.mimetype) ||
    [".txt", ".docx", ".pdf"].includes(extension)
  );
}

async function extractText(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".docx" || file.mimetype.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (extension === ".pdf" || file.mimetype === "application/pdf") {
    const result = await pdfParse(file.buffer);
    return result.text;
  }

  return file.buffer.toString("utf8");
}

function parseQuestions(rawText) {
  const text = rawText
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .trim();

  if (!text) {
    return [];
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (isQuestionStart(line) && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks
    .map(parseQuestionBlock)
    .filter((question) => question && question.options.length >= 2);
}

function isQuestionStart(line) {
  return /^(câu|cau|question)?\s*\d{1,3}[\.\):]\s+/i.test(line);
}

function parseQuestionBlock(block) {
  const answerLine = block.match(/(?:đáp\s*án|dap\s*an|answer)\s*[:\-]\s*([A-D])/i);
  const explicitCorrectLabel = answerLine?.[1]?.toUpperCase();
  const cleanedBlock = block.replace(/(?:đáp\s*án|dap\s*an|answer)\s*[:\-]\s*[A-D].*/gi, "");
  const optionPattern = /(?:^|\n)\s*([A-D])[\.\)]\s+([\s\S]*?)(?=\n\s*[A-D][\.\)]\s+|$)/gi;
  const options = [];
  let firstOptionIndex = -1;
  let match;

  while ((match = optionPattern.exec(cleanedBlock)) !== null) {
    if (firstOptionIndex === -1) {
      firstOptionIndex = match.index;
    }

    const label = match[1].toUpperCase();
    let text = match[2].replace(/\n+/g, " ").trim();
    const markedCorrect = /^[*\u2713]/.test(text) || /\[(x|đúng|dung|correct)\]/i.test(text);
    text = text.replace(/^[*\u2713]\s*/, "").replace(/\[(x|đúng|dung|correct)\]/gi, "").trim();
    options.push({
      originalLabel: label,
      text,
      isCorrect: markedCorrect || label === explicitCorrectLabel
    });
  }

  const questionTextSource =
    firstOptionIndex >= 0 ? cleanedBlock.slice(0, firstOptionIndex) : cleanedBlock;
  const text = questionTextSource
    .replace(/^(câu|cau|question)?\s*\d{1,3}[\.\):]\s*/i, "")
    .replace(/\n+/g, " ")
    .trim();

  if (!text || options.length < 2) {
    return null;
  }

  return { text, options };
}

function createVariant(questions, options) {
  const random = seededRandom(hashString(options.seed));
  const preparedQuestions = questions.map((question) => ({
    ...question,
    options: options.shuffleAnswers
      ? shuffle(question.options, random)
      : question.options.map((answer) => ({ ...answer }))
  }));

  return options.shuffleQuestions ? shuffle(preparedQuestions, random) : preparedQuestions;
}

function shuffle(items, random) {
  const result = items.map((item) => ({ ...item }));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

async function createPdf({ title, examCode, questions, includeAnswerKey }) {
  const printer = new PdfPrinter(getFonts());
  const content = [
    { text: title, style: "title" },
    {
      columns: [
        { text: "Họ và tên: ................................................", width: "*" },
        { text: `Mã đề: ${examCode}`, width: 110, alignment: "right", bold: true }
      ],
      margin: [0, 0, 0, 12]
    },
    { text: "Lớp: ....................   Ngày kiểm tra: ....../....../......", margin: [0, 0, 0, 14] }
  ];

  questions.forEach((question, questionIndex) => {
    content.push({
      text: `${questionIndex + 1}. ${question.text}`,
      style: "question"
    });

    question.options.forEach((option, optionIndex) => {
      const label = String.fromCharCode(65 + optionIndex);
      content.push({
        text: `${label}. ${option.text}`,
        style: "option"
      });
    });
  });

  if (includeAnswerKey) {
    const answerKey = questions
      .map((question, questionIndex) => {
        const correctIndex = question.options.findIndex((option) => option.isCorrect);
        if (correctIndex < 0) {
          return `${questionIndex + 1}. -`;
        }
        return `${questionIndex + 1}. ${String.fromCharCode(65 + correctIndex)}`;
      })
      .join("   ");

    content.push({ text: "Đáp án", style: "answerTitle", pageBreak: "before" });
    content.push({ text: answerKey, style: "answerKey" });
  }

  const documentDefinition = {
    pageSize: "A4",
    pageMargins: [42, 36, 42, 42],
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
      lineHeight: 1.22
    },
    styles: {
      title: {
        fontSize: 16,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 12]
      },
      question: {
        bold: true,
        margin: [0, 9, 0, 4]
      },
      option: {
        margin: [16, 1, 0, 2]
      },
      answerTitle: {
        fontSize: 15,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 12]
      },
      answerKey: {
        fontSize: 11,
        lineHeight: 1.5
      }
    },
    content
  };

  return new Promise((resolve, reject) => {
    const pdfDocument = printer.createPdfKitDocument(documentDefinition);
    const chunks = [];
    pdfDocument.on("data", (chunk) => chunks.push(chunk));
    pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDocument.on("error", reject);
    pdfDocument.end();
  });
}

async function createAnswerSheetPdf({
  studentName,
  className,
  schoolName,
  examCode,
  questionCount
}) {
  const printer = new PdfPrinter(getFonts());
  const content = [
    {
      columns: [
        { text: `Trường: ${schoolName || "................................................"}`, width: "*" },
        { text: `Mã đề: ${examCode || "................"}`, width: 170, alignment: "right", bold: true }
      ],
      margin: [0, 0, 0, 8]
    },
    {
      columns: [
        { text: `Tên: ${studentName || "................................................"}`, width: "*" },
        { text: `Lớp: ${className || "................"}`, width: 170, alignment: "right" }
      ],
      margin: [0, 0, 0, 12]
    },
    {
      text: "PHIẾU TRẢ LỜI TRẮC NGHIỆM",
      style: "answerSheetTitle"
    },
    {
      columns: [
        {
          width: 10,
          canvas: [{ type: "rect", x: 0, y: 4, w: 7, h: 7, color: "#151515" }]
        },
        { text: "PHẦN I", style: "sectionTitle", width: "*" }
      ],
      margin: [0, 5, 0, 6]
    },
    ...buildAnswerSheetRows(questionCount)
  ];

  const documentDefinition = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 24, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      lineHeight: 1.15
    },
    styles: {
      answerSheetTitle: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 2, 0, 10]
      },
      sectionTitle: {
        bold: true,
        color: "#4b1e1f",
        fontSize: 12
      },
      answerHeader: {
        bold: true,
        color: "#c1537a",
        fontSize: 8,
        alignment: "center"
      },
      answerNumber: {
        bold: true,
        fontSize: 8,
        alignment: "right"
      },
      answerBubble: {
        color: "#c1537a",
        fontSize: 13,
        alignment: "center"
      }
    },
    content
  };

  return new Promise((resolve, reject) => {
    const pdfDocument = printer.createPdfKitDocument(documentDefinition);
    const chunks = [];
    pdfDocument.on("data", (chunk) => chunks.push(chunk));
    pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDocument.on("error", reject);
    pdfDocument.end();
  });
}

function buildAnswerSheetRows(questionCount) {
  const blocks = [];
  for (let start = 1; start <= questionCount; start += 10) {
    const end = Math.min(start + 9, questionCount);
    blocks.push(createAnswerBlock(start, end));
  }

  const rows = [];
  for (let index = 0; index < blocks.length; index += 4) {
    const rowBlocks = blocks.slice(index, index + 4);
    while (rowBlocks.length < 4) {
      rowBlocks.push({ text: "", width: "*" });
    }

    rows.push({
      columns: rowBlocks,
      columnGap: 14,
      margin: [0, 0, 0, 12]
    });
  }

  return rows;
}

function createAnswerBlock(start, end) {
  const body = [
    [
      { text: "", border: [false, false, false, false] },
      { text: "A", style: "answerHeader" },
      { text: "B", style: "answerHeader" },
      { text: "C", style: "answerHeader" },
      { text: "D", style: "answerHeader" }
    ]
  ];

  for (let questionNumber = start; questionNumber <= end; questionNumber += 1) {
    body.push([
      { text: String(questionNumber), style: "answerNumber" },
      { text: "○", style: "answerBubble" },
      { text: "○", style: "answerBubble" },
      { text: "○", style: "answerBubble" },
      { text: "○", style: "answerBubble" }
    ]);
  }

  return {
    width: "*",
    table: {
      widths: [24, "*", "*", "*", "*"],
      body
    },
    layout: {
      hLineColor: () => "#dc6f91",
      vLineColor: () => "#dc6f91",
      hLineWidth: (lineIndex, node) => (lineIndex === 0 || lineIndex === node.table.body.length ? 1.1 : 0),
      vLineWidth: (lineIndex, node) => (lineIndex === 0 || lineIndex === node.table.widths.length ? 1.1 : 0),
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 1,
      paddingBottom: () => 1
    },
    margin: [0, 0, 0, 0]
  };
}

function getFonts() {
  const windowsFonts = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
  const candidates = [
    {
      normal: path.join(windowsFonts, "arial.ttf"),
      bold: path.join(windowsFonts, "arialbd.ttf"),
      italics: path.join(windowsFonts, "ariali.ttf"),
      bolditalics: path.join(windowsFonts, "arialbi.ttf")
    },
    {
      normal: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      italics: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
      bolditalics: "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"
    }
  ];

  const fontSet = candidates.find((candidate) =>
    Object.values(candidate).every((fontPath) => fs.existsSync(fontPath))
  );

  if (!fontSet) {
    return {
      Roboto: getBundledRobotoFonts()
    };
  }

  return {
    Roboto: fontSet
  };
}

function getBundledRobotoFonts() {
  const vfs = require("pdfmake/build/vfs_fonts.js");
  return {
    normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64")
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return fallback;
  }
  return Math.min(Math.max(number, min), max);
}

function sanitizeTitle(value) {
  return String(value).trim().slice(0, 120) || "De kiem tra trac nghiem";
}

function sanitizeOptionalText(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizeCode(value) {
  const normalized = String(value).trim().replace(/[^a-z0-9_-]/gi, "").slice(0, 10);
  return normalized || "MD";
}

function asciiFilename(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "de-trac-nghiem";
}

const frontendDist = [
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist")
].find((candidate) => fs.existsSync(path.join(candidate, "index.html")));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Backend dang chay tai http://localhost:${PORT}`);
});
