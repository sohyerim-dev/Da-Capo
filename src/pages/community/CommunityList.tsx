import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./CommunityList.scss";

type Category = "전체" | "공지" | "자유" | "후기" | "정보";

interface CommunityPost {
  id: number;
  title: string;
  category: "공지" | "자유" | "후기" | "정보";
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  author_role: string;
  view_count: number;
  comment_count: number;
  created_at: string;
}

type SearchField = "title" | "content" | "author_nickname";

const SEARCH_FIELDS: { label: string; value: SearchField }[] = [
  { label: "제목", value: "title" },
  { label: "내용", value: "content" },
  { label: "작성자", value: "author_nickname" },
];

const CATEGORIES: Category[] = ["전체", "공지", "자유", "후기", "정보"];
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

export default function CommunityList() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL에서 파생된 값 (소스 오브 트루스)
  const activeCategory = (searchParams.get("category") as Category) ?? "전체";
  const page = Number(searchParams.get("page") || "1");
  const searchQuery = searchParams.get("q") ?? "";
  const activeField = (searchParams.get("field") as SearchField) ?? "title";

  // 로컬 상태 (입력 중인 값)
  const [notices, setNotices] = useState<CommunityPost[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [pendingField, setPendingField] = useState<SearchField>(
    () => (searchParams.get("field") as SearchField) ?? "title"
  );

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      // 공지 고정 (전체/공지 탭에서만, 검색 중엔 표시 안 함)
      if (!searchQuery && (activeCategory === "전체" || activeCategory === "공지")) {
        const { data: noticeData } = await supabase
          .from("community_posts")
          .select(
            "id, title, category, author_id, author_nickname, author_username, author_role, view_count, created_at"
          )
          .eq("category", "공지")
          .order("created_at", { ascending: false });

        const noticeWithCount = await Promise.all(
          (noticeData ?? []).map(async (p) => {
            const { count } = await supabase
              .from("community_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", p.id);
            return { ...p, comment_count: count ?? 0 } as CommunityPost;
          })
        );
        setNotices(noticeWithCount);
      } else {
        setNotices([]);
      }

      // 일반 글 (공지 탭이면 빈 리스트)
      if (activeCategory === "공지") {
        setPosts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("community_posts")
        .select("id, title, category, author_id, author_nickname, author_username, author_role, view_count, created_at", {
          count: "exact",
        })
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

      const withCount = await Promise.all(
        (data ?? []).map(async (p) => {
          const { count: cc } = await supabase
            .from("community_comments")
            .select("id", { count: "exact", head: true })
            .eq("post_id", p.id);
          return { ...p, comment_count: cc ?? 0 } as CommunityPost;
        })
      );

      setPosts(withCount);
      setTotalCount(count ?? 0);
      setLoading(false);
    };

    fetchPosts();
  }, [activeCategory, page, searchQuery, activeField]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 페이지 이동 (카테고리·검색 상태 유지)
  const goToPage = (newPage: number) => {
    const params: Record<string, string> = {};
    if (activeCategory !== "전체") params.category = activeCategory;
    if (searchQuery) { params.q = searchQuery; params.field = activeField; }
    if (newPage > 1) params.page = String(newPage);
    setSearchParams(params);
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <tr key={i} className="community-list-page__skeleton-row">
        <td className="community-table__num">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--num" />
        </td>
        <td className="community-table__category">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--badge" />
        </td>
        <td className="community-table__title">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--title" />
        </td>
        <td className="community-table__author">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--author" />
        </td>
        <td className="community-table__date">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--date" />
        </td>
        <td className="community-table__views">
          <div className="community-list-page__skeleton-cell community-list-page__skeleton-cell--views" />
        </td>
      </tr>
    ));

  const renderRow = (post: CommunityPost, idx: number, isNotice = false) => (
    <tr
      key={post.id}
      className={`community-table__row${isNotice ? " community-table__row--notice" : ""}`}
    >
      <td className="community-table__num">
        {isNotice ? post.id : totalCount - (page - 1) * PAGE_SIZE - idx}
      </td>
      <td className="community-table__category">
        <span className={`community-table__badge community-table__badge--${post.category}`}>
          {post.category}
        </span>
      </td>
      <td className="community-table__title">
        <Link to={`/community/${post.id}`}>{post.title}</Link>
        {post.comment_count > 0 && (
          <span className="community-table__comment-count">[{post.comment_count}]</span>
        )}
      </td>
      <td className="community-table__author">
        {post.author_role === "admin" ? (
          <span>{post.author_nickname}</span>
        ) : (
          <Link to={`/classic-note/${post.author_username || post.author_id}`} className="community-table__author-link">
            {post.author_nickname}
          </Link>
        )}
      </td>
      <td className="community-table__date">{formatDate(post.created_at)}</td>
      <td className="community-table__views">{post.view_count.toLocaleString()}</td>
    </tr>
  );

  return (
    <div className="community-list-page">
      <div className="wrap">
        <div className="community-list-page__header">
          <h1 className="community-list-page__title">커뮤니티</h1>
          {user && (
            <button
              className="community-list-page__write-btn"
              onClick={() => navigate("/community/new")}
            >
              글쓰기
            </button>
          )}
        </div>

        <div className="community-list-page__tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`community-list-page__tab${activeCategory === cat ? " community-list-page__tab--active" : ""}`}
              onClick={() => {
                const params: Record<string, string> = {};
                if (cat !== "전체") params.category = cat;
                setSearchParams(params);
                setSearchInput("");
                setPendingField("title");
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <form
          className="community-list-page__search"
          onSubmit={(e) => {
            e.preventDefault();
            const params: Record<string, string> = {};
            if (activeCategory !== "전체") params.category = activeCategory;
            if (searchInput.trim()) {
              params.q = searchInput.trim();
              params.field = pendingField;
            }
            setSearchParams(params);
          }}
        >
          <select
            className="community-list-page__search-select"
            value={pendingField}
            onChange={(e) => {
              setPendingField(e.target.value as SearchField);
            }}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div className="community-list-page__search-input-wrap">
            <input
              className="community-list-page__search-input"
              type="text"
              placeholder={`${SEARCH_FIELDS.find((f) => f.value === pendingField)?.label} 검색`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="community-list-page__search-clear"
                onClick={() => {
                  setSearchInput("");
                  const params: Record<string, string> = {};
                  if (activeCategory !== "전체") params.category = activeCategory;
                  setSearchParams(params);
                }}
                aria-label="검색 초기화"
              >
                ✕
              </button>
            )}
            <button type="submit" className="community-list-page__search-btn" aria-label="검색">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </div>
        </form>

        {loading ? (
          <table className="community-table">
            <thead>
              <tr>
                <th className="community-table__num">번호</th>
                <th className="community-table__category">카테고리</th>
                <th className="community-table__title">제목</th>
                <th className="community-table__author">작성자</th>
                <th className="community-table__date">작성일</th>
                <th className="community-table__views">조회수</th>
              </tr>
            </thead>
            <tbody>{renderSkeletonRows()}</tbody>
          </table>
        ) : notices.length === 0 && posts.length === 0 ? (
          <div className="community-list-page__empty">
            {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다.` : "등록된 글이 없습니다."}
          </div>
        ) : (
          <>
            <table className="community-table">
              <thead>
                <tr>
                  <th className="community-table__num">번호</th>
                  <th className="community-table__category">카테고리</th>
                  <th className="community-table__title">제목</th>
                  <th className="community-table__author">작성자</th>
                  <th className="community-table__date">작성일</th>
                  <th className="community-table__views">조회수</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((post, idx) => renderRow(post, idx, true))}
                {posts.map((post, idx) => renderRow(post, idx))}
              </tbody>
            </table>

            <div className="community-list-page__pagination">
              <button
                className={`community-list-page__page-btn${page === 1 ? " community-list-page__page-btn--disabled" : ""}`}
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="이전 페이지"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`community-list-page__page-btn${page === p ? " community-list-page__page-btn--active" : ""}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={`community-list-page__page-btn${page === totalPages ? " community-list-page__page-btn--disabled" : ""}`}
                onClick={() => goToPage(page + 1)}
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
