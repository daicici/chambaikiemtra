import type { AnswerKey } from "@/types/answer";

export function validateAnswerKey(answerKey: AnswerKey): string[] {
  const messages: string[] = [];
  if (!answerKey.subject.trim()) messages.push("Vui lòng nhập môn thi.");
  if (!answerKey.exam_code.trim()) messages.push("Vui lòng nhập mã đề.");
  if (answerKey.answers.length !== 40) messages.push("Đáp án phải có đủ 40 câu.");
  return messages;
}
