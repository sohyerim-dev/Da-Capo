import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./MagazineList.scss";

type Category = "전체" | "공지" | "큐레이터 픽" | "클래식 읽기" | "기타";

interface MagazinePost {
  id: number;
  title: string;
  category: string;
  author_nickname: string;
  view_count: number | null;
  created_at: string | null;
}

const CATEGORIES: Category[] = ["전체", "공지", "큐레이터 픽", "클래식 읽기", "기타"];
const PAGE_SIZE = 20;

const CATEGORY_SLUG: Record<string, string> = {
  "공지": "notice",
  "큐레이터 픽": "curator",
  "클래식 읽기": "reading",
  "기타": "etc",
};

function formatDate(str: string): string {
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}.${str.slice(4, 6)}.${str.slice(6, 8)}`;
  }
  if (/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(str)) {
    return `${str.slice(0, 4)}.${str.slice(5, 7)}.${str.slice(8, 10)}`;
  }
  const d = new Date(str.replace(" ", "T"));
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function MagazineList() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("전체");
  const [notices, setNotices] = useState<MagazinePost[]>([]);
  const [posts, setPosts] = useState<MagazinePost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      // 공지 고정 (전체/공지 탭에서만)
      if (activeCategory === "전체" || activeCategory === "공지") {
        const { data: noticeData } = await supabase
          .from("magazine_posts")
          .select("id, title, category, author_nickname, view_count, created_at")
          .eq("category", "공지")
          .order("created_at", { ascending: false });
        setNotices((noticeData ?? []) as MagazinePost[]);
      } else {
        setNotices([]);
      }

      // 공지 탭이면 일반 글 불필요
      if (activeCategory === "공지") {
        setPosts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("magazine_posts")
        .select(
          "id, title, category, author_nickname, view_count, created_at",
          { count: "exact" }
        )
        .neq("category", "공지")
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (activeCategory !== "전체") {
        query = query.eq("category", activeCategory);
      }

      const { data, count, error } = await query;
      if (!error && data) {
        setPosts(data);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [activeCategory, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="magazine-list-page">
      <div className="wrap">
        <div className="magazine-list-page__header">
          <h1 className="magazine-list-page__title">매거진</h1>
          {user?.role === "admin" && (
            <button
              className="magazine-list-page__write-btn"
              onClick={() => navigate("/magazine/new")}
            >
              글쓰기
            </button>
          )}
        </div>

        <div className="magazine-list-page__tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`magazine-list-page__tab${activeCategory === cat ? " magazine-list-page__tab--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <table className="magazine-table">
            <thead>
              <tr>
                <th className="magazine-table__num">번호</th>
                <th className="magazine-table__category">카테고리</th>
                <th className="magazine-table__title">제목</th>
                <th className="magazine-table__author">작성자</th>
                <th className="magazine-table__date">작성일</th>
                <th className="magazine-table__views">조회수</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="magazine-list-page__skeleton-row">
                  <td className="magazine-table__num"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--num" /></td>
                  <td className="magazine-table__category"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--badge" /></td>
                  <td className="magazine-table__title"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--title" /></td>
                  <td className="magazine-table__author"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--author" /></td>
                  <td className="magazine-table__date"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--date" /></td>
                  <td className="magazine-table__views"><div className="magazine-list-page__skeleton-cell magazine-list-page__skeleton-cell--views" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : notices.length === 0 && posts.length === 0 ? (
          <div className="magazine-list-page__empty">등록된 글이 없습니다.</div>
        ) : (
          <>
            <table className="magazine-table">
              <thead>
                <tr>
                  <th className="magazine-table__num">번호</th>
                  <th className="magazine-table__category">카테고리</th>
                  <th className="magazine-table__title">제목</th>
                  <th className="magazine-table__author">작성자</th>
                  <th className="magazine-table__date">작성일</th>
                  <th className="magazine-table__views">조회수</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((post) => (
                  <tr key={`notice-${post.id}`} className="magazine-table__row magazine-table__row--notice">
                    <td className="magazine-table__num">{post.id}</td>
                    <td className="magazine-table__category">
                      <span className={`magazine-table__badge magazine-table__badge--${CATEGORY_SLUG[post.category] ?? "etc"}`}>
                        {post.category}
                      </span>
                    </td>
                    <td className="magazine-table__title">
                      <Link to={`/magazine/${post.id}`}>{post.title}</Link>
                    </td>
                    <td className="magazine-table__author">{post.author_nickname}</td>
                    <td className="magazine-table__date">
                      {post.created_at ? formatDate(post.created_at) : ""}
                    </td>
                    <td className="magazine-table__views">
                      {(post.view_count ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {posts.map((post, idx) => (
                  <tr key={post.id} className="magazine-table__row">
                    <td className="magazine-table__num">
                      {totalCount - (page - 1) * PAGE_SIZE - idx}
                    </td>
                    <td className="magazine-table__category">
                      <span className={`magazine-table__badge magazine-table__badge--${CATEGORY_SLUG[post.category] ?? "etc"}`}>
                        {post.category}
                      </span>
                    </td>
                    <td className="magazine-table__title">
                      <Link to={`/magazine/${post.id}`}>{post.title}</Link>
                    </td>
                    <td className="magazine-table__author">
                      {post.author_nickname}
                    </td>
                    <td className="magazine-table__date">
                      {post.created_at ? formatDate(post.created_at) : ""}
                    </td>
                    <td className="magazine-table__views">
                      {(post.view_count ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="magazine-list-page__pagination">
                <button
                  className={`magazine-list-page__page-btn${page === 1 ? " magazine-list-page__page-btn--disabled" : ""}`}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="이전 페이지"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`magazine-list-page__page-btn${page === p ? " magazine-list-page__page-btn--active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={`magazine-list-page__page-btn${page === totalPages ? " magazine-list-page__page-btn--disabled" : ""}`}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="다음 페이지"
                >
                  &gt;
                </button>
              </div>
          </>
        )}
      </div>
    </div>
  );
}
