import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import CommentList from "./CommentList";
import ShareButton from "@/components/ui/ShareButton";
import ImageLightbox from "@/components/ui/ImageLightbox";
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

interface NavPost {
  id: number;
  title: string;
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

function formatDateTime(str: string): string {
  const d = new Date(str.replace(" ", "T"));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [prevPost, setPrevPost] = useState<NavPost | null>(null);
  const [nextPost, setNextPost] = useState<NavPost | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && !target.closest("a")) {
        e.preventDefault();
        setLightboxSrc((target as HTMLImageElement).src);
      }
    };
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [post, loading]);

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

      const [, { count: fetchedLikeCount }, { data: myLike }] = await Promise.all([
        supabase.rpc("increment_community_view_count", { p_post_id: Number(id) }),
        supabase.from("community_likes").select("*", { count: "exact", head: true }).eq("post_id", Number(id)),
        user
          ? supabase.from("community_likes").select("id").eq("post_id", Number(id)).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setLikeCount(fetchedLikeCount ?? 0);
      setLiked(!!myLike);

      const [{ data: prevData }, { data: nextData }] = await Promise.all([
        supabase.from("community_posts").select("id, title").lt("id", Number(id)).order("id", { ascending: false }).limit(1),
        supabase.from("community_posts").select("id, title").gt("id", Number(id)).order("id", { ascending: true }).limit(1),
      ]);
      setPrevPost((prevData?.[0] as NavPost) ?? null);
      setNextPost((nextData?.[0] as NavPost) ?? null);

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

  const handleLike = async () => {
    if (!user) { navigate("/login"); return; }
    if (likeLoading || !post) return;
    setLikeLoading(true);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      const { error } = await supabase.from("community_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase.from("community_likes").insert({ post_id: post.id, user_id: user.id });
      if (error) { setLiked(false); setLikeCount((c) => c - 1); }
    }
    setLikeLoading(false);
  };

  const handleDelete = async () => {
    if (!id || !post) return;
    setDeleteLoading(true);

    if (isAdmin && post.author_id !== user?.id) {
      await supabase.rpc("admin_delete_community_post", { p_post_id: post.id });
    } else {
      await supabase.from("community_posts").delete().eq("id", Number(id));
      if (post.source_note_id) {
        await supabase.from("notes").delete().eq("id", post.source_note_id);
      }
    }

    setDeleteLoading(false);
    navigate("/community");
  };

  if (loading) {
    return (
      <div className="community-detail-page">
        <div className="wrap community-detail-page__inner">
          <div className="community-detail-page__heading">
            <h1>커뮤니티</h1>
          </div>
          <div className="community-detail-page__post-row">
            <div className="community-detail-page__post-row-left">
              <div className="community-detail-page__skeleton-badge" />
              <div className="community-detail-page__skeleton-title" />
            </div>
            <div className="community-detail-page__skeleton-meta" />
          </div>
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

  const canEdit = user?.id === post.author_id || isAdmin;
  const canDelete = user?.id === post.author_id || isAdmin;
  const showComments = post.category !== "공지";

  return (
    <>
    <div className="community-detail-page">
      <div className="wrap community-detail-page__inner">

        <div className="community-detail-page__heading">
          <h1>커뮤니티</h1>
        </div>

        <div className="community-detail-page__post-row">
          <div className="community-detail-page__post-row-left">
            <span className="community-detail-page__post-num">{post.id}</span>
            <span className={`community-detail-page__badge community-detail-page__badge--${post.category}`}>
              {post.category}
            </span>
            <span className="community-detail-page__post-title">{post.title}</span>
          </div>
          <span className="community-detail-page__post-date">
            {post.created_at ? formatDateTime(post.created_at) : ""}
          </span>
        </div>

        <hr className="community-detail-page__divider" />

        <div className="community-detail-page__sub-meta">
          <div className="community-detail-page__sub-meta-left">
            {post.author_role === "admin" ? (
              <span className="community-detail-page__author-link">{post.author_nickname}</span>
            ) : (
              <Link to={`/classic-note/${post.author_username || post.author_id}`} className="community-detail-page__author-link">
                {post.author_nickname}
              </Link>
            )}
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
          <div className="community-detail-page__sub-meta-right">
            <button
              className={`community-detail-page__like-btn${liked ? " community-detail-page__like-btn--liked" : ""}`}
              onClick={handleLike}
              disabled={likeLoading}
              aria-pressed={liked}
              aria-label={liked ? `좋아요 취소 (${likeCount})` : `좋아요 (${likeCount})`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span aria-hidden="true">{likeCount > 0 ? likeCount : "좋아요"}</span>
            </button>
            {post.category === "정보" && <ShareButton title={post.title} />}
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
        </div>

        {concert && (
          <Link to={`/concert-info/${concert.id}`} className="community-concert-card">
            {concert.poster && (
              <img src={concert.poster} alt={concert.title ?? ""} className="community-concert-card__poster" />
            )}
            <div className="community-concert-card__info">
              <p className="community-concert-card__title">{concert.title}</p>
              <p className="community-concert-card__date">
                {concert.start_date ? formatDate(concert.start_date) : ""}
                {concert.end_date !== concert.start_date && concert.end_date
                  ? ` ~ ${formatDate(concert.end_date)}`
                  : ""}
              </p>
            </div>
          </Link>
        )}

        <div
          ref={contentRef}
          className="community-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {showComments && (
          <CommentList
            postId={post.id}
            comments={comments}
            onRefresh={fetchComments}
          />
        )}

        <div className="community-detail-page__nav">
          <div className="community-detail-page__nav-row">
            <span className="community-detail-page__nav-label">이전글</span>
            {prevPost ? (
              <Link to={`/community/${prevPost.id}`} className="community-detail-page__nav-link">
                {prevPost.title}
              </Link>
            ) : (
              <span className="community-detail-page__nav-empty">이전글이 없습니다.</span>
            )}
          </div>
          <div className="community-detail-page__nav-row">
            <span className="community-detail-page__nav-label">다음글</span>
            {nextPost ? (
              <Link to={`/community/${nextPost.id}`} className="community-detail-page__nav-link">
                {nextPost.title}
              </Link>
            ) : (
              <span className="community-detail-page__nav-empty">다음글이 없습니다.</span>
            )}
          </div>
        </div>

        <div className="community-detail-page__footer">
          <Link to="/community" className="community-detail-page__list-btn">목록</Link>
        </div>

      </div>

      {showDeleteConfirm && (
        <div
          className="community-detail-page__modal-overlay"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
          aria-hidden="true"
        >
          <div
            className="community-detail-page__delete-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comm-delete-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="comm-delete-modal-title" className="community-detail-page__delete-confirm-title">
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

    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}
    </>
  );
}
