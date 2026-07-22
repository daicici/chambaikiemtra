import { FileStack, GraduationCap, Sparkles } from "lucide-react";

type HeroSectionProps = {
  onSignup: () => void;
  onJumpToTool: () => void;
};

export function HeroSection({ onSignup, onJumpToTool }: HeroSectionProps) {
  return (
    <section className="hero-section" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Công cụ giáo dục</p>
        <h1 id="hero-title">Tạo mã đề và chấm bài trắc nghiệm tự động</h1>
        <p className="hero-lead">
          Hỗ trợ giáo viên xáo trộn câu hỏi và đáp án theo từng mã đề. Chấm bài tự động và trả kết quả điểm theo đúng danh sách học sinh.
        </p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onJumpToTool}>
            <FileStack size={20} />
            <span>Bắt đầu tạo mã đề</span>
          </button>
          <button className="ghost-button" type="button" onClick={onSignup}>
            <Sparkles size={19} />
            <span>Đăng ký dùng thử</span>
          </button>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="board-card">
          <GraduationCap size={30} />
          <div className="board-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="answer-sheet-card">
          {[0, 1, 2, 3].map((column) => (
            <div className="mini-column" key={column}>
              <strong>{column * 10 + 1}</strong>
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
