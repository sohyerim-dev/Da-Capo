import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import EditorToolbar from "@/components/editor/EditorToolbar";
import type { Note } from "./ClassicNote";
import "./NotePanel.scss";

type NoteType = "concert_record" | "free_writing";

interface ConcertResult {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: string | null;
  open_run: string | null;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function parseScheduleWeekdays(schedule: string | null): Set<number> | null {
  if (!schedule) return null;
  if (schedule.includes("매일")) return null;
  const days = new Set<number>();
  WEEKDAY_LABELS.forEach((label, i) => {
    if (schedule.includes(label)) days.add(i);
  });
  return days.size > 0 ? days : null;
}

function getPerformanceDates(concert: ConcertResult): string[] {
  const startISO = concertDateToInputDate(concert.start_date);
  const endISO = concertDateToInputDate(concert.end_date ?? concert.start_date);
  if (!startISO) return [];

  const scheduledDays = parseScheduleWeekdays(concert.schedule);
  const endDate = new Date((endISO || startISO) + "T00:00:00");

  const allDates: string[] = [];
  const cursor = new Date(startISO + "T00:00:00");
  while (cursor <= endDate && allDates.length < 200) {
    const y = cursor.getFullYear();
    const mo = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${d}`;
    if (!scheduledDays || scheduledDays.has(cursor.getDay())) {
      allDates.push(dateStr);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return allDates;
}

function formatPickerDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayLabel = WEEKDAY_LABELS[d.getDay()];
  return `${dateStr.replace(/-/g, ".")} (${dayLabel})`;
}

interface Props {
  open: boolean;
  defaultDate: string;
  editingNote: Note | null;
  onClose: () => void;
  onSaved: () => void;
}

function formatConcertDate(dateStr: string): string {
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function concertDateToInputDate(startDate: string | null): string {
  if (!startDate) return "";
  if (/^\d{8}$/.test(startDate)) {
    return `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
  }
  return startDate.split("T")[0] ?? "";
}

export default function NoteFormPanel({
  open,
  defaultDate,
  editingNote,
  onClose,
  onSaved,
}: Props) {
  const { user } = useUserStore();

  const [type, setType] = useState<NoteType>("concert_record");
  const [noteDate, setNoteDate] = useState(defaultDate);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [concertQuery, setConcertQuery] = useState("");
  const [concertResults, setConcertResults] = useState<ConcertResult[]>([]);
  const [attachedConcert, setAttachedConcert] = useState<ConcertResult | null>(null);
  const [concertSearching, setConcertSearching] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const placeholderRef = useRef("내용을 입력하세요... (선택 사항)");

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
      Placeholder.configure({ placeholder: () => placeholderRef.current }),
    ],
    content: "",
  });

  useEffect(() => {
    const isRequired = type === "free_writing" || (type === "concert_record" && isPublic);
    placeholderRef.current = isRequired
      ? "내용을 입력하세요..."
      : "내용을 입력하세요... (선택 사항)";
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr);
    }
  }, [type, isPublic, editor]);

  // 폼 초기화 (open 될 때마다)
  useEffect(() => {
    if (!open) return;

    if (editingNote) {
      setType(editingNote.type);
      setNoteDate(editingNote.note_date);
      setTitle(editingNote.title ?? "");
      setIsPublic(editingNote.is_public ?? false);
      editor?.commands.setContent(editingNote.content ?? "");

      if (editingNote.concert_id) {
        supabase
          .from("concerts")
          .select("id, title, start_date, end_date, schedule, open_run")
          .eq("id", editingNote.concert_id)
          .single()
          .then(({ data }) => {
            if (data) setAttachedConcert(data);
          });
      } else {
        setAttachedConcert(null);
      }
    } else {
      setType("concert_record");
      setNoteDate(defaultDate);
      setTitle("");
      setIsPublic(false);
      setAttachedConcert(null);
      editor?.commands.setContent("");
    }

    setConcertQuery("");
    setConcertResults([]);
    setError(null);
  }, [open, editingNote, defaultDate, editor]);

  const handleImageUpload = async (file: File) => {
    if (!editor || !user) return;
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `notes/${user.id}/${Date.now()}.${ext}`;
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
      .select("id, title, start_date, end_date, schedule, open_run")
      .ilike("title", `%${concertQuery.trim()}%`)
      .eq("status", "공연완료")
      .limit(10);
    setConcertResults(data ?? []);
    setConcertSearching(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!noteDate) {
      setError("날짜를 선택해주세요.");
      return;
    }
    if (type === "concert_record" && !attachedConcert) {
      setError("관람 기록에는 공연을 연결해주세요.");
      return;
    }
    if (type === "concert_record" && isPublic) {
      if (!title.trim()) {
        setError("공개 관람 기록에는 제목을 입력해주세요.");
        return;
      }
      const contentCheck = editor?.getHTML() ?? "";
      if (!contentCheck || contentCheck === "<p></p>") {
        setError("공개 관람 기록에는 내용을 입력해주세요.");
        return;
      }
    }
    if (type === "free_writing") {
      if (!title.trim()) {
        setError("제목을 입력해주세요.");
        return;
      }
      const content = editor?.getHTML() ?? "";
      if (!content || content === "<p></p>") {
        setError("내용을 입력해주세요.");
        return;
      }
    }

    setSubmitLoading(true);
    setError(null);

    const content = editor?.getHTML() ?? "";
    const cleanContent = content === "<p></p>" ? null : content;

    const payload = {
      user_id: user.id,
      type,
      title: title.trim() || null,
      content: cleanContent,
      note_date: noteDate,
      concert_id: type === "concert_record" ? (attachedConcert?.id ?? null) : null,
      is_public: type === "concert_record" ? isPublic : false,
    };

    let saveError: { message: string } | null = null;

    if (editingNote) {
      const result = await supabase
        .from("notes")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingNote.id)
        .select();
      if (result.error) {
        saveError = result.error;
      } else if (!result.data || result.data.length === 0) {
        saveError = { message: "저장할 노트를 찾을 수 없습니다." };
      }

      // community_posts 동기화 (관람 기록만)
      if (!saveError && type === "concert_record") {
        if (isPublic) {
          const { data: existing } = await supabase
            .from("community_posts")
            .select("id")
            .eq("source_note_id", editingNote.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("community_posts")
              .update({
                title: title.trim() || `${attachedConcert!.title} 관람 후기`,
                content: cleanContent ?? "",
                concert_id: attachedConcert?.id ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("community_posts").insert({
              title: title.trim() || `${attachedConcert!.title} 관람 후기`,
              category: "후기",
              content: cleanContent ?? "",
              author_id: user.id,
              author_nickname: user.nickname,
              author_username: user.username,
              author_role: user.role,
              source_note_id: editingNote.id,
              concert_id: attachedConcert?.id ?? null,
            });
          }
        } else {
          // 비공개 전환 시 커뮤니티 후기 글 삭제
          await supabase
            .from("community_posts")
            .delete()
            .eq("source_note_id", editingNote.id);
        }
      }
    } else {
      const result = await supabase
        .from("notes")
        .insert(payload)
        .select("id")
        .single();
      saveError = result.error;

      // 새 노트: 공개 관람 기록이면 커뮤니티 후기 글 생성
      if (!saveError && type === "concert_record" && isPublic && result.data?.id) {
        await supabase.from("community_posts").insert({
          title: title.trim() || `${attachedConcert!.title} 관람 후기`,
          category: "후기",
          content: cleanContent ?? "",
          author_id: user.id,
          author_nickname: user.nickname,
          author_username: user.username,
          author_role: user.role,
          source_note_id: result.data.id,
          concert_id: attachedConcert?.id ?? null,
        });
      }
    }

    setSubmitLoading(false);

    if (saveError) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    onSaved();
  };

  const isSingleDayConcert =
    type === "concert_record" &&
    !!attachedConcert &&
    (!attachedConcert.end_date ||
      concertDateToInputDate(attachedConcert.start_date) ===
        concertDateToInputDate(attachedConcert.end_date));

  const concertPerformanceDates =
    type === "concert_record" && attachedConcert && !isSingleDayConcert
      ? getPerformanceDates(attachedConcert)
      : [];

  return (
    <div className={`note-panel note-panel--form${open ? " note-panel--open" : ""}`}>
      <div className="note-panel__header">
        <span className="note-panel__header-title">
          {editingNote ? "기록 수정" : "새 기록"}
        </span>
        <button className="note-panel__close" onClick={onClose} aria-label="닫기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="note-panel__body">
        {/* 기록 종류 탭 */}
        <div className="note-form__tabs">
          <button
            className={`note-form__tab${type === "concert_record" ? " note-form__tab--active" : ""}`}
            onClick={() => setType("concert_record")}
          >
            관람 기록
          </button>
          <button
            className={`note-form__tab${type === "free_writing" ? " note-form__tab--active" : ""}`}
            onClick={() => setType("free_writing")}
          >
            자유 기록
          </button>
        </div>

        {/* 날짜 */}
        <div className="note-form__field">
          <label className="note-form__label">날짜</label>
          {/* 자유 기록 or 관람 기록인데 공연 미연결: 자유 입력 */}
          {(type === "free_writing" || !attachedConcert) && (
            <input
              type="date"
              className="note-form__input"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
          )}
          {/* 하루 공연: 날짜 자동 고정 */}
          {type === "concert_record" && attachedConcert && isSingleDayConcert && (
            <p className="note-form__date-display">
              {attachedConcert.start_date ? formatConcertDate(attachedConcert.start_date) : ""}
            </p>
          )}
          {/* 여러 날 공연: 실제 공연 날짜 목록에서 선택 */}
          {type === "concert_record" && attachedConcert && !isSingleDayConcert && (
            <>
              <p className="note-form__date-hint">관람 날짜를 선택해주세요.</p>
              <ul className="note-form__date-list">
                {concertPerformanceDates.map((date) => (
                  <li key={date}>
                    <button
                      type="button"
                      className={`note-form__date-item${noteDate === date ? " note-form__date-item--active" : ""}`}
                      onClick={() => setNoteDate(date)}
                    >
                      {formatPickerDate(date)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 제목 */}
        <div className="note-form__field">
          <label className="note-form__label">
            제목{(type === "free_writing" || (type === "concert_record" && isPublic)) && <span className="note-form__required"> *</span>}
            {type === "concert_record" && !isPublic && <span className="note-form__optional"> (선택)</span>}
          </label>
          <input
            type="text"
            className="note-form__input"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 공연 검색 — 관람 기록만 */}
        {type === "concert_record" && (
          <>
            <div className="note-form__field">
              <label className="note-form__label">공연</label>
              {attachedConcert ? (
                <div className="note-form__attached-concert">
                  <span className="note-form__attached-title">
                    {attachedConcert.title}
                  </span>
                  <span className="note-form__attached-date">
                    {attachedConcert.start_date ? formatConcertDate(attachedConcert.start_date) : ""}
                  </span>
                  <button
                    className="note-form__remove-btn"
                    onClick={() => setAttachedConcert(null)}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="note-form__search-row">
                  <input
                    type="text"
                    className="note-form__input"
                    placeholder="공연명 검색"
                    value={concertQuery}
                    onChange={(e) => setConcertQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConcertSearch()}
                  />
                  <button
                    className="note-form__search-btn"
                    onClick={handleConcertSearch}
                    disabled={concertSearching}
                  >
                    검색
                  </button>
                </div>
              )}
            </div>

            {concertResults.length > 0 && !attachedConcert && (
              <ul className="note-form__concert-results">
                {concertResults.map((c) => (
                  <li
                    key={c.id}
                    className="note-form__concert-result-item"
                    onClick={() => {
                      setAttachedConcert(c);
                      if (c.start_date) setNoteDate(concertDateToInputDate(c.start_date));
                      setConcertResults([]);
                      setConcertQuery("");
                    }}
                  >
                    <span className="note-form__result-title">{c.title}</span>
                    <span className="note-form__result-date">
                      {c.start_date ? formatConcertDate(c.start_date) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

          </>
        )}

        {/* 내용 (TipTap) */}
        <div className="note-form__field">
          <label className="note-form__label">
            내용{(type === "free_writing" || (type === "concert_record" && isPublic)) && <span className="note-form__required"> *</span>}
            {type === "concert_record" && !isPublic && <span className="note-form__optional"> (선택)</span>}
          </label>
          <div className="note-form__editor-wrap">
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
            <EditorContent editor={editor} className="note-form__editor" />
          </div>
        </div>

        {/* 공개 여부 — 관람 기록만 */}
        {type === "concert_record" && (
          <div className="note-form__field">
            <label className="note-form__label">공개 여부</label>
            <div className="note-form__radio-group">
              <label className="note-form__radio-label">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                />
                비공개
              </label>
              <label className="note-form__radio-label">
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                />
                공개
              </label>
            </div>
            {isPublic ? (
              <p className="note-form__public-notice">
                공개로 설정하면 커뮤니티 게시판에 업로드됩니다.
              </p>
            ) : (
              <p className="note-form__public-notice">
                나의 클래식 노트에서만 공개됩니다.
              </p>
            )}
          </div>
        )}

        {error && <p className="note-form__error">{error}</p>}

        <button
          className="note-form__submit-btn"
          onClick={handleSubmit}
          disabled={submitLoading}
        >
          {submitLoading ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
