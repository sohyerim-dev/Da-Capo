import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import type { Note, BookmarkItem } from "./ClassicNote";
import ImageLightbox from "@/components/ui/ImageLightbox";
import "./NotePanel.scss";

interface Props {
  open: boolean;
  date: Date | null;
  notes: Note[];
  bookmarks: BookmarkItem[];
  onClose: () => void;
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onNoteDeleted: () => void;
}

interface ConcertInfo {
  title: string | null;
  start_date: string | null;
}

function formatPanelDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}월 ${d}일의 기록`;
}

function formatConcertDate(dateStr: string): string {
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

export default function NoteDatePanel({
  open,
  date,
  notes,
  bookmarks,
  onClose,
  onAddNote,
  onEditNote,
  onNoteDeleted,
}: Props) {
  const navigate = useNavigate();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [concertMap, setConcertMap] = useState<Record<string, ConcertInfo>>({});
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && !target.closest("a")) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc((target as HTMLImageElement).src);
      }
    };
    body.addEventListener("click", handleClick);
    return () => body.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const concertIds = notes
      .filter((n) => n.concert_id)
      .map((n) => n.concert_id as string);

    if (concertIds.length === 0) {
      setConcertMap({});
      return;
    }

    supabase
      .from("concerts")
      .select("id, title, start_date")
      .in("id", concertIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, ConcertInfo> = {};
          data.forEach((c) => {
            map[c.id] = { title: c.title, start_date: c.start_date };
          });
          setConcertMap(map);
        }
      });
  }, [notes]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    // 연동된 커뮤니티 후기 먼저 삭제 (FK 제약 고려)
    await supabase.from("community_posts").delete().eq("source_note_id", id);
    await supabase.from("notes").delete().eq("id", id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    onNoteDeleted();
  };

  return (
    <>
    <div className={`note-panel${open ? " note-panel--open" : ""}`}>
      <div className="note-panel__header">
        <span className="note-panel__header-title">
          {date ? formatPanelDate(date) : ""}
        </span>
        <button
          className="note-panel__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="note-panel__body" ref={bodyRef}>
        {notes.length === 0 && bookmarks.length === 0 ? (
          <p className="note-panel__empty">이 날의 기록이 없습니다.</p>
        ) : (
          <ul className="note-panel__note-list">
            {bookmarks.map((w) => (
              <li
                key={`bookmark-${w.id}`}
                className="note-panel__note-card note-panel__note-card--bookmark"
                onClick={() => navigate(`/concert-info/${w.concert_id}`)}
              >
                <div className="note-panel__note-card-top">
                  <span className="note-panel__note-badge note-panel__note-badge--bookmark">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" />
                    </svg>
                    <span className="classic-note__list-badge-text">관심 공연</span>
                  </span>
                </div>
                <p className="note-panel__note-title">{w.concert.title}</p>
              </li>
            ))}
            {notes.map((note) => (
              <li key={note.id} className="note-panel__note-card">
                <div className="note-panel__note-card-top">
                  <span
                    className={`note-panel__note-badge note-panel__note-badge--${note.type}`}
                  >
                    {note.type === "concert_record" ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span className="classic-note__list-badge-text">
                          관람 기록
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18V5l12-2v13" />
                          <path d="m9 9 12-2" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                        <span className="classic-note__list-badge-text">
                          자유 기록
                        </span>
                      </>
                    )}
                  </span>
                  {note.type === "concert_record" && note.is_public && (
                    <span className="note-panel__note-public">공개</span>
                  )}

                  <div className="note-panel__note-actions">
                    <button
                      className="note-panel__action-btn"
                      onClick={() => onEditNote(note)}
                    >
                      수정
                    </button>
                    <button
                      className="note-panel__action-btn note-panel__action-btn--delete"
                      onClick={() => setConfirmDeleteId(note.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {note.title && (
                  <>
                    <p className="note-panel__note-title">{note.title}</p>
                    <hr className="note-panel__note-hr" />
                  </>
                )}
                {note.concert_id && concertMap[note.concert_id] && (
                  <div
                    className="note-panel__concert-info note-panel__concert-info--link"
                    onClick={() => navigate(`/concert-info/${note.concert_id}`)}
                  >
                    <span className="note-panel__concert-title">
                      공연명 : {concertMap[note.concert_id].title}
                    </span>
                    {concertMap[note.concert_id].start_date && (
                      <span className="note-panel__concert-date">
                        {formatConcertDate(concertMap[note.concert_id].start_date!)}
                      </span>
                    )}
                  </div>
                )}
                {note.created_at && (
                  <span className="note-panel__note-created">
                    작성일 {note.created_at.slice(0, 10).replace(/-/g, ".")}
                  </span>
                )}
                {note.content && (
                  <>
                    <div
                      className={`note-panel__note-content tiptap-content${expandedNotes.has(note.id) ? " note-panel__note-content--expanded" : ""}`}
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <button
                      className="note-panel__expand-btn"
                      onClick={() => toggleExpand(note.id)}
                      aria-label={expandedNotes.has(note.id) ? "접기" : "더보기"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedNotes.has(note.id) ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </>
                )}

                {confirmDeleteId === note.id && (
                  <div className="note-panel__delete-confirm">
                    <p>정말 삭제하시겠습니까?</p>
                    <div className="note-panel__delete-actions">
                      <button onClick={() => setConfirmDeleteId(null)}>
                        취소
                      </button>
                      <button
                        className="note-panel__delete-btn"
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                      >
                        {deletingId === note.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <button className="note-panel__add-btn" onClick={onAddNote}>
          + 이 날 기록 추가
        </button>
      </div>
    </div>

    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}
    </>
  );
}
