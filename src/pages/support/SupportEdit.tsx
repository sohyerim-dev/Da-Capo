import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import MagazineEditorToolbar from "@/pages/Magazine/MagazineEditorToolbar";
import "@/pages/Magazine/MagazineEditor.scss";

type SupportCategory = "공지" | "질문" | "제안" | "답변";

interface SupportPost {
  id: number;
  title: string;
  category: SupportCategory;
  content: string;
  author_id: string;
}

export default function SupportEdit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [post, setPost] = useState<SupportPost | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  useEffect(() => {
    if (!id || !user) return;

    const fetchPost = async () => {
      const { data, error: fetchError } = await supabase
        .from("support_posts")
        .select("id, title, category, content, author_id")
        .eq("id", Number(id))
        .single();

      if (fetchError || !data) {
        navigate("/support");
        return;
      }

      const postData = data as SupportPost;

      // 권한 체크
      const isAdminCategory = postData.category === "공지" || postData.category === "답변";
      if (isAdminCategory && !isAdmin) {
        navigate("/");
        return;
      }
      if (!isAdminCategory && user.id !== postData.author_id) {
        navigate("/");
        return;
      }

      setPost(postData);
      setTitle(postData.title);
      setLoading(false);
    };

    fetchPost();
  }, [id, user, isAdmin, navigate]);

  useEffect(() => {
    if (editor && post) {
      editor.commands.setContent(post.content);
    }
  }, [editor, post]);

  const handleSubmit = async () => {
    if (!user || !editor || !post) return;
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

    const { error: updateError } = await supabase
      .from("support_posts")
      .update({
        title: title.trim(),
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (updateError) {
      setError("수정에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    navigate(`/support/${post.id}`);
  };

  if (loading) {
    return (
      <div className="magazine-editor-page">
        <div className="wrap">
          <p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="magazine-editor-page">
      <div className="wrap">
        <h1 className="magazine-editor-page__title">문의 수정</h1>

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
              value={post?.category}
              disabled
            >
              <option value={post?.category}>{post?.category}</option>
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
            onClick={() => navigate(`/support/${post?.id}`)}
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
