import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
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
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SupportCategory>(
    isAdmin ? "공지" : "질문"
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        resize: {
          enabled: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `posts/new/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("magazine")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("이미지 업로드에 실패했습니다.");
      setImageUploading(false);
      return;
    }

    const { data } = supabase.storage.from("magazine").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
    setImageUploading(false);
  };

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
        is_private: !isAdmin && isPrivate,
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

          {!isAdmin && (
            <div className="magazine-editor-page__field">
              <label className="magazine-editor-page__label">공개 설정</label>
              <div className="magazine-editor-page__privacy-btns">
                <button
                  type="button"
                  className={`magazine-editor-page__privacy-btn${!isPrivate ? " magazine-editor-page__privacy-btn--active" : ""}`}
                  onClick={() => setIsPrivate(false)}
                >
                  공개
                </button>
                <button
                  type="button"
                  className={`magazine-editor-page__privacy-btn${isPrivate ? " magazine-editor-page__privacy-btn--active" : ""}`}
                  onClick={() => setIsPrivate(true)}
                >
                  비공개
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="magazine-editor-page__editor-wrap">
          <MagazineEditorToolbar
            editor={editor}
            onImageClick={() => imageInputRef.current?.click()}
            imageUploading={imageUploading}
          />
          <EditorContent editor={editor} className="magazine-editor-content" />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = "";
            }}
          />
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
