import type { AnswerChoice, AnswerKey } from "@/types/answer";

const STORAGE_KEY = "omr.answerKey";

export function emptyAnswers(): AnswerChoice[] {
  return Array.from({ length: 40 }, () => "A" as AnswerChoice);
}

const DEFAULT_ANSWER_KEY: AnswerKey = {
  subject: "Toán",
  exam_code: "101",
  answers: emptyAnswers(),
  max_score: 10
};

export function loadAnswerKey(): AnswerKey {
  if (typeof window === "undefined") return DEFAULT_ANSWER_KEY;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_ANSWER_KEY;

  const parsed = JSON.parse(raw) as Partial<AnswerKey>;
  return {
    subject: parsed.subject || DEFAULT_ANSWER_KEY.subject,
    exam_code: parsed.exam_code || DEFAULT_ANSWER_KEY.exam_code,
    answers: parsed.answers?.length === 40 ? (parsed.answers as AnswerChoice[]) : emptyAnswers(),
    max_score: parsed.max_score || DEFAULT_ANSWER_KEY.max_score
  };
}

export function saveAnswerKey(answerKey: AnswerKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answerKey));
}
