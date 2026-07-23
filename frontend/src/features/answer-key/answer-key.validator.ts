import type { AnswerKey } from "@/types/answer";

const VALID_CHOICES = new Set(["A", "B", "C", "D"]);

export function validateAnswerKey(answerKey: AnswerKey): string[] {
  const messages: string[] = [];
  if (!answerKey.subject.trim()) messages.push("Vui lòng nhập môn thi.");
  if (!/^\d{3}$/.test(answerKey.exam_code)) messages.push("Mã đề trên mẫu 40_cau.pdf gồm đúng 3 chữ số.");
  if (answerKey.answers.length !== 40) messages.push("Đáp án phải có đủ 40 câu.");
  if (answerKey.answers.some((answer) => !VALID_CHOICES.has(answer))) messages.push("Mỗi câu chỉ được chọn A, B, C hoặc D.");
  if (!answerKey.max_score || answerKey.max_score <= 0) messages.push("Thang điểm phải lớn hơn 0.");
  return messages;
}
