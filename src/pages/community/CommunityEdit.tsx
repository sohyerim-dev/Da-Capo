import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import EditorToolbar from "@/components/editor/EditorToolbar";
import "./CommunityNew.scss";

type CommunityCategory = "공지" | "자유" | "후기" | "정보";

const EDITABLE_CATEGORIES: CommunityCategory[] = ["공지", "자유", "정보"];

export default function CommunityEdit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const isAdmin = user?.role === "admin";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("자유");
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [sourceNoteId, setSourceNoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
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
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Highlight,
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data, error: fetchError } = await supabase
        .from("community_posts")
        .select("title, category, content, author_id, source_note_id")
        .eq("id", Number(id))
        .single();

      if (fetchError || !data) {
        navigate("/community");
        return;
      }

      // 권한 체크: 작성자 또는 admin만 수정 가능
      if (data.author_id !== user?.id && !isAdmin) {
        navigate("/community");
        return;
      }

      setTitle(data.title);
      setCategory(data.category as CommunityCategory);
      setInitialContent(data.content);
      if (data.source_note_id) setSourceNoteId(data.source_note_id);
      setLoading(false);
    };

    fetchData();
  }, [id, user?.id, isAdmin, navigate]);

  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  const handleImageUpload = async (file: File) => {
    if (!editor || !user) return;
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `community/${id}/${Date.now()}.${ext}`;
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
    if (!user || !editor || !id) return;
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    const content = editor.getHTML();
    if (!content || content === "<p></p>") {
      setError("내용을 입력해주세요.");
      return;
    }
    if (category === "공지" && !isAdmin) {
      setError("공지 카테고리는 관리자만 작성할 수 있습니다.");
      return;
    }

    setSubmitLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("community_posts")
      .update({
        title: title.trim(),
        category,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(id));

    if (updateError) {
      setError("글 수정에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    // 후기인 경우 연동된 노트도 함께 업데이트
    if (sourceNoteId) {
      await supabase
        .from("notes")
        .update({ title: title.trim(), content, updated_at: new Date().toISOString() })
        .eq("id", sourceNoteId);
    }

    navigate(`/community/${id}`);
  };

  if (loading) {
    return (
      <div className="community-editor-page">
        <div className="wrap">
          <div
            style={{ display: "flex", gap: 16, marginBottom: 24 }}
          >
            <div className="community-editor-page__skeleton-field community-editor-page__skeleton-field--wide" />
            <div className="community-editor-page__skeleton-field community-editor-page__skeleton-field--narrow" />
          </div>
          <div className="community-editor-page__skeleton-editor" />
        </div>
      </div>
    );
  }

  const availableCategories = isAdmin
    ? EDITABLE_CATEGORIES
    : EDITABLE_CATEGORIES.filter((c) => c !== "공지");

  return (
    <div className="community-editor-page">
      <div className="wrap">
        <h1 className="community-editor-page__title">글 수정</h1>

        <div className="community-editor-page__fields">
          <div className="community-editor-page__field">
            <label className="community-editor-page__label">제목</label>
            <input
              type="text"
              className="community-editor-page__input"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="community-editor-page__field community-editor-page__field--narrow">
            <label className="community-editor-page__label">카테고리</label>
            {sourceNoteId ? (
              <span className="community-editor-page__select" style={{ display: "flex", alignItems: "center", color: "#888", cursor: "default" }}>
                후기
              </span>
            ) : (
              <select
                className="community-editor-page__select"
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="community-editor-page__editor-wrap">
          <EditorToolbar
            editor={editor ?? null}
            onImageClick={() => imageInputRef.current?.click()}
            imageUploading={imageUploading}
          />
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
          <EditorContent editor={editor} className="community-editor-content" />
        </div>

        {error && <p className="community-editor-page__error">{error}</p>}

        <div className="community-editor-page__actions">
          <button
            type="button"
            className="community-editor-page__cancel-btn"
            onClick={() => navigate(`/community/${id}`)}
          >
            취소
          </button>
          <button
            type="button"
            className="community-editor-page__submit-btn"
            onClick={handleSubmit}
            disabled={submitLoading}
          >
            {submitLoading ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
