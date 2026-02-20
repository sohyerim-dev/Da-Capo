import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import CommentList from "./CommentList";
import "./CommunityDetail.scss";

interface CommunityPost {
  id: number;
  title: string;
  category: string;
  content: string;
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  author_role: string;
  view_count: number | null;
  source_note_id: number | null;
  concert_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ConcertInfo {
  id: string;
  title: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface CommunityComment {
  id: number;
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

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

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchComments = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", Number(id))
      .order("created_at", { ascending: true });
    setComments((data ?? []) as CommunityComment[]);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: postData, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(postData as CommunityPost);

      // 조회수 증가
      await supabase.rpc("increment_community_view_count", { p_post_id: Number(id) });

      // 후기 글이면 공연 정보 조회
      if (postData.concert_id) {
        const { data: concertData } = await supabase
          .from("concerts")
          .select("id, title, poster, start_date, end_date")
          .eq("id", postData.concert_id)
          .single();
        if (concertData) setConcert(concertData);
      }

      setLoading(false);
    };

    fetchData();
    fetchComments();
  }, [id, fetchComments]);

  const handleDelete = async () => {
    if (!id || !post) return;
    setDeleteLoading(true);

    if (isAdmin && post.author_id !== user?.id) {
      await supabase.rpc("admin_delete_community_post", { p_post_id: post.id });
    } else {
      await supabase.from("community_posts").delete().eq("id", Number(id));
    }

    setDeleteLoading(false);
    navigate("/community");
  };

  if (loading) {
    return (
      <div className="community-detail-page">
        <div className="wrap community-detail-page__inner">
          <div className="community-detail-page__skeleton-badge" />
          <div className="community-detail-page__skeleton-title" />
          <div className="community-detail-page__skeleton-meta" />
          <hr className="community-detail-page__divider" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="community-detail-page__skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="community-detail-page">
        <div className="wrap community-detail-page__not-found">
          <p>존재하지 않는 글입니다.</p>
          <Link to="/community">목록으로</Link>
        </div>
      </div>
    );
  }

  const canEdit = (user?.id === post.author_id || isAdmin) && !post.source_note_id;
  const canDelete = user?.id === post.author_id || isAdmin;
  const showComments = post.category !== "공지";

  return (
    <div className="community-detail-page">
      <div className="wrap community-detail-page__inner">
        <div className="community-detail-page__meta-top">
          <Link to="/community" className="community-detail-page__back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            목록
          </Link>
        </div>

        <span className={`community-detail-page__badge community-detail-page__badge--${post.category}`}>
          {post.category}
        </span>
        <h1 className="community-detail-page__title">{post.title}</h1>
        <div className="community-detail-page__info">
          {post.author_role === "admin" ? (
            <span className="community-detail-page__author-link">{post.author_nickname}</span>
          ) : (
            <Link to={`/classic-note/${post.author_username || post.author_id}`} className="community-detail-page__author-link">
              {post.author_nickname}
            </Link>
          )}
          <span>·</span>
          <span>{post.created_at ? formatDate(post.created_at) : ""}</span>
          <span>·</span>
          <span>조회 {(post.view_count ?? 0).toLocaleString()}</span>
          {post.source_note_id && (
            <>
              <span>·</span>
              <Link
                to={`/classic-note/${post.author_username || post.author_id}`}
                className="community-detail-page__note-link"
              >
                클래식 노트에서 보기
              </Link>
            </>
          )}
        </div>

        <hr className="community-detail-page__divider" />

        {/* 후기: 공연 정보 */}
        {concert && (
          <Link
            to={`/concert-info/${concert.id}`}
            className="community-concert-card"
          >
            {concert.poster && (
              <img
                src={concert.poster}
                alt={concert.title ?? ""}
                className="community-concert-card__poster"
              />
            )}
            <div className="community-concert-card__info">
              <p className="community-concert-card__title">{concert.title}</p>
              <p className="community-concert-card__date">
                {concert.start_date ? formatDate(concert.start_date) : ""}
                {concert.end_date !== concert.start_date &&
                  concert.end_date ? ` ~ ${formatDate(concert.end_date)}` : ""}
              </p>
            </div>
          </Link>
        )}

        <div
          className="community-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {(canEdit || canDelete) && (
          <div className="community-detail-page__actions">
            {canEdit && (
              <button
                className="community-detail-page__action-btn"
                onClick={() => navigate(`/community/${id}/edit`)}
              >
                수정
              </button>
            )}
            {canDelete && (
              <button
                className="community-detail-page__action-btn community-detail-page__action-btn--delete"
                onClick={() => setShowDeleteConfirm(true)}
              >
                삭제
              </button>
            )}
          </div>
        )}

        {showComments && (
          <CommentList
            postId={post.id}
            comments={comments}
            onRefresh={fetchComments}
          />
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="community-detail-page__modal-overlay"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="community-detail-page__delete-confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="community-detail-page__delete-confirm-title">
              글을 삭제하시겠습니까?
            </p>
            <p className="community-detail-page__delete-confirm-desc">
              삭제 후 복구할 수 없습니다.
            </p>
            <div className="community-detail-page__delete-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                className="community-detail-page__delete-confirm-btn"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
