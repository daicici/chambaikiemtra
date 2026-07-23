import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page hero-page">
      <section className="hero">
        <div>
          <p className="eyebrow">Chấm bài kiểm tra tự động</p>
          <h1>Chấm phiếu trắc nghiệm 40 câu bằng camera điện thoại</h1>
          <p>
            Tạo đáp án chuẩn, chụp phiếu trả lời, nhận kết quả chấm, sửa thông tin nếu cần và xuất Excel cho cả lớp.
          </p>
          <div className="action-row">
            <Link className="primary-button" href="/answer-key">
              Tạo đáp án
            </Link>
            <Link className="secondary-button" href="/scan">
              Bắt đầu quét
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
