import { FormEvent, useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import type { AuthMode } from "../types";

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onLogin: (email: string) => void;
  onSignup: (email: string) => void;
};

export function AuthModal({ mode, onClose, onLogin, onSignup }: AuthModalProps) {
  const [email, setEmail] = useState("giaovien@example.com");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const isSignup = mode === "signup";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignup) {
      onSignup(email);
    } else {
      onLogin(email);
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Đóng popup">
          <X size={20} />
        </button>
        <div className="modal-heading">
          {isSignup ? <UserPlus size={24} /> : <LogIn size={24} />}
          <div>
            <h2 id="auth-modal-title">{isSignup ? "Đăng ký tài khoản" : "Đăng nhập"}</h2>
            <p>{isSignup ? "Tạo tài khoản dùng thử 1 ngày." : "Đăng nhập bằng tài khoản đã đăng ký."}</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Họ và tên
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tên giáo viên" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </label>
          <button className="primary-button full-width" type="submit">
            {isSignup ? <UserPlus size={19} /> : <LogIn size={19} />}
            <span>{isSignup ? "Tạo tài khoản dùng thử" : "Đăng nhập"}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
