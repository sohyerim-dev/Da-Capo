import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useMatch, useNavigate } from "react-router";
import useUserStore from "@/zustand/userStore";
import { supabase } from "@/lib/supabase";
import "./Header.scss";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resetUser } = useUserStore();
  const isHome = location.pathname === "/";
  const isClassicNotePublic = useMatch("/classic-note/:username");
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetUser();
    navigate("/");
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!isHome) {
      setIsPastHero(false);
      return;
    }

    const handleScroll = () => {
      setIsPastHero(window.scrollY > window.innerHeight);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isWhite = isHome && !isPastHero;

  return (
    <>
      <header className={`header ${isWhite ? "header--white" : "header--black"}`}>
        <div className="wrap header__inner">
          <Link to="/" className="header__logo">
            <img
              src={isWhite ? "/images/logo-white.png" : "/images/logo-black.png"}
              alt="Da Capo"
              draggable="false"
            />
          </Link>

          <nav className="header__nav">
            <NavLink to="/concert-info">공연</NavLink>
            <NavLink to="/magazine">매거진</NavLink>
            <NavLink to="/community" className={({ isActive }) => isActive || !!isClassicNotePublic ? "active" : ""}>커뮤니티</NavLink>
            <NavLink to="/classic-note" end>나의 클래식 노트</NavLink>
          </nav>

          <div className="header__actions">
            <div className={`header__user-menu${user ? " header__user-menu--active" : ""}`}>
              <Link to={user ? "/mypage" : "/login"} className="header__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </Link>
              {user && (
                <div className="header__dropdown">
                  <Link to="/mypage" className="header__dropdown-item">마이페이지</Link>
                  <button className="header__dropdown-item" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
            <button
              className="header__icon header__hamburger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="메뉴 열기"
            >
              {isMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M6 6L18 18M6 18L18 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="header__overlay" onClick={() => setIsMenuOpen(false)} />
      )}

      <div className={`header__drawer ${isMenuOpen ? "header__drawer--open" : ""}`} inert={!isMenuOpen}>
        <button
          className="header__drawer-close"
          onClick={() => setIsMenuOpen(false)}
          aria-label="메뉴 닫기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 6L18 18M6 18L18 6" />
          </svg>
        </button>

        <nav className="header__drawer-nav">
          <NavLink to="/">홈</NavLink>
          <NavLink to="/concert-info">공연</NavLink>
          <NavLink to="/magazine">매거진</NavLink>
          <NavLink to="/community" className={({ isActive }) => isActive || !!isClassicNotePublic ? "active" : ""}>커뮤니티</NavLink>
          <NavLink to="/classic-note" end>나의 클래식 노트</NavLink>
        </nav>

        <div className="header__drawer-actions">
          <Link to="/mypage" className="header__drawer-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>마이페이지</span>
          </Link>
          {user ? (
            <button className="header__drawer-icon" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span>로그아웃</span>
            </button>
          ) : (
            <Link to="/login" className="header__drawer-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
