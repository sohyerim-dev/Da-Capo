import { useEffect, useRef, useState } from "react";
import "./ShareButton.scss";

interface ShareButtonProps {
  title: string;
}

export default function ShareButton({ title }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const url = window.location.href;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // 무시
    }
  };

  const handleTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const handleFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const handleThread = () => {
    window.open(
      `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  return (
    <div className="share-btn-wrap" ref={ref}>
      <button
        className={`share-btn${open ? " share-btn--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="공유하기"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        공유
      </button>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copied ? "링크가 복사되었습니다" : ""}
      </span>

      {open && (
        <ul className="share-dropdown" role="menu" aria-label="공유 옵션">
          <li role="none">
            <button className="share-dropdown__item" role="menuitem" onClick={handleCopy}>
              <span className="share-dropdown__icon share-dropdown__icon--link" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </li>

          <li role="none">
            <button className="share-dropdown__item" role="menuitem" onClick={handleTwitter}>
              <span className="share-dropdown__icon" aria-hidden="true">
                <img src="/images/x-logo.png" alt="" width="18" height="18" />
              </span>
              X(Twitter)
            </button>
          </li>

          <li role="none">
            <button className="share-dropdown__item" role="menuitem" onClick={handleFacebook}>
              <span className="share-dropdown__icon" aria-hidden="true">
                <img src="/images/facebook-logo.png" alt="" width="18" height="18" />
              </span>
              Facebook
            </button>
          </li>

          <li role="none">
            <button className="share-dropdown__item" role="menuitem" onClick={handleThread}>
              <span className="share-dropdown__icon" aria-hidden="true">
                <img src="/images/threads-logo.png" alt="" width="18" height="18" />
              </span>
              Threads
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
