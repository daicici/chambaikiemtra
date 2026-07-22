import { BookOpenCheck, LogIn, UserPlus } from "lucide-react";
import type { AccountState, AuthMode } from "../types";

type SiteHeaderProps = {
  accountState: AccountState;
  accountEmail: string;
  onOpenAuth: (mode: AuthMode) => void;
};

export function SiteHeader({ accountState, accountEmail, onOpenAuth }: SiteHeaderProps) {
  const isSignedIn = accountState === "active" || accountState === "trial";

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Trang chủ công cụ tạo mã đề trắc nghiệm">
        <span className="brand-mark">
          <BookOpenCheck size={24} />
        </span>
        <span>
          <strong>Trắc Nghiệm Pro</strong>
          <small>Công cụ cho giáo viên</small>
        </span>
      </a>

      <nav className="site-nav" aria-label="Điều hướng chính">
        <a href="#tao-ma-de">Tạo mã đề</a>
        <a href="#cham-bai">Chấm bài tự động</a>
        <a href="#phieu-tra-loi">Phiếu trả lời</a>
      </nav>

      <div className="header-actions">
        {isSignedIn ? (
          <span className="signed-in-pill">{accountState === "trial" ? "Dùng thử" : accountEmail}</span>
        ) : (
          <>
            <button className="ghost-button compact-button" type="button" onClick={() => onOpenAuth("login")}>
              <LogIn size={18} />
              <span>Login</span>
            </button>
            <button className="primary-button compact-button" type="button" onClick={() => onOpenAuth("signup")}>
              <UserPlus size={18} />
              <span>Signup</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
