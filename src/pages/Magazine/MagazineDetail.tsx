import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import ShareButton from "@/components/ui/ShareButton";
import ImageLightbox from "@/components/ui/ImageLightbox";
import "./MagazineDetail.scss";

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface MagazinePost {
  id: number;
  title: string;
  category: string;
  content: string;
  author_nickname: string;
  author_bio_name: string | null;
  author_bio_text: string | null;
  author_bio_link_text: string | null;
  author_bio_link_url: string | null;
  view_count: number | null;
  created_at: string | null;
}

interface NavPost {
  id: number;
  title: string;
}

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

function formatDateTime(str: string): string {
  const d = new Date(str.replace(" ", "T"));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MagazineDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [post, setPost] = useState<MagazinePost | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
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

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: postData, error } = await supabase
        .from("magazine_posts")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(postData);

      const [, { count: fetchedLikeCount }, { data: myLike }, [{ data: prevData }, { data: nextData }]] = await Promise.all([
        supabase.rpc("increment_view_count", { p_post_id: Number(id) }),
        supabase.from("magazine_likes").select("*", { count: "exact", head: true }).eq("post_id", Number(id)),
        user
          ? supabase.from("magazine_likes").select("id").eq("post_id", Number(id)).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        Promise.all([
          supabase.from("magazine_posts").select("id, title").lt("id", Number(id)).order("id", { ascending: false }).limit(1),
          supabase.from("magazine_posts").select("id, title").gt("id", Number(id)).order("id", { ascending: true }).limit(1),
        ]),
      ]);
      setLikeCount(fetchedLikeCount ?? 0);
      setLiked(!!myLike);
      setPrevPost((prevData?.[0] as NavPost) ?? null);
      setNextPost((nextData?.[0] as NavPost) ?? null);

      // 첨부 공연 조회
      const { data: concertLinks } = await supabase
        .from("magazine_concerts")
        .select("concert_id, display_order")
        .eq("post_id", Number(id))
        .order("display_order", { ascending: true });

      if (concertLinks && concertLinks.length > 0) {
        const concertIds = concertLinks.map((c) => c.concert_id);
        const { data: concertData } = await supabase
          .from("concerts")
          .select("id, title, poster, start_date, end_date")
          .in("id", concertIds);

        if (concertData) {
          const ordered = concertLinks
            .map((link) => concertData.find((c) => c.id === link.concert_id))
            .filter((c): c is Concert => !!c);
          setConcerts(ordered);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const LIKEABLE_CATEGORIES = ["큐레이터 픽", "클래식 읽기"] as const;
  type LikeableCategory = (typeof LIKEABLE_CATEGORIES)[number];

  const handleLike = async () => {
    if (!user) { navigate("/login"); return; }
    if (likeLoading || !post) return;
    setLikeLoading(true);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      const { error } = await supabase.from("magazine_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase.from("magazine_likes").insert({ post_id: post.id, user_id: user.id });
      if (error) { setLiked(false); setLikeCount((c) => c - 1); }
    }
    setLikeLoading(false);
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const { error } = await supabase
      .from("magazine_posts")
      .delete()
      .eq("id", Number(id));
    setDeleteLoading(false);
    if (error) {
      setDeleteError("삭제에 실패했습니다.");
    } else {
      navigate("/magazine");
    }
  };

  if (loading) {
    return (
      <div className="magazine-detail-page">
        <div className="wrap magazine-detail-page__inner">
          <div className="magazine-detail-page__heading">
            <h1>매거진</h1>
          </div>
          <div className="magazine-detail-page__post-row">
            <div className="magazine-detail-page__post-row-left">
              <div className="magazine-detail-page__skeleton-badge" />
              <div className="magazine-detail-page__skeleton-title" />
            </div>
            <div className="magazine-detail-page__skeleton-meta" />
          </div>
          <hr className="magazine-detail-page__divider" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="magazine-detail-page__skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="magazine-detail-page">
        <div className="wrap magazine-detail-page__not-found">
          <p>존재하지 않는 글입니다.</p>
          <Link to="/magazine">목록으로</Link>
        </div>
      </div>
    );
  }

  const seoDescription = post.content
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .slice(0, 160)
    .trim();

  return (
    <>
      <Helmet>
        <title>{post.title} | Da Capo 매거진</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={`${post.title} | Da Capo 매거진`} />
        <meta property="og:description" content={seoDescription} />
        <link rel="canonical" href={`https://da-capo.co.kr/magazine/${post.id}`} />
      </Helmet>
    <div className="magazine-detail-page">
      <div className="wrap magazine-detail-page__inner">

        <div className="magazine-detail-page__heading">
          <h1>매거진</h1>
        </div>

        <div className="magazine-detail-page__post-row">
          <div className="magazine-detail-page__post-row-left">
            <span className="magazine-detail-page__post-num">{post.id}</span>
            <span className={`magazine-detail-page__badge magazine-detail-page__badge--${CATEGORY_SLUG[post.category] ?? "etc"}`}>
              {post.category}
            </span>
            <span className="magazine-detail-page__post-title">{post.title}</span>
          </div>
          <span className="magazine-detail-page__post-date">
            {post.created_at ? formatDateTime(post.created_at) : ""}
          </span>
        </div>

        <hr className="magazine-detail-page__divider" />

        <div className="magazine-detail-page__sub-meta">
          <div className="magazine-detail-page__sub-meta-left">
            <span>{post.author_nickname}</span>
            <span>·</span>
            <span>조회 {(post.view_count ?? 0).toLocaleString()}</span>
          </div>
          <div className="magazine-detail-page__sub-meta-right">
            {LIKEABLE_CATEGORIES.includes(post.category as LikeableCategory) && (
              <button
                className={`magazine-detail-page__like-btn${liked ? " magazine-detail-page__like-btn--liked" : ""}`}
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
            )}
            {post.category !== "공지" && (
              <ShareButton title={post.title} />
            )}
            {user?.role === "admin" && (
              <>
                <button
                  className="magazine-detail-page__action-btn"
                  onClick={() => navigate(`/magazine/${id}/edit`)}
                >
                  수정
                </button>
                <button
                  className="magazine-detail-page__action-btn magazine-detail-page__action-btn--delete"
                  onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        <div
          ref={contentRef}
          className="magazine-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
        />

        {concerts.length > 0 && (
          <div className="magazine-detail-page__concerts">
            <h2 className="magazine-detail-page__concerts-title">
              추천 공연
            </h2>
            <div className="magazine-detail-page__concerts-list">
              {concerts.map((concert) => (
                <Link
                  key={concert.id}
                  to={`/concert-info/${concert.id}`}
                  className="magazine-concert-card"
                >
                  {concert.poster && (
                    <img
                      src={concert.poster}
                      alt={concert.title ?? ""}
                      className="magazine-concert-card__poster"
                    />
                  )}
                  <div className="magazine-concert-card__info">
                    <p className="magazine-concert-card__title">
                      {concert.title}
                    </p>
                    <p className="magazine-concert-card__date">
                      {concert.start_date ? formatDate(concert.start_date) : ""}
                      {concert.end_date !== concert.start_date && concert.end_date &&
                        ` ~ ${formatDate(concert.end_date)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(post.author_bio_name || post.author_bio_text) && (
          <>
            <h2 className="magazine-detail-page__author-bio-heading">필진 소개</h2>
            <div className="magazine-detail-page__author-bio">
              {post.author_bio_name && (
                <p className="magazine-detail-page__author-bio-name">{post.author_bio_name}</p>
              )}
              {post.author_bio_text && (
                <p className="magazine-detail-page__author-bio-text">{post.author_bio_text}</p>
              )}
              {post.author_bio_link_url && (
                <a
                  className="magazine-detail-page__author-bio-link"
                  href={post.author_bio_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {post.author_bio_link_text || post.author_bio_link_url}
                </a>
              )}
            </div>
          </>
        )}

        <div className="magazine-detail-page__nav">
          <div className="magazine-detail-page__nav-row">
            <span className="magazine-detail-page__nav-label">이전글</span>
            {prevPost ? (
              <Link to={`/magazine/${prevPost.id}`} className="magazine-detail-page__nav-link">
                {prevPost.title}
              </Link>
            ) : (
              <span className="magazine-detail-page__nav-empty">이전글이 없습니다.</span>
            )}
          </div>
          <div className="magazine-detail-page__nav-row">
            <span className="magazine-detail-page__nav-label">다음글</span>
            {nextPost ? (
              <Link to={`/magazine/${nextPost.id}`} className="magazine-detail-page__nav-link">
                {nextPost.title}
              </Link>
            ) : (
              <span className="magazine-detail-page__nav-empty">다음글이 없습니다.</span>
            )}
          </div>
        </div>

        <div className="magazine-detail-page__footer">
          <Link to="/magazine" className="magazine-detail-page__list-btn">목록</Link>
        </div>

      </div>

      {showDeleteConfirm && (
        <div className="magazine-detail-page__modal-overlay" onClick={() => !deleteLoading && setShowDeleteConfirm(false)} aria-hidden="true">
          <div
            className="magazine-detail-page__delete-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mag-delete-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="mag-delete-modal-title" className="magazine-detail-page__delete-confirm-title">글을 삭제하시겠습니까?</p>
            <p className="magazine-detail-page__delete-confirm-desc">삭제 후 복구할 수 없습니다.</p>
            {deleteError && <p className="magazine-detail-page__delete-confirm-desc" style={{ color: "#e53935" }}>{deleteError}</p>}
            <div className="magazine-detail-page__delete-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                className="magazine-detail-page__delete-confirm-btn"
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
