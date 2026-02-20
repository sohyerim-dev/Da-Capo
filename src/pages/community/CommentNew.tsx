import { useState } from "react";
import { Link } from "react-router";

interface Props {
  isLoggedIn: boolean;
  onSubmit: (content: string) => Promise<void>;
}

export default function CommentNew({ isLoggedIn, onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit(content.trim());
    setContent("");
    setSubmitting(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="comment-new comment-new--guest">
        <Link to="/login" className="comment-new__login-link">
          로그인 후 댓글을 작성할 수 있습니다.
        </Link>
      </div>
    );
  }

  return (
    <div className="comment-new">
      <textarea
        className="comment-new__textarea"
        placeholder="댓글을 입력하세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="comment-new__footer">
        <button
          type="button"
          className="comment-new__submit-btn"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? "등록 중..." : "댓글 등록"}
        </button>
      </div>
    </div>
  );
}
