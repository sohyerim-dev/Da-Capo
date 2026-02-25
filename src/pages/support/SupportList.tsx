import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./SupportList.scss";

type Category = "전체" | "공지" | "질문" | "제안" | "답변";
type SearchField = "title" | "content" | "author_nickname";

interface SupportPost {
  id: number;
  title: string;
  category: "공지" | "질문" | "제안" | "답변";
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  view_count: number;
  created_at: string;
  is_private: boolean;
  support_replies: { id: number } | null;
}

const CATEGORIES: Category[] = ["전체", "공지", "제안", "질문", "답변"];
const SEARCH_FIELDS: { label: string; value: SearchField }[] = [
  { label: "제목", value: "title" },
  { label: "내용", value: "content" },
  { label: "작성자", value: "author_nickname" },
];
const PAGE_SIZE = 20;

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

export default function SupportList() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === "admin";

  const activeCategory = (searchParams.get("category") ?? "전체") as Category;
  const showMine = searchParams.get("mine") === "true";
  const page = Number(searchParams.get("page") ?? "1");
  const searchQuery = searchParams.get("q") ?? "";
  const activeField = (searchParams.get("field") ?? "title") as SearchField;

  const [notices, setNotices] = useState<SupportPost[]>([]);
  const [posts, setPosts] = useState<SupportPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [pendingField, setPendingField] = useState<SearchField>(
    () => (searchParams.get("field") ?? "title") as SearchField
  );

  const handleCategoryChange = (cat: Category) => {
    const params: Record<string, string> = { category: cat, page: "1" };
    if (searchQuery) { params.q = searchQuery; params.field = activeField; }
    setSearchParams(params);
  };

  const handleToggleMine = () => {
    if (showMine) {
      setSearchParams({ category: activeCategory, page: "1" });
    } else {
      setSearchParams({ mine: "true", page: "1" });
    }
  };

  const handlePageChange = (p: number) => {
    const params: Record<string, string> = { page: String(p) };
    if (showMine) params.mine = "true";
    else if (activeCategory !== "전체") params.category = activeCategory;
    if (searchQuery) { params.q = searchQuery; params.field = activeField; }
    setSearchParams(params);
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const SELECT = "id, title, category, author_id, author_nickname, author_username, view_count, created_at, is_private, support_replies(id)";

      // 내 글 보기 모드
      if (showMine && user) {
        setNotices([]);
        let q = supabase
          .from("support_posts")
          .select(SELECT, { count: "exact" })
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
        if (searchQuery) q = q.ilike(activeField, `%${searchQuery}%`);
        const { data, count } = await q;
        setPosts((data ?? []) as SupportPost[]);
        setTotalCount(count ?? 0);
        setLoading(false);
        return;
      }

      // 검색 중엔 공지 숨김
      if (!searchQuery && (activeCategory === "전체" || activeCategory === "공지")) {
        const { data: noticeData } = await supabase
          .from("support_posts")
          .select(SELECT)
          .eq("category", "공지")
          .order("created_at", { ascending: false });
        setNotices((noticeData ?? []) as SupportPost[]);
      } else {
        setNotices([]);
      }

      if (activeCategory === "공지") {
        setPosts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("support_posts")
        .select(SELECT, { count: "exact" })
        .neq("category", "공지")
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (activeCategory !== "전체") {
        query = query.eq("category", activeCategory);
      }

      if (searchQuery) {
        query = query.ilike(activeField, `%${searchQuery}%`);
      }

      const { data, count } = await query;
      setPosts((data ?? []) as SupportPost[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    };

    fetchPosts();
  }, [activeCategory, page, showMine, user, isAdmin, searchQuery, activeField]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getPageRange = (current: number, total: number): (number | "...")[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <tr key={i} className="support-list-page__skeleton-row">
        <td className="support-table__num">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--num" />
        </td>
        <td className="support-table__category">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--badge" />
        </td>
        <td className="support-table__title">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--title" />
        </td>
        <td className="support-table__author">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--author" />
        </td>
        <td className="support-table__date">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--date" />
        </td>
        <td className="support-table__views">
          <div className="support-list-page__skeleton-cell support-list-page__skeleton-cell--views" />
        </td>
      </tr>
    ));

  const renderRow = (post: SupportPost, idx: number, isNotice = false) => {
    const isBlocked = post.is_private && !isAdmin && user?.id !== post.author_id;
    return (
      <tr
        key={post.id}
        className={`support-table__row${isNotice ? " support-table__row--notice" : ""}${isBlocked ? " support-table__row--blocked" : ""}`}
        onClick={isBlocked ? undefined : () => navigate(`/support/${post.id}`)}
        style={{ cursor: isBlocked ? "not-allowed" : "pointer" }}
      >
        <td className="support-table__num">
          {isNotice ? post.id : totalCount - (page - 1) * PAGE_SIZE - idx}
        </td>
        <td className="support-table__category">
          <span
            className={`support-table__badge support-table__badge--${post.category}`}
          >
            {post.category}
          </span>
        </td>
        <td className="support-table__title">
          {post.is_private && (
            <svg
              className="support-table__lock-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {post.title}
          {(post.category === "질문" || post.category === "제안") && (
            <span
              className={`support-table__reply-status${post.support_replies ? " support-table__reply-status--done" : " support-table__reply-status--pending"}`}
            >
              {post.support_replies ? "답변완료" : "답변 대기중"}
            </span>
          )}
        </td>
        <td className="support-table__author">{post.author_nickname}</td>
        <td className="support-table__date">{formatDate(post.created_at)}</td>
        <td className="support-table__views">
          {post.view_count.toLocaleString()}
        </td>
      </tr>
    );
  };

  return (
    <div className="support-list-page">
      <div className="wrap">
        <h1 className="support-list-page__title">고객센터</h1>

        <div className="support-list-page__board">
        <div className="support-list-page__toolbar">
          <div className="support-list-page__tabs">
            {!showMine && CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`support-list-page__tab${activeCategory === cat ? " support-list-page__tab--active" : ""}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
            {user && (
              <button
                className={`support-list-page__tab${showMine ? " support-list-page__tab--active" : ""}`}
                onClick={handleToggleMine}
              >
                내 글 보기
              </button>
            )}
          </div>
          {user && (
            <button
              className="support-list-page__write-btn"
              onClick={() => navigate("/support/new")}
            >
              글쓰기
            </button>
          )}
        </div>

        {loading ? (
          <table className="support-table">
            <thead>
              <tr>
                <th className="support-table__num">번호</th>
                <th className="support-table__category">카테고리</th>
                <th className="support-table__title">제목</th>
                <th className="support-table__author">작성자</th>
                <th className="support-table__date">작성일</th>
                <th className="support-table__views">조회수</th>
              </tr>
            </thead>
            <tbody>{renderSkeletonRows()}</tbody>
          </table>
        ) : notices.length === 0 && posts.length === 0 ? (
          <div className="support-list-page__empty">등록된 글이 없습니다.</div>
        ) : (
          <table className="support-table">
            <thead>
              <tr>
                <th className="support-table__num">번호</th>
                <th className="support-table__category">카테고리</th>
                <th className="support-table__title">제목</th>
                <th className="support-table__author">작성자</th>
                <th className="support-table__date">작성일</th>
                <th className="support-table__views">조회수</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((post, idx) => renderRow(post, idx, true))}
              {posts.map((post, idx) => renderRow(post, idx))}
            </tbody>
          </table>
        )}

        <div className="support-list-page__bottom-bar">
          {!loading && totalPages > 0 && (
            <div className="support-list-page__pagination">
              <button
                className={`support-list-page__page-btn${page === 1 ? " support-list-page__page-btn--disabled" : ""}`}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="이전 페이지"
              >
                &lt;
              </button>
              {getPageRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="support-list-page__page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`support-list-page__page-btn${page === p ? " support-list-page__page-btn--active" : ""}`}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className={`support-list-page__page-btn${page === totalPages ? " support-list-page__page-btn--disabled" : ""}`}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="다음 페이지"
              >
                &gt;
              </button>
            </div>
          )}

          <form
            className="support-list-page__search"
            onSubmit={(e) => {
              e.preventDefault();
              const params: Record<string, string> = {};
              if (showMine) params.mine = "true";
              else if (activeCategory !== "전체") params.category = activeCategory;
              if (searchInput.trim()) {
                params.q = searchInput.trim();
                params.field = pendingField;
              }
              setSearchParams(params);
            }}
          >
            <select
              className="support-list-page__search-select"
              value={pendingField}
              onChange={(e) => setPendingField(e.target.value as SearchField)}
            >
              {SEARCH_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <div className="support-list-page__search-input-wrap">
              <input
                className="support-list-page__search-input"
                type="text"
                placeholder={`${SEARCH_FIELDS.find((f) => f.value === pendingField)?.label} 검색`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="support-list-page__search-clear"
                  onClick={() => {
                    setSearchInput("");
                    const params: Record<string, string> = {};
                    if (showMine) params.mine = "true";
                    else if (activeCategory !== "전체") params.category = activeCategory;
                    setSearchParams(params);
                  }}
                  aria-label="검색 초기화"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="support-list-page__search-btn" aria-label="검색">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
