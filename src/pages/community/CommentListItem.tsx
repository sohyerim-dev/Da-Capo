import { useState } from "react";
import { Link } from "react-router";
import CommentEdit from "./CommentEdit";

interface CommunityComment {
  id: number;
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

interface Props {
  comment: CommunityComment;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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

export default function CommentListItem({
  comment,
  currentUserId,
  isAdmin,
  onUpdate,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = currentUserId === comment.author_id;
  const canDelete = currentUserId === comment.author_id || isAdmin;

  const handleSave = async (content: string) => {
    await onUpdate(comment.id, content);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(comment.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <li className="comment-item">
      <div className="comment-item__header">
        <Link to={`/classic-note/${comment.author_username ?? comment.author_id}`} className="comment-item__author">
          {comment.author_nickname}
        </Link>
        <span className="comment-item__date">
          {comment.created_at ? formatDate(comment.created_at) : ""}
          {comment.updated_at !== comment.created_at && " (수정됨)"}
        </span>
        <div className="comment-item__actions">
          {canEdit && !editing && (
            <button
              type="button"
              className="comment-item__btn"
              onClick={() => setEditing(true)}
            >
              수정
            </button>
          )}
          {canDelete && !editing && (
            <button
              type="button"
              className="comment-item__btn comment-item__btn--delete"
              onClick={() => setConfirmDelete(true)}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <CommentEdit
          initialContent={comment.content}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p className="comment-item__content">{comment.content}</p>
      )}

      {confirmDelete && (
        <div className="comment-item__confirm">
          <span>삭제하시겠습니까?</span>
          <button
            type="button"
            className="comment-item__btn"
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
          >
            취소
          </button>
          <button
            type="button"
            className="comment-item__btn comment-item__btn--delete"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      )}
    </li>
  );
}
