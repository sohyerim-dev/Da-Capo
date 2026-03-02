import { useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import "./auth.scss";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
      setError("비밀번호 재설정 메일 발송에 실패했습니다.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-box auth-box--flat auth-box--center">
          <div className="auth-done">
            <span className="auth-done__icon">✉️</span>
            <h2 className="auth-done__title">메일을 확인해주세요</h2>
            <p className="auth-done__desc">
              {email} 으로<br />
              비밀번호 재설정 링크를 보내드렸습니다.<br />
              메일함을 확인해주세요.
            </p>
            <Link to="/login">
              <Button variant="outline">로그인으로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-box auth-box--flat">
        <h2 className="auth-title">비밀번호 찾기</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="가입한 이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            재설정 메일 보내기
          </Button>
        </form>
        <div className="auth-link">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
