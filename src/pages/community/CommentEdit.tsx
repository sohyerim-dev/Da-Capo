import { useState } from "react";

interface Props {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

export default function CommentEdit({ initialContent, onSave, onCancel }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await onSave(content.trim());
    setSaving(false);
  };

  return (
    <div className="comment-edit">
      <textarea
        className="comment-edit__textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="comment-edit__actions">
        <button
          type="button"
          className="comment-edit__cancel-btn"
          onClick={onCancel}
          disabled={saving}
        >
          취소
        </button>
        <button
          type="button"
          className="comment-edit__save-btn"
          onClick={handleSave}
          disabled={saving || !content.trim()}
        >
          {saving ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
