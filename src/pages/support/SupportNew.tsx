import { useState } from "react";
import { useNavigate } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import MagazineEditorToolbar from "@/pages/Magazine/MagazineEditorToolbar";
import "@/pages/Magazine/MagazineEditor.scss";

type SupportCategory = "공지" | "질문" | "제안" | "답변";

function getCategories(isAdmin: boolean): SupportCategory[] {
  return isAdmin ? ["공지", "제안", "질문", "답변"] : ["제안", "질문"];
}

export default function SupportNew() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SupportCategory>(
    isAdmin ? "공지" : "질문"
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  const handleSubmit = async () => {
    if (!user || !editor) return;
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    const content = editor.getHTML();
    if (!content || content === "<p></p>") {
      setError("내용을 입력해주세요.");
      return;
    }

    setSubmitLoading(true);
    setError(null);

    const { data: postData, error: insertError } = await supabase
      .from("support_posts")
      .insert({
        title: title.trim(),
        category,
        content,
        author_id: user.id,
        author_nickname: user.nickname,
        author_username: user.username,
      })
      .select("id")
      .single();

    if (insertError || !postData) {
      setError("글 저장에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    navigate(`/support/${postData.id}`);
  };

  return (
    <div className="magazine-editor-page">
      <div className="wrap">
        <h1 className="magazine-editor-page__title">새 글 작성</h1>

        <div className="magazine-editor-page__fields">
          <div className="magazine-editor-page__field">
            <label className="magazine-editor-page__label">제목</label>
            <input
              type="text"
              className="magazine-editor-page__input"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="magazine-editor-page__field">
            <label className="magazine-editor-page__label">카테고리</label>
            <select
              className="magazine-editor-page__select"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
            >
              {getCategories(isAdmin).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="magazine-editor-page__editor-wrap">
          <MagazineEditorToolbar
            editor={editor}
            onImageClick={() => {}}
            imageUploading={false}
          />
          <EditorContent editor={editor} className="magazine-editor-content" />
        </div>

        {error && <p className="magazine-editor-page__error">{error}</p>}

        <div className="magazine-editor-page__actions">
          <button
            type="button"
            className="magazine-editor-page__cancel-btn"
            onClick={() => navigate("/support")}
          >
            취소
          </button>
          <button
            type="button"
            className="magazine-editor-page__submit-btn"
            onClick={handleSubmit}
            disabled={submitLoading}
          >
            {submitLoading ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
