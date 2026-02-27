import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useMatch, useNavigate } from "react-router";
import useUserStore from "@/zustand/userStore";
import { supabase } from "@/lib/supabase";
import "./Header.scss";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resetUser } = useUserStore();
  const isClassicNotePublic = useMatch("/classic-note/:username");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetUser();
    navigate("/");
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="header header--black">
        <div className="wrap header__inner">
          <Link to="/" className="header__logo" aria-label="Da Capo 홈">
            <img
              src="/images/logo-black.png"
              alt="Da Capo"
              draggable="false"
            />
          </Link>

          <div className="header__right">
            <nav className="header__nav" aria-label="주 메뉴">
              <NavLink to="/concert-info" aria-current={location.pathname.startsWith("/concert-info") ? "page" : undefined}>공연</NavLink>
              <NavLink to="/magazine" aria-current={location.pathname.startsWith("/magazine") ? "page" : undefined}>매거진</NavLink>
              <NavLink
                to="/community"
                className={({ isActive }) => isActive || !!isClassicNotePublic ? "active" : ""}
                aria-current={location.pathname.startsWith("/community") || !!isClassicNotePublic ? "page" : undefined}
              >
                커뮤니티
              </NavLink>
              <NavLink
                to="/classic-note"
                end
                aria-current={location.pathname.startsWith("/classic-note") ? "page" : undefined}
              >
                나의 클래식 노트
              </NavLink>
            </nav>
          <div className="header__actions">
            <div className={`header__user-menu${user ? " header__user-menu--active" : ""}`}>
              <Link
                to={user ? "/mypage" : "/login"}
                className="header__icon"
                aria-label={user ? "내 계정" : "로그인"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </Link>
              {user && (
                <ul className="header__dropdown" role="menu" aria-label="계정 메뉴">
                  <li role="none">
                    <Link to="/mypage" className="header__dropdown-item" role="menuitem">마이페이지</Link>
                  </li>
                  <li role="none">
                    <button className="header__dropdown-item" role="menuitem" onClick={handleLogout}>로그아웃</button>
                  </li>
                </ul>
              )}
            </div>
            <button
              className="header__icon header__hamburger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-drawer"
            >
              {isMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6L18 18M6 18L18 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="header__overlay" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      )}

      <div
        id="mobile-drawer"
        className={`header__drawer ${isMenuOpen ? "header__drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="모바일 메뉴"
        inert={!isMenuOpen}
      >
        <div className="header__drawer-header">
          <Link to="/" className="header__drawer-logo" onClick={() => setIsMenuOpen(false)} aria-label="Da Capo 홈">
            <img src="/images/logo-black.png" alt="Da Capo" draggable="false" />
          </Link>
          <button
            className="header__drawer-close"
            onClick={() => setIsMenuOpen(false)}
            aria-label="메뉴 닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </button>
        </div>

        <nav className="header__drawer-nav" aria-label="모바일 메뉴">
          <NavLink to="/" aria-current={location.pathname === "/" ? "page" : undefined}>홈</NavLink>
          <NavLink to="/concert-info" aria-current={location.pathname.startsWith("/concert-info") ? "page" : undefined}>공연</NavLink>
          <NavLink to="/magazine" aria-current={location.pathname.startsWith("/magazine") ? "page" : undefined}>매거진</NavLink>
          <NavLink
            to="/community"
            className={({ isActive }) => isActive || !!isClassicNotePublic ? "active" : ""}
            aria-current={location.pathname.startsWith("/community") || !!isClassicNotePublic ? "page" : undefined}
          >
            커뮤니티
          </NavLink>
          <NavLink
            to="/classic-note"
            end
            aria-current={location.pathname.startsWith("/classic-note") ? "page" : undefined}
          >
            나의 클래식 노트
          </NavLink>
        </nav>

        <div className="header__drawer-actions">
          <Link to="/mypage" className="header__drawer-icon" aria-label="마이페이지">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>마이페이지</span>
          </Link>
          {user ? (
            <button className="header__drawer-icon" onClick={handleLogout} aria-label="로그아웃">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span>로그아웃</span>
            </button>
          ) : (
            <Link to="/login" className="header__drawer-icon" aria-label="로그인">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
