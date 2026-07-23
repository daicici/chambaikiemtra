import type { AnswerChoice, AnswerKey } from "@/types/answer";

const STORAGE_KEY = "omr.answerKey";

export function emptyAnswers(): AnswerChoice[] {
  return Array.from({ length: 40 }, () => "A" as AnswerChoice);
}

export function loadAnswerKey(): AnswerKey {
  if (typeof window === "undefined") return { subject: "Toán", exam_code: "000", answers: emptyAnswers(), max_score: 10 };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { subject: "Toán", exam_code: "000", answers: emptyAnswers(), max_score: 10 };
  return JSON.parse(raw) as AnswerKey;
}

export function saveAnswerKey(answerKey: AnswerKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answerKey));
}
