import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import "./MyPage.scss";

const PHONE_REGEX = /^01[016789]-\d{3,4}-\d{4}$/;
const NICKNAME_REGEX = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]*$/;
const RESERVED_NICKNAMES = [
  "다카포", "dacapo", "개발자", "관리자", "운영자", "시스템", "공식", "큐레이터",
  "admin", "administrator", "manager", "moderator", "mod", "master",
  "system", "official", "staff", "bot", "curator", "support", "info",
  "null", "undefined", "anonymous", "익명", "test", "user", "guest", "unknown",
  "소혜림", "sohyerim",
];

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

type MessageState = { type: "success" | "error"; text: string } | null;

export default function MyPage() {
  const navigate = useNavigate();
  const { user, setUser, resetUser } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 프로필 이미지
  const [imagePreview, setImagePreview] = useState<string>(user?.image ?? "");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");

  // 기본 정보
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [nicknameChecked, setNicknameChecked] = useState(true);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameError, setNicknameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<MessageState>(null);

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // 클래식 노트 공개 설정
  const [isNotePublic, setIsNotePublic] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);

  // 회원 탈퇴
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 프로필 초기 로딩
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("nickname, phone, avatar_url, classic_note_public")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.nickname) setNickname(data.nickname);
          if (data.phone) setPhone(data.phone);
          if (data.avatar_url) setImagePreview(data.avatar_url);
          setIsNotePublic(data.classic_note_public ?? false);
          setUser({
            ...user,
            nickname: data.nickname ?? user.nickname,
            phone: data.phone ?? user.phone,
            image: data.avatar_url ?? user.image,
          });
        }
        setProfileLoading(false);
      });
  // user?.id가 바뀔 때만 실행 (setUser는 의존성에서 제외)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setImageError("");

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setImageLoading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error || !data) {
      setImageError("업로드에 실패했습니다. 다시 시도해주세요.");
      setImagePreview(user.image ?? "");
      setImageLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: urlData.publicUrl },
    });

    if (!updateError) {
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);
      setUser({ ...user, image: urlData.publicUrl });
    }

    setImageLoading(false);
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

  const handleSaveInfo = async () => {
    if (!user) return;
    setInfoLoading(true);
    setInfoMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { nickname: nickname.trim(), phone },
    });

    if (error) {
      setInfoMessage({ type: "error", text: "저장에 실패했습니다." });
      setInfoLoading(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ nickname: nickname.trim(), phone })
      .eq("id", user.id);

    setUser({ ...user, nickname: nickname.trim(), phone });
    setInfoMessage({ type: "success", text: "정보가 저장되었습니다." });
    setInfoLoading(false);
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPw !== confirmPw) {
      setPwError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setPwLoading(true);
    setPwError("");
    setPwSuccess("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });

    if (signInError) {
      setPwError("현재 비밀번호가 올바르지 않습니다.");
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwError("비밀번호 변경에 실패했습니다.");
    } else {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess("비밀번호가 변경되었습니다.");
    }
    setPwLoading(false);
  };

  const handleNoteToggle = async () => {
    if (!user) return;
    const newValue = !isNotePublic;
    setNoteLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ classic_note_public: newValue })
      .eq("id", user.id);
    if (!error) setIsNotePublic(newValue);
    setNoteLoading(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const { error } = await supabase.rpc("delete_user");
    if (error) {
      setDeleteLoading(false);
      return;
    }
    resetUser();
    navigate("/");
  };

  const nicknameUnchanged = nickname.trim() === (user?.nickname ?? "");
  const canSaveInfo =
    !nicknameError &&
    !phoneError &&
    nickname.trim().length > 0 &&
    PHONE_REGEX.test(phone) &&
    (nicknameUnchanged || (nicknameChecked && nicknameAvailable === true));
  const canChangePassword =
    currentPw.length > 0 && newPw.length >= 6 && confirmPw.length > 0;

  if (!user) return null;

  if (profileLoading) {
    return (
      <div className="mypage">
        <div className="mypage__inner">
          <div className="mypage__profile-card">
            <div className="mypage__skeleton-avatar" />
            <div className="mypage__user-info">
              <div className="mypage__skeleton-line mypage__skeleton-line--name" />
              <div className="mypage__skeleton-line mypage__skeleton-line--email" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mypage__section">
              <div className="mypage__skeleton-line mypage__skeleton-line--section-title" />
              <div className="mypage__skeleton-line mypage__skeleton-line--field" />
              <div className="mypage__skeleton-line mypage__skeleton-line--field" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const avatarSrc =
    imagePreview ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.id}&backgroundColor=f6f3ec`;

  return (
    <div className="mypage">
      <div className="mypage__inner">
        {/* 프로필 카드 */}
        <div className="mypage__profile-card">
          <button
            type="button"
            className="mypage__avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageLoading}
            aria-label="프로필 이미지 변경"
          >
            <img className="mypage__avatar" src={avatarSrc} alt={user.nickname} />
            <span className="mypage__avatar-overlay">
              {imageLoading ? "업로드 중..." : "변경"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="mypage__file-input"
            onChange={handleImageChange}
          />
          <div className="mypage__user-info">
            <h2 className="mypage__nickname">{user.nickname}</h2>
            <p className="mypage__email">{user.email}</p>
            {imageError && <p className="mypage__image-error">{imageError}</p>}
          </div>
        </div>

        {/* 기본 정보 수정 */}
        <section className="mypage__section">
          <h3 className="mypage__section-title">기본 정보</h3>

          <div className="mypage__nickname-field">
            <div className="mypage__nickname-row">
              <Input
                type="text"
                label="닉네임"
                value={nickname}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!NICKNAME_REGEX.test(value)) {
                    setNicknameError("한글, 영문, 숫자만 입력 가능합니다.");
                    return;
                  }
                  setNicknameError("");
                  setNickname(value);
                  const isSame = value.trim() === (user?.nickname ?? "");
                  setNicknameChecked(isSame);
                  if (!isSame) setNicknameAvailable(null);
                }}
                required
              />
              <button
                type="button"
                className="mypage__check-btn"
                onClick={handleCheckNickname}
                disabled={!nickname.trim() || nicknameUnchanged || !!nicknameError}
              >
                중복확인
              </button>
            </div>
            {nicknameError ? (
              <p className="mypage__check-msg mypage__check-msg--err">{nicknameError}</p>
            ) : nicknameAvailable === true ? (
              <p className="mypage__check-msg mypage__check-msg--ok">사용 가능한 닉네임입니다.</p>
            ) : nicknameAvailable === false ? (
              <p className="mypage__check-msg mypage__check-msg--err">이미 사용 중인 닉네임입니다.</p>
            ) : null}
          </div>

          <div>
            <Input
              type="tel"
              label="연락처"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => {
                setPhone(formatPhone(e.target.value));
                setPhoneError("");
              }}
              onBlur={() => {
                if (phone && !PHONE_REGEX.test(phone)) {
                  setPhoneError("올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)");
                }
              }}
              error={phoneError}
            />
          </div>

          <Input
            type="email"
            label="이메일"
            value={user.email}
            readOnly
            disabled
          />

          {infoMessage && (
            <p className={`mypage__message mypage__message--${infoMessage.type}`}>
              {infoMessage.text}
            </p>
          )}

          <div className="mypage__save-row">
            <Button
              type="button"
              disabled={!canSaveInfo}
              loading={infoLoading}
              onClick={handleSaveInfo}
            >
              저장하기
            </Button>
          </div>
        </section>

        {/* 비밀번호 변경 */}
        <section className="mypage__section">
          <h3 className="mypage__section-title">비밀번호 변경</h3>

          <Input
            type="password"
            label="현재 비밀번호"
            placeholder="현재 비밀번호"
            value={currentPw}
            onChange={(e) => {
              setCurrentPw(e.target.value);
              setPwError("");
              setPwSuccess("");
            }}
          />
          <Input
            type="password"
            label="새 비밀번호"
            placeholder="새 비밀번호 (6자 이상)"
            value={newPw}
            onChange={(e) => {
              setNewPw(e.target.value);
              setPwError("");
              setPwSuccess("");
            }}
          />
          <Input
            type="password"
            label="새 비밀번호 확인"
            placeholder="새 비밀번호 확인"
            value={confirmPw}
            onChange={(e) => {
              setConfirmPw(e.target.value);
              setPwError("");
              setPwSuccess("");
            }}
          />

          {pwError && <p className="mypage__message mypage__message--error">{pwError}</p>}
          {pwSuccess && <p className="mypage__message mypage__message--success">{pwSuccess}</p>}

          <div className="mypage__save-row">
            <Button
              type="button"
              disabled={!canChangePassword}
              loading={pwLoading}
              onClick={handleChangePassword}
            >
              변경하기
            </Button>
          </div>
        </section>

        {/* 클래식 노트 공개 설정 */}
        <section className="mypage__section">
          <h3 className="mypage__section-title">나의 클래식 노트</h3>
          <div className="mypage__toggle-row">
            <div>
              <p className="mypage__toggle-label">공개 설정</p>
              <p className="mypage__toggle-desc">
                공개로 설정하면 다른 사용자들이 나의 클래식 노트를 볼 수 있습니다.
              </p>
            </div>
            <label className="mypage__toggle">
              <input
                type="checkbox"
                checked={isNotePublic}
                onChange={() => { void handleNoteToggle(); }}
                disabled={noteLoading}
              />
              <span className="mypage__toggle-track" />
            </label>
          </div>
          <p className="mypage__toggle-status">
            현재: <strong>{isNotePublic ? "공개" : "비공개"}</strong>
          </p>
        </section>

        {/* 계정 탈퇴 */}
        <div className="mypage__danger">
          <h3 className="mypage__danger-title">계정 탈퇴</h3>
          {!showDeleteConfirm ? (
            <>
              <p className="mypage__danger-desc">
                탈퇴 시 계정 정보 및 개인 식별 정보가 삭제됩니다.<br />
                공개 상태로 작성된 게시글은 삭제되지 않으며, 작성자 닉네임은 유지됩니다.
              </p>
              <button
                type="button"
                className="mypage__btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                회원 탈퇴
              </button>
            </>
          ) : (
            <>
              <p className="mypage__danger-desc">
                정말로 탈퇴하시겠습니까? <strong>이 작업은 되돌릴 수 없습니다.</strong>
              </p>
              <div className="mypage__danger-actions">
                <button
                  type="button"
                  className="mypage__btn-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="mypage__btn-danger-confirm"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "처리 중..." : "탈퇴 확인"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
