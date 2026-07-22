import { BookOpenCheck, LogIn, Menu, UserPlus, X } from "lucide-react";
import { useState } from "react";
import type { AccountState, AuthMode } from "../types";

type SiteHeaderProps = {
  accountState: AccountState;
  accountEmail: string;
  onOpenAuth: (mode: AuthMode) => void;
};

export function SiteHeader({ accountState, accountEmail, onOpenAuth }: SiteHeaderProps) {
  const isSignedIn = accountState === "active" || accountState === "trial";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function openAuth(mode: AuthMode) {
    setIsSidebarOpen(false);
    onOpenAuth(mode);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function renderAuthControls() {
    return isSignedIn ? (
      <span className="signed-in-pill">{accountState === "trial" ? "Dùng thử" : accountEmail}</span>
    ) : (
      <>
        <button className="ghost-button compact-button" type="button" onClick={() => openAuth("login")}>
          <LogIn size={18} />
          <span>Login</span>
        </button>
        <button className="primary-button compact-button" type="button" onClick={() => openAuth("signup")}>
          <UserPlus size={18} />
          <span>Signup</span>
        </button>
      </>
    );
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Trang chủ công cụ tạo mã đề trắc nghiệm" onClick={closeSidebar}>
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

        <div className="header-actions">{renderAuthControls()}</div>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Mở menu"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>
      </header>

      <div className={`mobile-sidebar-layer ${isSidebarOpen ? "is-open" : ""}`} aria-hidden={!isSidebarOpen}>
        <button className="mobile-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={closeSidebar} />
        <aside className="mobile-sidebar" aria-label="Menu điều hướng trên điện thoại">
          <div className="mobile-sidebar-top">
            <a className="brand" href="#top" onClick={closeSidebar}>
              <span className="brand-mark">
                <BookOpenCheck size={22} />
              </span>
              <span>
                <strong>Trắc Nghiệm Pro</strong>
                <small>Công cụ cho giáo viên</small>
              </span>
            </a>
            <button className="icon-button" type="button" aria-label="Đóng menu" onClick={closeSidebar}>
              <X size={20} />
            </button>
          </div>

          <nav className="mobile-sidebar-nav">
            <a href="#tao-ma-de" onClick={closeSidebar}>
              Tạo mã đề
            </a>
            <a href="#cham-bai" onClick={closeSidebar}>
              Chấm bài tự động
            </a>
            <a href="#phieu-tra-loi" onClick={closeSidebar}>
              Phiếu trả lời
            </a>
          </nav>

          <div className="mobile-sidebar-actions">{renderAuthControls()}</div>
        </aside>
      </div>
    </>
  );
}
