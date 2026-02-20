import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
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

export default function SupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [post, setPost] = useState<SupportPost | null>(null);
  const [reply, setReply] = useState<SupportReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      setPost(postData as SupportPost);
      await supabase.rpc("increment_support_view_count", { p_post_id: Number(id) });
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
          <div className="support-detail-page__skeleton-badge" />
          <div className="support-detail-page__skeleton-title" />
          <div className="support-detail-page__skeleton-meta" />
          <hr className="support-detail-page__divider" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="support-detail-page__skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="support-detail-page">
        <div className="wrap support-detail-page__not-found">
          <p>존재하지 않는 글입니다.</p>
          <Link to="/support">목록으로</Link>
        </div>
      </div>
    );
  }

  const canEdit =
    (isAdmin && (post.category === "공지" || post.category === "답변")) ||
    (!isAdmin && user?.id === post.author_id && (post.category === "질문" || post.category === "제안"));
  const canDelete = isAdmin || user?.id === post.author_id;

  return (
    <div className="support-detail-page">
      <div className="wrap support-detail-page__inner">
        <div className="support-detail-page__meta-top">
          <Link to="/support" className="support-detail-page__back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            목록
          </Link>
        </div>

        <span className={`support-detail-page__badge support-detail-page__badge--${post.category}`}>
          {post.category}
        </span>
        <h1 className="support-detail-page__title">{post.title}</h1>
        <div className="support-detail-page__info">
          <span className="support-detail-page__author">{post.author_nickname}</span>
          <span>·</span>
          <span>{post.created_at ? formatDate(post.created_at) : ""}</span>
          <span>·</span>
          <span>조회 {(post.view_count ?? 0).toLocaleString()}</span>
        </div>

        <hr className="support-detail-page__divider" />

        <div
          className="support-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {(canEdit || canDelete) && (
          <div className="support-detail-page__actions">
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
  );
}
