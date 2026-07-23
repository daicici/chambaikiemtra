import type { GradingResult } from "@/types/grading-result";

type Props = {
  result: GradingResult;
};

export function ResultDetail({ result }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Câu</th>
            <th>Nhận diện</th>
            <th>Đáp án đúng</th>
            <th>Kết quả</th>
            <th>Tin cậy</th>
          </tr>
        </thead>
        <tbody>
          {result.answers.map((answer) => (
            <tr key={answer.question}>
              <td>{answer.question}</td>
              <td className={answer.status !== "detected" ? "review" : ""}>{answer.detected_answer}</td>
              <td>{answer.correct_answer}</td>
              <td>{answer.is_correct ? "Đúng" : "Sai"}</td>
              <td>{Math.round(answer.confidence * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
