import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import EditorToolbar from "@/components/editor/EditorToolbar";
import "./CommunityNew.scss";

type CommunityCategory = "자유" | "정보" | "공지" | "후기";

interface CategoryOption {
  value: CommunityCategory;
  label: string;
}

interface ConcertResult {
  id: string;
  title: string | null;
  start_date: string | null;
}

function getAvailableCategories(isAdmin: boolean): CategoryOption[] {
  const base: CategoryOption[] = [
    { value: "자유", label: "자유" },
    { value: "정보", label: "정보" },
    { value: "후기", label: "후기" },
  ];
  if (isAdmin) {
    return [{ value: "공지", label: "공지" }, ...base];
  }
  return base;
}

function convertToNoteDate(startDate: string | null): string {
  if (!startDate) return new Date().toISOString().split("T")[0];
  if (/^\d{8}$/.test(startDate)) {
    return `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
  }
  return startDate.split("T")[0] ?? new Date().toISOString().split("T")[0];
}

function formatConcertDate(dateStr: string): string {
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

export default function CommunityNew() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const isAdmin = user?.role === "admin";
  const categories = getAvailableCategories(isAdmin);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CommunityCategory>(isAdmin ? "공지" : "자유");
  const [concertQuery, setConcertQuery] = useState("");
  const [concertResults, setConcertResults] = useState<ConcertResult[]>([]);
  const [concertSearching, setConcertSearching] = useState(false);
  const [attachedConcert, setAttachedConcert] = useState<ConcertResult | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  const handleCategoryChange = (val: CommunityCategory) => {
    setCategory(val);
    if (val !== "후기") {
      setAttachedConcert(null);
      setConcertResults([]);
      setConcertQuery("");
    }
  };

  const handleConcertSearch = async () => {
    if (!concertQuery.trim()) return;
    setConcertSearching(true);
    const { data } = await supabase
      .from("concerts")
      .select("id, title, start_date")
      .ilike("title", `%${concertQuery.trim()}%`)
      .eq("status", "공연완료")
      .limit(10);
    setConcertResults(data ?? []);
    setConcertSearching(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!editor || !user) return;
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `community/${user.id}/${Date.now()}.${ext}`;
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
    if (category === "후기" && !attachedConcert) {
      setError("후기에는 공연을 연결해주세요.");
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

    let noteId: number | null = null;

    if (category === "후기" && attachedConcert) {
      const noteResult = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          type: "concert_record",
          title: title.trim(),
          content: content === "<p></p>" ? null : content,
          note_date: convertToNoteDate(attachedConcert.start_date),
          concert_id: attachedConcert.id,
          is_public: true,
        })
        .select("id")
        .single();

      if (noteResult.error || !noteResult.data) {
        setError("글 저장에 실패했습니다.");
        setSubmitLoading(false);
        return;
      }
      noteId = noteResult.data.id;
    }

    const { data: postData, error: insertError } = await supabase
      .from("community_posts")
      .insert({
        title: title.trim(),
        category,
        content,
        author_id: user.id,
        author_nickname: user.nickname,
        author_username: user.username,
        author_role: user.role,
        source_note_id: noteId,
        concert_id: attachedConcert?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError || !postData) {
      setError("글 저장에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    navigate(`/community/${postData.id}`);
  };

  return (
    <div className="community-editor-page">
      <div className="wrap">
        <h1 className="community-editor-page__title">새 글 작성</h1>

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
            <select
              className="community-editor-page__select"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as CommunityCategory)}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {category === "후기" && (
          <div className="community-editor-page__field">
            <label className="community-editor-page__label">
              공연 <span className="community-editor-page__required">*</span>
            </label>
            {attachedConcert ? (
              <div className="community-editor-page__attached-concert">
                <span className="community-editor-page__attached-concert-title">
                  {attachedConcert.title}
                </span>
                {attachedConcert.start_date && (
                  <span className="community-editor-page__attached-concert-date">
                    {formatConcertDate(attachedConcert.start_date)}
                  </span>
                )}
                <button
                  type="button"
                  className="community-editor-page__attached-concert-remove"
                  onClick={() => setAttachedConcert(null)}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="community-editor-page__concert-search-row">
                <input
                  type="text"
                  className="community-editor-page__input"
                  placeholder="공연명으로 검색"
                  value={concertQuery}
                  onChange={(e) => setConcertQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConcertSearch()}
                />
                <button
                  type="button"
                  className="community-editor-page__search-btn"
                  onClick={handleConcertSearch}
                  disabled={concertSearching}
                >
                  {concertSearching ? "검색 중..." : "검색"}
                </button>
              </div>
            )}
            {concertResults.length > 0 && !attachedConcert && (
              <ul className="community-editor-page__concert-results">
                {concertResults.map((c) => (
                  <li
                    key={c.id}
                    className="community-editor-page__concert-result-item"
                    onClick={() => {
                      setAttachedConcert(c);
                      setConcertResults([]);
                      setConcertQuery("");
                    }}
                  >
                    <span className="community-editor-page__concert-result-title">
                      {c.title}
                    </span>
                    {c.start_date && (
                      <span className="community-editor-page__concert-result-date">
                        {formatConcertDate(c.start_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
            onClick={() => navigate("/community")}
          >
            취소
          </button>
          <button
            type="button"
            className="community-editor-page__submit-btn"
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
