import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import ImageLightbox from "@/components/ui/ImageLightbox";
import "./SupportDetail.scss";

type SupportCategory = "공지" | "질문" | "제안" | "답변";

interface SupportPost {
  id: number;
  title: string;
  category: SupportCategory;
  content: string;
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  view_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  is_private: boolean;
}

interface SupportReply {
  id: number;
  post_id: number;
  author_id: string;
  author_nickname: string;
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

export default function SupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [post, setPost] = useState<SupportPost | null>(null);
  const [reply, setReply] = useState<SupportReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [privateBlocked, setPrivateBlocked] = useState(false);
  const [prevPost, setPrevPost] = useState<NavPost | null>(null);
  const [nextPost, setNextPost] = useState<NavPost | null>(null);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  // 삭제
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 답글 작성/수정
  const [replyContent, setReplyContent] = useState("");
  const [replyEditing, setReplyEditing] = useState(false);
  const [replyEditContent, setReplyEditContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [showReplyDeleteConfirm, setShowReplyDeleteConfirm] = useState(false);
  const [replyDeleteLoading, setReplyDeleteLoading] = useState(false);

  const fetchReply = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("support_replies")
      .select("*")
      .eq("post_id", Number(id))
      .maybeSingle();
    setReply(data as SupportReply | null);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: postData, error } = await supabase
        .from("support_posts")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const typedPost = postData as SupportPost;
      if (typedPost.is_private && !isAdmin && user?.id !== typedPost.author_id) {
        setPrivateBlocked(true);
        setLoading(false);
        return;
      }

      setPost(typedPost);

      const [, [{ data: prevData }, { data: nextData }]] = await Promise.all([
        supabase.rpc("increment_support_view_count", { p_post_id: Number(id) }),
        Promise.all([
          supabase.from("support_posts").select("id, title").lt("id", Number(id)).order("id", { ascending: false }).limit(1),
          supabase.from("support_posts").select("id, title").gt("id", Number(id)).order("id", { ascending: true }).limit(1),
        ]),
      ]);
      setPrevPost((prevData?.[0] as NavPost) ?? null);
      setNextPost((nextData?.[0] as NavPost) ?? null);

