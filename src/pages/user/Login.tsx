import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { supabase } from "@/lib/supabase";
import type { LoginForm } from "@/types/user";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
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
    <div className="auth-page auth-page--login">
      <div className="auth-box auth-box--flat">
        <img src="/images/logo-black.png" alt="Da Capo" className="auth-logo" />
        <p className="auth-subtitle">오늘도 당신의 클래식이 시작됩니다</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            type="email"
            name="email"
            placeholder="아이디"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder="패스워드"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <label className="auth-autologin auth-autologin--right">
            <input
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
            />
            자동 로그인
          </label>
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            로그인
          </Button>
          <Button type="button" fullWidth onClick={() => navigate("/signup")}>
            회원가입
          </Button>
        </form>
      </div>
    </div>
  );
}
