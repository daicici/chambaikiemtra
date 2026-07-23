export type AnswerChoice = "A" | "B" | "C" | "D";
export type AnswerKey = {
  subject: string;
  exam_code: string;
  answers: AnswerChoice[];
  max_score: number;
};
