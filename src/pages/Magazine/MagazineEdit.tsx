import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
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

export default function MagazineEdit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MagazineCategory>("큐레이터 픽");
  const [initialContent, setInitialContent] = useState<string | null>(null);

  const [concertQuery, setConcertQuery] = useState("");
  const [concertResults, setConcertResults] = useState<ConcertResult[]>([]);
  const [concertSearching, setConcertSearching] = useState(false);
  const [attachedConcerts, setAttachedConcerts] = useState<ConcertResult[]>([]);
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");

  const [bioName, setBioName] = useState("");
  const [bioText, setBioText] = useState("");
  const [bioLinkText, setBioLinkText] = useState("");
  const [bioLinkUrl, setBioLinkUrl] = useState("");

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
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Highlight,
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: "",
  });

  // 기존 데이터 로드
  useEffect(() => {
    if (!id || !editor) return;

    const fetchData = async () => {
      const { data: postData, error: postError } = await supabase
        .from("magazine_posts")
        .select("title, category, content, author_bio_name, author_bio_text, author_bio_link_text, author_bio_link_url")
        .eq("id", Number(id))
        .single();

      if (postError || !postData) {
        navigate("/magazine");
        return;
      }

      setTitle(postData.title);
      setCategory(postData.category as MagazineCategory);
      setInitialContent(postData.content);
      setBioName(postData.author_bio_name ?? "");
      setBioText(postData.author_bio_text ?? "");
      setBioLinkText(postData.author_bio_link_text ?? "");
      setBioLinkUrl(postData.author_bio_link_url ?? "");

      // 첨부 공연 로드
      const { data: concertLinks } = await supabase
        .from("magazine_concerts")
        .select("concert_id, display_order")
        .eq("post_id", Number(id))
        .order("display_order", { ascending: true });

      if (concertLinks && concertLinks.length > 0) {
        const concertIds = concertLinks.map((c) => c.concert_id);
        const { data: concertData } = await supabase
          .from("concerts")
          .select("id, title, poster, start_date, end_date")
          .in("id", concertIds);

        if (concertData) {
          const ordered = concertLinks
            .map((link) => concertData.find((c) => c.id === link.concert_id))
            .filter((c): c is ConcertResult => !!c);
          setAttachedConcerts(ordered);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, editor, navigate]);

  // 에디터 content는 editor가 준비된 후 설정
  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `posts/${id}/${Date.now()}.${ext}`;
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
    if (!concertQuery.trim() && !searchDateFrom && !searchDateTo) return;
    setConcertSearching(true);
    const toDot = (iso: string) => iso.replace(/-/g, ".");
    let query = supabase
      .from("concerts")
      .select("id, title, poster, start_date, end_date");
    if (concertQuery.trim()) {
      query = query.ilike("title", `%${concertQuery.trim()}%`);
    }
    if (searchDateFrom) {
      query = query.gte("start_date", toDot(searchDateFrom));
    }
    if (searchDateTo) {
      query = query.lte("start_date", toDot(searchDateTo));
    }
    const { data } = await query.limit(10);
    setConcertResults(data ?? []);
    setConcertSearching(false);
  };

  useEffect(() => {
    if (searchDateFrom || searchDateTo) {
      handleConcertSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDateFrom, searchDateTo]);

  const handleAttachConcert = (concert: ConcertResult) => {
    if (attachedConcerts.some((c) => c.id === concert.id)) return;
    setAttachedConcerts((prev) => [...prev, concert]);
  };

  const handleRemoveConcert = (concertId: string) => {
    setAttachedConcerts((prev) => prev.filter((c) => c.id !== concertId));
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

    setSubmitLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("magazine_posts")
      .update({
        title: title.trim(),
        category,
        content,
        author_bio_name: bioName.trim() || null,
        author_bio_text: bioText.trim() || null,
        author_bio_link_text: bioLinkText.trim() || null,
        author_bio_link_url: bioLinkUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(id));

    if (updateError) {
      setError("글 수정에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    // 기존 공연 연결 삭제 후 재삽입
    const { error: delErr } = await supabase.from("magazine_concerts").delete().eq("post_id", Number(id));
    if (delErr) {
      setError("공연 연결 업데이트에 실패했습니다.");
      setSubmitLoading(false);
      return;
    }

    if (attachedConcerts.length > 0) {
      const { error: insErr } = await supabase.from("magazine_concerts").insert(
        attachedConcerts.map((c, i) => ({
          post_id: Number(id),
          concert_id: c.id,
          display_order: i,
        }))
      );
      if (insErr) {
        setError("공연 연결 저장에 실패했습니다.");
        setSubmitLoading(false);
        return;
      }
    }

    navigate(`/magazine/${id}`);
  };

  if (loading) {
    return (
      <div className="magazine-editor-page">
        <div className="wrap">
          <div className="magazine-editor-page__fields">
            <div className="magazine-editor-page__skeleton-field magazine-editor-page__skeleton-field--wide" />
            <div className="magazine-editor-page__skeleton-field magazine-editor-page__skeleton-field--narrow" />
          </div>
          <div className="magazine-editor-page__skeleton-editor" />
          <div className="magazine-editor-page__skeleton-section" />
        </div>
      </div>
    );
  }

  return (
    <div className="magazine-editor-page">
      <div className="wrap">
        <h1 className="magazine-editor-page__title">글 수정</h1>

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
          <div className="magazine-editor-page__search-date-row">
            <input
              type="date"
              className="magazine-editor-page__search-date-input"
              value={searchDateFrom}
              onChange={(e) => setSearchDateFrom(e.target.value)}
            />
            <span className="magazine-editor-page__search-date-sep">~</span>
            <input
              type="date"
              className="magazine-editor-page__search-date-input"
              value={searchDateTo}
              min={searchDateFrom}
              onChange={(e) => setSearchDateTo(e.target.value)}
            />
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
            onClick={() => navigate(`/magazine/${id}`)}
          >
            취소
          </button>
          <button
            type="button"
            className="magazine-editor-page__submit-btn"
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
