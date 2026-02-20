import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./SupportList.scss";

type Category = "전체" | "공지" | "질문" | "제안" | "답변";

interface SupportPost {
  id: number;
  title: string;
  category: "공지" | "질문" | "제안" | "답변";
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  view_count: number;
  created_at: string;
  support_replies: { id: number } | null;
}

const CATEGORIES: Category[] = ["전체", "공지", "제안", "질문", "답변"];
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
  const [activeCategory, setActiveCategory] = useState<Category>("전체");
  const [notices, setNotices] = useState<SupportPost[]>([]);
  const [posts, setPosts] = useState<SupportPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      if (activeCategory === "전체" || activeCategory === "공지") {
        const { data: noticeData } = await supabase
          .from("support_posts")
          .select(
            "id, title, category, author_id, author_nickname, author_username, view_count, created_at, support_replies(id)"
          )
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
        .select(
          "id, title, category, author_id, author_nickname, author_username, view_count, created_at, support_replies(id)",
          {
            count: "exact",
          }
        )
        .neq("category", "공지")
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (activeCategory !== "전체") {
        query = query.eq("category", activeCategory);
      }

      const { data, count } = await query;
      setPosts((data ?? []) as SupportPost[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    };

    fetchPosts();
  }, [activeCategory, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  const renderRow = (post: SupportPost, idx: number, isNotice = false) => (
    <tr
      key={post.id}
      className={`support-table__row${isNotice ? " support-table__row--notice" : ""}`}
      onClick={() => navigate(`/support/${post.id}`)}
      style={{ cursor: "pointer" }}
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

  return (
    <div className="support-list-page">
      <div className="wrap">
        <div className="support-list-page__header">
          <h1 className="support-list-page__title">고객센터</h1>
          {user && (
            <button
              className="support-list-page__write-btn"
              onClick={() => navigate("/support/new")}
            >
              글쓰기
            </button>
          )}
        </div>

        <div className="support-list-page__tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`support-list-page__tab${activeCategory === cat ? " support-list-page__tab--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
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
          <>
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

            {totalPages > 1 && (
              <div className="support-list-page__pagination">
                <button
                  className={`support-list-page__page-btn${page === 1 ? " support-list-page__page-btn--disabled" : ""}`}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="이전 페이지"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      className={`support-list-page__page-btn${page === p ? " support-list-page__page-btn--active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className={`support-list-page__page-btn${page === totalPages ? " support-list-page__page-btn--disabled" : ""}`}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="다음 페이지"
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
