import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import "./auth.scss";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      if (error.message?.includes("different from the old password")) {
        setError("이전과 같은 비밀번호는 사용할 수 없습니다.");
      } else if (error.message?.includes("should be at least")) {
        setError("비밀번호가 너무 짧습니다.");
      } else {
        setError("비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.");
      }
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-box auth-box--flat auth-box--center">
          <div className="auth-done">
            <span className="auth-done__icon">✅</span>
            <h2 className="auth-done__title">비밀번호가 변경되었습니다</h2>
            <p className="auth-done__desc">
              새 비밀번호로 로그인해주세요.
            </p>
            <Button onClick={() => navigate("/login")}>로그인</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-box auth-box--flat">
        <h2 className="auth-title">새 비밀번호 설정</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            type="password"
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            비밀번호 변경
          </Button>
        </form>
      </div>
    </div>
  );
}
