import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import useUserStore from "@/zustand/userStore";
import { supabase } from "@/lib/supabase";
import "./Header.scss";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resetUser } = useUserStore();
  const isHome = location.pathname === "/";
  const [isPastHero, setIsPastHero] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetUser();
    navigate("/");
  };

  useEffect(() => {
    if (!isHome) {
      setIsPastHero(false);
      return;
    }

    const handleScroll = () => {
      setIsPastHero(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const isWhite = isHome && !isPastHero;

  return (
    <header className={`header ${isWhite ? "header--white" : "header--black"}`}>
      <div className="wrap header__inner">
        <Link to="/" className="header__logo">
          <img
            src={isWhite ? "/images/logo-white.png" : "/images/logo-black.png"}
            alt="Da Capo"
          />
        </Link>

        <nav className="header__nav">
          <NavLink to="/concert-info">공연</NavLink>
          <NavLink to="/magazine">매거진</NavLink>
          <NavLink to="/community">커뮤니티</NavLink>
          <NavLink to="/classic-note">나의 클래식 노트</NavLink>
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
                <Link to="/mypage/edit" className="header__dropdown-item">회원정보수정</Link>
                <Link to="/mypage/profile" className="header__dropdown-item">프로필 설정</Link>
                <button className="header__dropdown-item" onClick={handleLogout}>로그아웃</button>
              </div>
            )}
          </div>
          <Link to="/search" className="header__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
          </Link>
          <button className="header__icon header__hamburger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
