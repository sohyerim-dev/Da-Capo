import { useState } from "react";
import { Link } from "react-router";
import PolicyModal, { type PolicyType } from "@/components/common/PolicyModal";
import "./Footer.scss";

export default function Footer() {
  const [modal, setModal] = useState<PolicyType | null>(null);

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
                클래식을 발견하는 가장 좋은 방법,
              </p>
              <p className="footer__desc-bottom">
                클래식 공연 중심 플랫폼 &lt;Da Capo 다 카포&gt;
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
                <dd>contact@da-capo.co.kr</dd>
              </div>
            </dl>

            <ul className="footer__links">
              <li>
                <Link to="/about">Da Capo (다 카포) 소개</Link>
              </li>
              <li>
                <Link to="/support">고객센터</Link>
              </li>
              <li>
                <button onClick={() => setModal("terms")} aria-haspopup="dialog">이용약관</button>
              </li>
              <li>
                <button onClick={() => setModal("privacy")} aria-haspopup="dialog">
                  개인정보처리방침
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="wrap footer__copyright">
          © Da Capo. All rights reserved.
        </div>
      </footer>

      {modal && <PolicyModal type={modal} onClose={() => setModal(null)} />}
    </>
  );
}
