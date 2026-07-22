import { Plus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkState } from "../types";
import { Notice } from "./Notice";

type ClassRoom = {
  id: number;
  name: string;
  school: string;
  students: string[];
};

export function ClassManager() {
  const [className, setClassName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [studentText, setStudentText] = useState("");
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [message, setMessage] = useState("");
  const [messageState, setMessageState] = useState<WorkState>("idle");

  const students = useMemo(
    () =>
      studentText
        .split("\n")
        .map((student) => student.trim())
        .filter(Boolean),
    [studentText]
  );

  function handleCreateClass() {
    if (!className.trim()) {
      setMessage("Vui lòng nhập tên lớp trước khi tạo.");
      setMessageState("error");
      return;
    }

    setClasses((current) => [
      {
        id: Date.now(),
        name: className.trim(),
        school: schoolName.trim(),
        students,
      },
      ...current
    ]);
    setClassName("");
    setSchoolName("");
    setStudentText("");
    setMessage(`Đã tạo lớp với ${students.length} học sinh.`);
    setMessageState("done");
  }

  return (
    <section className="content-card" id="tao-lop" aria-labelledby="classroom-title">
      <div className="section-heading">
        <span className="step-number">4</span>
        <div>
          <h2 id="classroom-title">Tạo lớp</h2>
          <p>Tạo danh sách lớp để dùng cho luồng chấm bài và quản lý kết quả sau này.</p>
        </div>
      </div>

      <div className="classroom-grid">
        <div className="classroom-form">
          <label>
            Tên lớp
            <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Ví dụ: 12A1" />
          </label>
          <label>
            Trường
            <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="Tên trường" />
          </label>
          <label>
            Danh sách học sinh
            <textarea
              value={studentText}
              onChange={(event) => setStudentText(event.target.value)}
              placeholder={"Mỗi dòng một học sinh\nNguyễn Văn A\nTrần Thị B"}
            />
          </label>

          <button className="primary-button" type="button" onClick={handleCreateClass}>
            <Plus size={19} />
            <span>Tạo lớp</span>
          </button>

          {message && <Notice state={messageState} message={message} />}
        </div>

        <div className="classroom-list" aria-label="Danh sách lớp đã tạo">
          {classes.length === 0 ? (
            <div className="empty-classroom">
              <UsersRound size={34} />
              <strong>Chưa có lớp nào</strong>
              <span>Nhập tên lớp và danh sách học sinh để tạo lớp đầu tiên.</span>
            </div>
          ) : (
            classes.map((item) => (
              <article className="classroom-card" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.school || "Chưa nhập trường"}</span>
                </div>
                <b>{item.students.length} học sinh</b>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
