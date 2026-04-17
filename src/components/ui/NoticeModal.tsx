import { useState } from "react";
import "./NoticeModal.scss";

export default function NoticeModal() {
  const storageKey = "noticeModalHiddenDate";
  const today = new Date().toISOString().slice(0, 10);
  const hiddenDate = localStorage.getItem(storageKey);
  const [visible, setVisible] = useState(hiddenDate !== today);

  if (!visible) return null;

  const handleClose = () => setVisible(false);

  const handleHideToday = () => {
    localStorage.setItem(storageKey, today);
    setVisible(false);
  };

  return (
    <div className="notice-modal" onClick={handleClose}>
      <div className="notice-modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="notice-modal__header">
          <h2 className="notice-modal__title">서비스 종료 안내</h2>
        </div>
        <div className="notice-modal__body">
          <p>
            Da Capo는 <strong>2025년 4월 30일</strong>부로 서비스를 종료할
            예정입니다.
          </p>
          <p>그동안 이용해주셔서 감사합니다.</p>
        </div>
        <div className="notice-modal__footer">
          <button className="notice-modal__btn--secondary" onClick={handleHideToday}>
            오늘 하루 보지 않기
          </button>
          <button className="notice-modal__btn--primary" onClick={handleClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