      setLoading(false);
    };

    fetchData();
    fetchReply();
  }, [id, fetchReply]);

  const handleDelete = async () => {
    if (!id || !post) return;
    setDeleteLoading(true);

    if (isAdmin && post.author_id !== user?.id) {
      await supabase.rpc("admin_delete_support_post", { p_post_id: post.id });
    } else {
      await supabase.from("support_posts").delete().eq("id", Number(id));
    }

    setDeleteLoading(false);
    navigate("/support");
  };

  const handleReplySubmit = async () => {
    if (!user || !post || !replyContent.trim()) return;
    setReplyLoading(true);

    const { error } = await supabase.from("support_replies").insert({
      post_id: post.id,
      author_id: user.id,
      author_nickname: user.nickname,
      content: replyContent.trim(),
    });

    if (!error) {
      setReplyContent("");
      await fetchReply();
    }
    setReplyLoading(false);
  };

  const handleReplyUpdate = async () => {
    if (!reply || !replyEditContent.trim()) return;
    setReplyLoading(true);

    await supabase
      .from("support_replies")
      .update({ content: replyEditContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", reply.id);

    setReplyEditing(false);
    await fetchReply();
    setReplyLoading(false);
  };

  const handleReplyDelete = async () => {
    if (!reply) return;
    setReplyDeleteLoading(true);
    await supabase.from("support_replies").delete().eq("id", reply.id);
    setReply(null);
    setShowReplyDeleteConfirm(false);
    setReplyDeleteLoading(false);
  };

  if (loading) {
    return (
      <div className="support-detail-page">
        <div className="wrap support-detail-page__inner">
          <div className="support-detail-page__heading">
            <h1>고객지원</h1>
          </div>
          <div className="support-detail-page__post-row">
            <div className="support-detail-page__post-row-left">
              <div className="support-detail-page__skeleton-badge" />
              <div className="support-detail-page__skeleton-title" />
            </div>
            <div className="support-detail-page__skeleton-meta" />
          </div>
          <hr className="support-detail-page__divider" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="support-detail-page__skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  if (privateBlocked) {
    return (
      <div className="support-detail-page">
        <div className="wrap support-detail-page__private-blocked">
          <div className="support-detail-page__private-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="support-detail-page__private-title">비공개 글입니다</h2>
          <p className="support-detail-page__private-desc">작성자와 관리자만 확인할 수 있는 글입니다.</p>
          <Link to="/support" className="support-detail-page__private-btn">목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="support-detail-page">
        <div className="wrap support-detail-page__not-found">
          <div className="support-detail-page__private-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p>존재하지 않는 글입니다.</p>
          <Link to="/support">목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const canEdit =
    (isAdmin && (post.category === "공지" || post.category === "답변")) ||
    (!isAdmin && user?.id === post.author_id && (post.category === "질문" || post.category === "제안"));
  const canDelete = isAdmin || user?.id === post.author_id;

  return (
    <>
    <div className="support-detail-page">
      <div className="wrap support-detail-page__inner">

        <div className="support-detail-page__heading">
          <h1>고객지원</h1>
        </div>

        <div className="support-detail-page__post-row">
          <div className="support-detail-page__post-row-left">
            <span className="support-detail-page__post-num">{post.id}</span>
            <span className={`support-detail-page__badge support-detail-page__badge--${post.category}`}>
              {post.category}
            </span>
            {post.is_private && (
              <span className="support-detail-page__badge support-detail-page__badge--private">
                비공개
              </span>
            )}
            <span className="support-detail-page__post-title">{post.title}</span>
          </div>
          <span className="support-detail-page__post-date">
            {post.created_at ? formatDateTime(post.created_at) : ""}
          </span>
        </div>

        <hr className="support-detail-page__divider" />

        <div className="support-detail-page__sub-meta">
          <div className="support-detail-page__sub-meta-left">
            <span className="support-detail-page__author">{post.author_nickname}</span>
            <span>·</span>
            <span>조회 {(post.view_count ?? 0).toLocaleString()}</span>
          </div>
          {(canEdit || canDelete) && (
            <div className="support-detail-page__sub-meta-right">
              {canEdit && (
                <button
                  className="support-detail-page__action-btn"
                  onClick={() => navigate(`/support/${id}/edit`)}
                >
                  수정
                </button>
              )}
              {canDelete && (
                <button
                  className="support-detail-page__action-btn support-detail-page__action-btn--delete"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </div>

        <div
          ref={contentRef}
          className="support-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 답글 섹션 */}
        <div className="support-reply">
          <h3 className="support-reply__title">답변</h3>

          {reply ? (
            <div className="support-reply__item">
              <div className="support-reply__header">
                <span className="support-reply__author">{reply.author_nickname}</span>
                <span className="support-reply__badge">관리자</span>
                <span className="support-reply__date">
                  {reply.created_at ? formatDate(reply.created_at) : ""}
                  {reply.updated_at !== reply.created_at && " (수정됨)"}
                </span>
                {isAdmin && !replyEditing && (
                  <div className="support-reply__actions">
                    <button
                      type="button"
                      className="support-reply__btn"
                      onClick={() => {
                        setReplyEditContent(reply.content);
                        setReplyEditing(true);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="support-reply__btn support-reply__btn--delete"
                      onClick={() => setShowReplyDeleteConfirm(true)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>

              {replyEditing ? (
                <div className="support-reply__edit">
                  <textarea
                    className="support-reply__textarea"
                    value={replyEditContent}
                    onChange={(e) => setReplyEditContent(e.target.value)}
                    rows={4}
                  />
                  <div className="support-reply__edit-actions">
                    <button
                      type="button"
                      className="support-reply__cancel-btn"
                      onClick={() => setReplyEditing(false)}
                      disabled={replyLoading}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="support-reply__save-btn"
                      onClick={handleReplyUpdate}
                      disabled={replyLoading || !replyEditContent.trim()}
                    >
                      {replyLoading ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="support-reply__content">{reply.content}</p>
              )}

              {showReplyDeleteConfirm && (
                <div className="support-reply__confirm">
                  <span>답변을 삭제하시겠습니까?</span>
                  <button
                    type="button"
                    className="support-reply__btn"
                    onClick={() => setShowReplyDeleteConfirm(false)}
                    disabled={replyDeleteLoading}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="support-reply__btn support-reply__btn--delete"
                    onClick={handleReplyDelete}
                    disabled={replyDeleteLoading}
                  >
                    {replyDeleteLoading ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            <div className="support-reply__form">
              <textarea
                className="support-reply__textarea"
                placeholder="답변을 입력하세요..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
              />
              <div className="support-reply__form-footer">
                <button
                  type="button"
                  className="support-reply__submit-btn"
                  onClick={handleReplySubmit}
                  disabled={replyLoading || !replyContent.trim()}
                >
                  {replyLoading ? "등록 중..." : "답변 등록"}
                </button>
              </div>
            </div>
          ) : (
            <p className="support-reply__empty">아직 답변이 등록되지 않았습니다.</p>
          )}
        </div>

        <div className="support-detail-page__nav">
          <div className="support-detail-page__nav-row">
            <span className="support-detail-page__nav-label">이전글</span>
            {prevPost ? (
              <Link to={`/support/${prevPost.id}`} className="support-detail-page__nav-link">
                {prevPost.title}
              </Link>
            ) : (
              <span className="support-detail-page__nav-empty">이전글이 없습니다.</span>
            )}
          </div>
          <div className="support-detail-page__nav-row">
            <span className="support-detail-page__nav-label">다음글</span>
            {nextPost ? (
              <Link to={`/support/${nextPost.id}`} className="support-detail-page__nav-link">
                {nextPost.title}
              </Link>
            ) : (
              <span className="support-detail-page__nav-empty">다음글이 없습니다.</span>
            )}
          </div>
        </div>

        <div className="support-detail-page__footer">
          <Link to="/support" className="support-detail-page__list-btn">목록</Link>
        </div>

      </div>

      {showDeleteConfirm && (
        <div
          className="support-detail-page__modal-overlay"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="support-detail-page__delete-confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="support-detail-page__delete-confirm-title">글을 삭제하시겠습니까?</p>
            <p className="support-detail-page__delete-confirm-desc">삭제 후 복구할 수 없습니다.</p>
            <div className="support-detail-page__delete-actions">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
                취소
              </button>
              <button
                className="support-detail-page__delete-confirm-btn"
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
