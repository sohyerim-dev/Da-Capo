import { useEffect, useRef, useState } from "react";
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

  // 오늘의 클래식 노트
  interface NoteProfile {
    id: string;
    nickname: string | null;
    username: string | null;
    avatar_url: string | null;
  }
  const [noteProfiles, setNoteProfiles] = useState<NoteProfile[]>([]);
  const NOTE_VISIBLE = 5;
  const noteTrackRef = useRef<HTMLDivElement>(null);
  const noteIsDragging = useRef(false);
  const noteStartX = useRef(0);
  const noteScrollLeft = useRef(0);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nickname, username, avatar_url")
      .eq("classic_note_public", true)
      .not("username", "is", null)
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 10);
          setNoteProfiles(shuffled as NoteProfile[]);
        }
      });
  }, []);

  const scrollNoteStrip = (dir: 1 | -1) => {
    const isSidebar = window.innerWidth > 1200;
    if (isSidebar) {
      noteTrackRef.current?.scrollBy({ top: dir * 5 * 44, behavior: "smooth" });
    } else {
      noteTrackRef.current?.scrollBy({ left: dir * NOTE_VISIBLE * 76, behavior: "smooth" });
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    noteIsDragging.current = true;
    noteStartX.current = e.pageX - (noteTrackRef.current?.offsetLeft ?? 0);
    noteScrollLeft.current = noteTrackRef.current?.scrollLeft ?? 0;
  };

  const handleNoteMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!noteIsDragging.current || !noteTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - noteTrackRef.current.offsetLeft;
    noteTrackRef.current.scrollLeft = noteScrollLeft.current - (x - noteStartX.current);
  };

  const stopNoteDrag = () => { noteIsDragging.current = false; };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      // 공지 고정 (전체/공지 탭에서만, 검색 중엔 표시 안 함)
      if (!searchQuery && (activeCategory === "전체" || activeCategory === "공지")) {
        const { data: noticeData } = await supabase
          .from("community_posts")
          .select(
            "id, title, category, author_id, author_nickname, author_username, author_role, view_count, created_at, community_comments(count)"
          )
          .eq("category", "공지")
          .order("created_at", { ascending: false });

        const noticeWithCount: CommunityPost[] = (noticeData ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category as CommunityPost["category"],
          author_id: p.author_id,
          author_nickname: p.author_nickname,
          author_username: p.author_username,
          author_role: p.author_role,
          view_count: p.view_count ?? 0,
          created_at: p.created_at ?? "",
          comment_count: (p.community_comments as { count: number }[])[0]?.count ?? 0,
        }));
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
        .select("id, title, category, author_id, author_nickname, author_username, author_role, view_count, created_at, community_comments(count)", {
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

      const withCount: CommunityPost[] = (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category as CommunityPost["category"],
        author_id: p.author_id,
        author_nickname: p.author_nickname,
        author_username: p.author_username,
        author_role: p.author_role,
        view_count: p.view_count ?? 0,
        created_at: p.created_at ?? "",
        comment_count: (p.community_comments as { count: number }[])[0]?.count ?? 0,
      }));

      setPosts(withCount);
      setTotalCount(count ?? 0);
      setLoading(false);
    };

    fetchPosts();
  }, [activeCategory, page, searchQuery, activeField]);

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
        <div className="community-list-page__content">
        <aside className="community-list-page__note-sidebar">
        <div className="community-list-page__note-strip">
          <div className="community-list-page__note-strip-header">
            <span className="community-list-page__note-strip-title">오늘의 클래식 노트 (랜덤)</span>
          </div>
          {noteProfiles.length === 0 ? (
            <div className="community-list-page__note-strip-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>아직 공개된 클래식 노트가 없어요</span>
            </div>
          ) : (
            <div className="community-list-page__note-strip-slider">
              {noteProfiles.length > NOTE_VISIBLE && (
                <button
                  className="community-list-page__note-strip-arrow community-list-page__note-strip-arrow--left"
                  onClick={() => scrollNoteStrip(-1)}
                  aria-label="이전"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              <div
                ref={noteTrackRef}
                className="community-list-page__note-strip-track"
                onMouseDown={handleNoteMouseDown}
                onMouseMove={handleNoteMouseMove}
                onMouseUp={stopNoteDrag}
                onMouseLeave={stopNoteDrag}
              >
                {noteProfiles.map((profile) => (
                  <Link
                    key={profile.id}
                    to={`/classic-note/${profile.username}`}
                    className="community-list-page__note-strip-item"
                    draggable={false}
                  >
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${profile.id}&backgroundColor=f6f3ec`}
                      alt={profile.nickname ?? ""}
                      className="community-list-page__note-strip-avatar"
                      draggable={false}
                    />
                    <span className="community-list-page__note-strip-name">
                      {profile.nickname}
                    </span>
                  </Link>
                ))}
                {Array.from({ length: Math.max(0, NOTE_VISIBLE - noteProfiles.length) }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="community-list-page__note-strip-item community-list-page__note-strip-item--placeholder">
                    <div className="community-list-page__note-strip-placeholder-circle" />
                    <div className="community-list-page__note-strip-placeholder-label" />
                  </div>
                ))}
              </div>
              {noteProfiles.length > NOTE_VISIBLE && (
                <button
                  className="community-list-page__note-strip-arrow community-list-page__note-strip-arrow--right"
                  onClick={() => scrollNoteStrip(1)}
                  aria-label="다음"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        </aside>

        <div className="community-list-page__main-col">
        <h1 className="community-list-page__title">커뮤니티</h1>
        <div className="community-list-page__main">
        <div className="community-list-page__toolbar">
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
          {user && (
            <button
              className="community-list-page__write-btn"
              onClick={() => navigate("/community/new")}
            >
              글쓰기
            </button>
          )}
        </div>

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
        )}

        <div className="community-list-page__bottom-bar">
          {!loading && totalPages > 0 && (
            <div className="community-list-page__pagination">
              <button
                className={`community-list-page__page-btn${page === 1 ? " community-list-page__page-btn--disabled" : ""}`}
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="이전 페이지"
              >
                &lt;
              </button>
              {getPageRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="community-list-page__page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`community-list-page__page-btn${page === p ? " community-list-page__page-btn--active" : ""}`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className={`community-list-page__page-btn${page === totalPages ? " community-list-page__page-btn--disabled" : ""}`}
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                aria-label="다음 페이지"
              >
                &gt;
              </button>
            </div>
          )}
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
              onChange={(e) => setPendingField(e.target.value as SearchField)}
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
        </div>
        </div>{/* __main */}
        </div>{/* __main-col */}
        </div>{/* __content */}
      </div>
    </div>
  );
}
