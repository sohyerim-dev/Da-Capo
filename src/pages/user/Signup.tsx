import { useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import Button from "@/components/common/Button";
import "./auth.scss";

const DEFAULT_IMAGE =
  "https://api.dicebear.com/7.x/thumbs/svg?seed=dacapo&backgroundColor=f6f3ec";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^01[016789]-\d{3,4}-\d{4}$/;

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const agreeAll = agreeTerms && agreePrivacy;

  const handleAgreeAll = (checked: boolean) => {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  };

  const handleEmailBlur = () => {
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError("올바른 이메일 형식이 아닙니다.");
    } else {
      setEmailError("");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handlePhoneBlur = () => {
    if (phone && !PHONE_REGEX.test(phone)) {
      setPhoneError("올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)");
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
          phone,
          avatar_url: DEFAULT_IMAGE,
          role: "user",
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  };

  const canSubmit =
    EMAIL_REGEX.test(email) &&
    password.length >= 6 &&
    nickname.trim() !== "" &&
    PHONE_REGEX.test(phone) &&
    agreeTerms &&
    agreePrivacy;

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-box auth-box--center">
          <div className="auth-done">
            <p className="auth-done__icon">✉️</p>
            <h2 className="auth-done__title">인증 메일을 발송했습니다</h2>
            <p className="auth-done__desc">
              <strong>{email}</strong>로 인증 링크를 보냈습니다.
              <br />
              메일함을 확인한 후 링크를 클릭하면 인증이 완료됩니다.
              <br />
              인증 완료 후 로그인해주세요.
            </p>
            <Link to="/login" className="btn btn--primary btn--md btn--full">
              로그인 페이지로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="auth-title">회원가입</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>이메일</label>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
            />
            {emailError && <p className="auth-field__error">{emailError}</p>}
          </div>

          <div className="auth-field">
            <label>패스워드</label>
            <input
              type="password"
              placeholder="패스워드 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label>닉네임</label>
            <input
              type="text"
              placeholder="이름"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>연락처</label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              required
            />
            {phoneError && <p className="auth-field__error">{phoneError}</p>}
          </div>

          <div className="auth-terms">
            <label className="auth-terms__all">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => handleAgreeAll(e.target.checked)}
              />
              전체 동의
            </label>
            <hr className="auth-terms__divider" />
            <label className="auth-terms__item">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              [필수] 이용약관 동의
            </label>
            <label className="auth-terms__item">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />
              [필수] 개인정보 처리방침 동의
            </label>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" fullWidth disabled={!canSubmit} loading={loading}>
            회원가입
          </Button>
        </form>
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
