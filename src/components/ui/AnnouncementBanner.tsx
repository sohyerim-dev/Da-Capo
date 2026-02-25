import "./AnnouncementBanner.scss";

interface Props {
  onClose: () => void;
}

export default function AnnouncementBanner({ onClose }: Props) {
  return (
    <div className="announcement-banner">
      <a
        className="announcement-banner__content"
        href="mailto:contact@da-capo.co.kr?subject=Da Capo 광고 문의"
      >
        <span className="announcement-banner__icon">🎵</span>
        <span>이 자리에 광고하기</span>
        <span className="announcement-banner__arrow">→</span>
      </a>
      <button
        className="announcement-banner__close"
        onClick={onClose}
        aria-label="배너 닫기"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 6L18 18M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
