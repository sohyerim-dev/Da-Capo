import { useRef, useState } from "react";
import { useNavigate } from "react-router";
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
import MagazineEditorToolbar from "./MagazineEditorToolbar";
import "./MagazineEditor.scss";

type MagazineCategory = "공지" | "큐레이터 픽" | "클래식 읽기" | "기타";

interface ConcertResult {
  id: string;
  title: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
}

const CATEGORIES: MagazineCategory[] = ["공지", "큐레이터 픽", "클래식 읽기", "기타"];

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

export default function MagazineNew() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MagazineCategory>("큐레이터 픽");

  const [concertQuery, setConcertQuery] = useState("");
  const [concertResults, setConcertResults] = useState<ConcertResult[]>([]);
  const [concertSearching, setConcertSearching] = useState(false);
  const [attachedConcerts, setAttachedConcerts] = useState<ConcertResult[]>([]);

  const [bioName, setBioName] = useState("");
  const [bioText, setBioText] = useState("");
  const [bioLinkText, setBioLinkText] = useState("");
  const [bioLinkUrl, setBioLinkUrl] = useState("");

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

  const handleConcertSearch = async () => {
    if (!concertQuery.trim()) return;
    setConcertSearching(true);
    const { data } = await supabase
      .from("concerts")
      .select("id, title, poster, start_date, end_date")
      .ilike("title", `%${concertQuery.trim()}%`)
      .limit(10);
    setConcertResults(data ?? []);
    setConcertSearching(false);
  };

  const handleAttachConcert = (concert: ConcertResult) => {
    if (attachedConcerts.some((c) => c.id === concert.id)) return;
    setAttachedConcerts((prev) => [...prev, concert]);
  };

  const handleRemoveConcert = (concertId: string) => {
    setAttachedConcerts((prev) => prev.filter((c) => c.id !== concertId));
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
      .from("magazine_posts")
      .insert({
        title: title.trim(),
        category,
        content,
        author_id: user.id,
        author_nickname: user.nickname,
        author_bio_name: bioName.trim() || null,
        author_bio_text: bioText.trim() || null,
        author_bio_link_text: bioLinkText.trim() || null,
        author_bio_link_url: bioLinkUrl.trim() || null,
      })
      .select("id")
      .single();

    if (insertError || !postData) {
      setError("글 저장에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    const postId = postData.id;

    // 이미지 경로를 실제 post id로 이동 (new → postId)
    // 간단히 현재 URL에 postId 적용은 생략, URL 그대로 사용

    if (attachedConcerts.length > 0) {
      await supabase.from("magazine_concerts").insert(
        attachedConcerts.map((c, i) => ({
          post_id: postId,
          concert_id: c.id,
          display_order: i,
        }))
      );
    }

    navigate(`/magazine/${postId}`);
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
              onChange={(e) => setCategory(e.target.value as MagazineCategory)}
            >
              {CATEGORIES.map((cat) => (
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
          <EditorContent editor={editor} className="magazine-editor-content" />
        </div>

        <div className="magazine-editor-page__bio-section">
          <h2 className="magazine-editor-page__section-title">필진 소개</h2>
          <div className="magazine-editor-page__field">
            <label className="magazine-editor-page__label">이름</label>
            <input
              type="text"
              className="magazine-editor-page__input"
              placeholder="필진 이름을 입력하세요"
              value={bioName}
              onChange={(e) => setBioName(e.target.value)}
            />
          </div>
          <div className="magazine-editor-page__field magazine-editor-page__field--bio">
            <label className="magazine-editor-page__label">소개</label>
            <textarea
              className="magazine-editor-page__textarea"
              placeholder="필진 소개를 입력하세요..."
              rows={4}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
            />
          </div>
          <div className="magazine-editor-page__bio-link-row">
            <div className="magazine-editor-page__field magazine-editor-page__field--bio-link">
              <label className="magazine-editor-page__label">SNS 링크 텍스트</label>
              <input
                type="text"
                className="magazine-editor-page__input"
                placeholder="예) Instagram, X(Twitter)"
                value={bioLinkText}
                onChange={(e) => setBioLinkText(e.target.value)}
              />
            </div>
            <div className="magazine-editor-page__field magazine-editor-page__field--bio-link">
              <label className="magazine-editor-page__label">SNS URL</label>
              <input
                type="url"
                className="magazine-editor-page__input"
                placeholder="https://..."
                value={bioLinkUrl}
                onChange={(e) => setBioLinkUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="magazine-editor-page__concert-section">
          <h2 className="magazine-editor-page__section-title">공연 정보 첨부</h2>
          <div className="magazine-editor-page__concert-search">
            <input
              type="text"
              className="magazine-editor-page__input"
              placeholder="공연명으로 검색..."
              value={concertQuery}
              onChange={(e) => setConcertQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConcertSearch();
                }
              }}
            />
            <button
              type="button"
              className="magazine-editor-page__search-btn"
              onClick={handleConcertSearch}
              disabled={concertSearching}
            >
              {concertSearching ? "검색 중..." : "검색"}
            </button>
          </div>

          {concertResults.length > 0 && (
            <div className="magazine-editor-page__concert-results">
              <button
                type="button"
                className="magazine-editor-page__results-close"
                onClick={() => setConcertResults([])}
              >
                닫기
              </button>
              {concertResults.map((concert) => (
                <div
                  key={concert.id}
                  className={`magazine-editor-page__concert-result${attachedConcerts.some((c) => c.id === concert.id) ? " magazine-editor-page__concert-result--attached" : ""}`}
                  onClick={() => handleAttachConcert(concert)}
                >
                  {concert.poster && (
                    <img
                      src={concert.poster}
                      alt={concert.title ?? ""}
                      className="magazine-editor-page__concert-poster"
                    />
                  )}
                  <div className="magazine-editor-page__concert-info">
                    <p className="magazine-editor-page__concert-title">
                      {concert.title}
                    </p>
                    <p className="magazine-editor-page__concert-date">
                      {concert.start_date ? formatDate(concert.start_date) : ""} ~{" "}
                      {concert.end_date ? formatDate(concert.end_date) : ""}
                    </p>
                  </div>
                  <span className="magazine-editor-page__concert-add">
                    {attachedConcerts.some((c) => c.id === concert.id)
                      ? "✓ 추가됨"
                      : "+ 추가"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {attachedConcerts.length > 0 && (
            <div className="magazine-editor-page__attached">
              <h3 className="magazine-editor-page__attached-title">
                첨부된 공연 ({attachedConcerts.length})
              </h3>
              <div className="magazine-editor-page__attached-list">
                {attachedConcerts.map((concert) => (
                  <div
                    key={concert.id}
                    className="magazine-editor-page__attached-item"
                  >
                    {concert.poster && (
                      <img
                        src={concert.poster}
                        alt={concert.title ?? ""}
                        className="magazine-editor-page__concert-poster"
                      />
                    )}
                    <div className="magazine-editor-page__concert-info">
                      <p className="magazine-editor-page__concert-title">
                        {concert.title}
                      </p>
                      <p className="magazine-editor-page__concert-date">
                        {concert.start_date ? formatDate(concert.start_date) : ""} ~{" "}
                        {concert.end_date ? formatDate(concert.end_date) : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="magazine-editor-page__remove-btn"
                      onClick={() => handleRemoveConcert(concert.id)}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="magazine-editor-page__error">{error}</p>}

        <div className="magazine-editor-page__actions">
          <button
            type="button"
            className="magazine-editor-page__cancel-btn"
            onClick={() => navigate("/magazine")}
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
