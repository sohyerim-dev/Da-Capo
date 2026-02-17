import { useState } from "react";
import "./Footer.scss";

type ModalType = "terms" | "privacy" | null;

export default function Footer() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <footer className="footer">
        <div className="wrap footer__inner">
          <div className="footer__left">
            <img
              src="/images/dc-logo.svg"
              alt="Da Capo"
              className="footer__logo"
            />
            <div className="footer__desc">
              <p className="footer__desc-top">
                클래식을 가장 쉽게 즐기는 방법,
              </p>
              <p className="footer__desc-bottom">
                클래식 공연 정보 플랫폼 &lt;Da Capo 다 카포&gt;
              </p>
            </div>
          </div>

          <div className="footer__right">
            <dl className="footer__info">
              <div className="footer__info-row">
                <dt>개발 및 운영</dt>
                <dd>소혜림</dd>
              </div>
              <div className="footer__info-row">
                <dt>E-MAIL</dt>
                <dd>musik91@naver.com</dd>
              </div>
            </dl>

            <ul className="footer__links">
              <li>
                <a href="#">Da Capo (다 카포) 소개</a>
              </li>
              <li>
                <a href="#">고객센터</a>
              </li>
              <li>
                <button onClick={() => setModal("terms")}>이용약관</button>
              </li>
              <li>
                <button onClick={() => setModal("privacy")}>
                  개인정보처리방침
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {modal && (
        <div className="footer-modal" onClick={() => setModal(null)}>
          <div
            className="footer-modal__box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="footer-modal__header">
              <h2 className="footer-modal__title">
                {modal === "terms" ? "이용약관" : "개인정보처리방침"}
              </h2>
              <button
                className="footer-modal__close"
                onClick={() => setModal(null)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="footer-modal__body">
              <p>내용을 입력해 주세요.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
