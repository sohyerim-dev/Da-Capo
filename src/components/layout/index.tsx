import { useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import Header from "./Header";
import Footer from "./Footer";
import AnnouncementBanner from "@/components/ui/AnnouncementBanner";
import "./Layout.scss";

const PAGE_TITLES: Record<string, string> = {
  "/": "Da Capo | 클래식을 발견하는 가장 좋은 방법",
  "/about": "Da Capo 소개 | Da Capo",
  "/concert-info": "공연 정보 | Da Capo",
  "/magazine": "매거진 | Da Capo",
  "/magazine/new": "매거진 작성 | Da Capo",
  "/community": "커뮤니티 | Da Capo",
  "/community/new": "글쓰기 | Da Capo",
  "/support": "고객센터 | Da Capo",
  "/support/new": "문의하기 | Da Capo",
  "/classic-note": "나의 클래식 노트 | Da Capo",
  "/mypage": "마이페이지 | Da Capo",
  "/login": "로그인 | Da Capo",
  "/signup": "회원가입 | Da Capo",
};

export default function Layout() {
  const { pathname } = useLocation();
  const [bannerVisible, setBannerVisible] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/" || !bannerVisible) {
      document.documentElement.style.setProperty("--banner-h", "0px");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    });
    ro.observe(el);
    document.documentElement.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    return () => ro.disconnect();
  }, [pathname, bannerVisible]);

  useEffect(() => {
    const exact = PAGE_TITLES[pathname];
    if (exact) {
      document.title = exact;
      return;
    }
    // 동적 경로 (상세 페이지 등)
    if (pathname.startsWith("/concert-info/"))
      document.title = "공연 상세 | Da Capo";
    else if (pathname.startsWith("/magazine/") && pathname.endsWith("/edit"))
      document.title = "매거진 수정 | Da Capo";
    else if (pathname.startsWith("/magazine/"))
      document.title = "매거진 | Da Capo";
    else if (pathname.startsWith("/community/") && pathname.endsWith("/edit"))
      document.title = "글 수정 | Da Capo";
    else if (pathname.startsWith("/community/"))
      document.title = "게시글 | Da Capo";
    else if (pathname.startsWith("/support/") && pathname.endsWith("/edit"))
      document.title = "문의 수정 | Da Capo";
    else if (pathname.startsWith("/support/"))
      document.title = "문의 상세 | Da Capo";
    else if (pathname.startsWith("/classic-note/"))
      document.title = "나의 클래식 노트 | Da Capo";
  }, [pathname]);

  return (
    <>
      {pathname === "/" && bannerVisible && (
        <div ref={bannerRef}>
          <AnnouncementBanner onClose={() => setBannerVisible(false)} />
        </div>
      )}
      <Header />
      <ScrollRestoration />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
