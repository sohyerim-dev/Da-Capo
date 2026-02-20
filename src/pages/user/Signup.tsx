import { useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import PolicyModal, { type PolicyType } from "@/components/common/PolicyModal";
import "./auth.scss";

const DEFAULT_IMAGE =
  "https://api.dicebear.com/7.x/thumbs/svg?seed=dacapo&backgroundColor=f6f3ec";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^01[016789]-\d{3,4}-\d{4}$/;
const NICKNAME_REGEX = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]*$/;
const RESERVED_NICKNAMES = [
  "다카포",
  "dacapo",
  "개발자",
  "관리자",
  "운영자",
  "시스템",
  "공식",
  "큐레이터",
  "admin",
  "administrator",
  "manager",
  "moderator",
  "mod",
  "master",
  "system",
  "official",
  "staff",
  "bot",
  "curator",
  "support",
  "info",
  "null",
  "undefined",
  "anonymous",
  "익명",
  "test",
  "user",
  "guest",
  "unknown",
  "소혜림",
  "sohyerim",
];

function generateUsername(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

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
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null
  );
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyType | null>(null);

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

  const handleCheckNickname = async () => {
    if (!nickname.trim()) return;

    const lower = nickname.trim().toLowerCase();
    if (RESERVED_NICKNAMES.some((r) => r.toLowerCase() === lower)) {
      setNicknameError("사용할 수 없는 닉네임입니다.");
      setNicknameChecked(false);
      return;
    }

    const { data } = await supabase.rpc("check_nickname_exists", {
      p_nickname: nickname.trim(),
    });
    setNicknameError("");
    setNicknameAvailable(data === false);
    setNicknameChecked(true);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const username = generateUsername();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
          username,
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
    nicknameChecked &&
    nicknameAvailable === true &&
    PHONE_REGEX.test(phone) &&
    agreeTerms &&
    agreePrivacy;

  if (done) {
    return (
      <div className="auth-page auth-page--login">
        <div className="auth-box auth-box--flat auth-box--center">
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
    <div className="auth-page auth-page--login">
      <div className="auth-box auth-box--flat auth-box--wide">
        <img src="/images/logo-black.png" alt="Da Capo" className="auth-logo" />
        <p className="auth-subtitle">클래식과 함께하는 첫 시작</p>
        <form className="auth-form auth-form--signup" onSubmit={handleSubmit}>
          <Input
            type="email"
            label="이메일"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            error={emailError}
            required
          />
          <Input
            type="password"
            label="패스워드"
            placeholder="패스워드 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <div className="auth-nickname-field">
            <div className="auth-nickname-row">
              <Input
                type="text"
                label="닉네임"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!NICKNAME_REGEX.test(value)) {
                    setNicknameError("한글, 영문, 숫자만 입력 가능합니다.");
                    return;
                  }
                  setNicknameError("");
                  setNickname(value);
                  setNicknameChecked(false);
                  setNicknameAvailable(null);
                }}
                required
              />
              <button
                type="button"
                className="auth-check-btn"
                onClick={handleCheckNickname}
                disabled={!nickname.trim()}
              >
                중복확인
              </button>
            </div>
            {nicknameError ? (
              <p className="auth-check-msg auth-check-msg--err">
                {nicknameError}
              </p>
            ) : nicknameAvailable === true ? (
              <p className="auth-check-msg auth-check-msg--ok">
                사용 가능한 닉네임입니다.
              </p>
            ) : nicknameAvailable === false ? (
              <p className="auth-check-msg auth-check-msg--err">
                이미 사용 중인 닉네임입니다.
              </p>
            ) : null}
          </div>
          <Input
            type="tel"
            label="연락처"
            placeholder="010-0000-0000"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            error={phoneError}
            required
          />

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
            <div className="auth-terms__item-row">
              <label className="auth-terms__item">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                [필수] 이용약관 동의
              </label>
              <button
                type="button"
                className="auth-terms__view-btn"
                onClick={() => setPolicyModal("terms")}
              >
                보기
              </button>
            </div>
            <div className="auth-terms__item-row">
              <label className="auth-terms__item">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                />
                [필수] 개인정보 처리방침 동의
              </label>
              <button
                type="button"
                className="auth-terms__view-btn"
                onClick={() => setPolicyModal("privacy")}
              >
                보기
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <Button
            type="submit"
            fullWidth
            disabled={!canSubmit}
            loading={loading}
          >
            회원가입
          </Button>
        </form>
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>

      {policyModal && (
        <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
      )}
    </div>
  );
}
