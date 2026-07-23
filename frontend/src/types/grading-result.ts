import type { AnswerChoice } from "./answer";

export type DetectedAnswer = AnswerChoice | "BLANK" | "MULTIPLE" | "AMBIGUOUS" | "ERROR";

export type QuestionResult = {
  question: number;
  detected_answer: DetectedAnswer;
  correct_answer: AnswerChoice;
  is_correct: boolean;
  confidence: number;
  status: string;
  fill_scores: Record<string, number>;
};

export type GradingResult = {
  scan_id: string;
  scanned_at: string;
  fingerprint: string;
  duplicate: boolean;
  student: {
    name: string;
    class_name: string;
    exam_code: string;
    subject: string;
    raw_name: string;
    raw_class_name: string;
    raw_exam_code: string;
  };
  answers: QuestionResult[];
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  multiple_count: number;
  review_count: number;
  score: number;
  max_score: number;
  status: "ok" | "needs_review" | "rejected" | "duplicate";
  messages: string[];
  annotated_image?: string | null;
};
