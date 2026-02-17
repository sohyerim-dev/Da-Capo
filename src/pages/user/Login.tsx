import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { supabase } from "@/lib/supabase";
import type { LoginForm } from "@/types/user";
import Button from "@/components/common/Button";
import "./auth.scss";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [autoLogin, setAutoLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (error) {
      setError("이메일 또는 패스워드가 올바르지 않습니다.");
      return;
    }

    localStorage.setItem("autoLogin", autoLogin ? "true" : "false");
    if (autoLogin) {
      sessionStorage.removeItem("sessionActive");
    } else {
      sessionStorage.setItem("sessionActive", "true");
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="auth-title">로그인</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              placeholder="이메일"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="auth-field">
            <label>패스워드</label>
            <input
              type="password"
              name="password"
              placeholder="패스워드"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>
          <label className="auth-autologin">
            <input
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
            />
            로그인 상태 유지
          </label>
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            로그인
          </Button>
        </form>
        <p className="auth-link">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
