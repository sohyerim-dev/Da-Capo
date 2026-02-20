import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import ClassicNoteCalendar from "./ClassicNoteCalendar";
import { toDateStr, concertDateToISO, formatNoteDate, getMonthRange, formatMonthLabel } from "./classicNoteUtils";
import "./ClassicNote.scss";
import "./NotePanel.scss";

interface PublicNote {
  id: number;
  type: "concert_record" | "free_writing";
  title: string | null;
  content: string | null;
  note_date: string;
  concert_id: string | null;
  is_public: boolean | null;
  created_at: string | null;
}

interface BookmarkConcert {
  id: string;
  title: string | null;
  start_date: string | null;
}

interface BookmarkItem {
  id: number;
  concert_id: string;
  scheduled_dates: string[] | null;
  concert: BookmarkConcert;
}

interface ProfileInfo {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  classic_note_public: boolean | null;
}

function formatPanelDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}월 ${d}일의 기록`;
}

export default function ClassicNotePublic() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [concertMap, setConcertMap] = useState<Record<string, string | null>>({});

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, classic_note_public")
        .eq("username", username)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (!profileData.classic_note_public) {
        setLoading(false);
        return;
      }

      const profileId = profileData.id;

      const { data: notesData } = await supabase
        .from("notes")
        .select("id, type, title, content, note_date, concert_id, is_public, created_at")
        .eq("user_id", profileId)
        .in("type", ["concert_record", "free_writing"])
        .order("note_date", { ascending: false });

      setNotes((notesData ?? []) as PublicNote[]);

      const { data: bookmarkData } = await supabase
        .from("bookmarks")
        .select("id, concert_id, scheduled_dates")
        .eq("user_id", profileId);

      if (bookmarkData && bookmarkData.length > 0) {
        const concertIds = bookmarkData.map((b) => b.concert_id as string);
        const { data: concertData } = await supabase
          .from("concerts")
          .select("id, title, start_date")
          .in("id", concertIds);

        if (concertData) {
          const concertById: Record<string, BookmarkConcert> = {};
          concertData.forEach((c) => {
            concertById[c.id] = { id: c.id, title: c.title, start_date: c.start_date };
          });

          const mapped: BookmarkItem[] = bookmarkData
            .filter((b) => concertById[b.concert_id as string])
            .map((b) => ({
              id: b.id,
              concert_id: b.concert_id as string,
              scheduled_dates: (b.scheduled_dates as string[] | null) ?? null,
              concert: concertById[b.concert_id as string],
            }));
          setBookmarks(mapped);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [username]);

  useEffect(() => {
    const ids = notes.filter((n) => n.concert_id).map((n) => n.concert_id as string);
    if (ids.length === 0) {
      setConcertMap({});
      return;
    }
    supabase
      .from("concerts")
      .select("id, title")
      .in("id", ids)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string | null> = {};
          data.forEach((c) => {
            map[c.id] = c.title;
          });
          setConcertMap(map);
        }
      });
  }, [notes]);

  const toggleExpand = (id: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setPanelOpen(true);
  };

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : "";

  const selectedDateNotes = selectedDate
    ? notes.filter((n) => n.note_date === selectedDateStr)
    : [];

  const selectedDateBookmarks = selectedDate
    ? bookmarks.filter((b) => {
        if (b.scheduled_dates && b.scheduled_dates.length > 0) {
          return b.scheduled_dates.includes(selectedDateStr);
        }
        return concertDateToISO(b.concert.start_date) === selectedDateStr;
      })
    : [];

  if (loading) {
    return (
      <div className="classic-note">
        <div className="wrap">
          <div className="classic-note__public-skeleton-header">
            <div className="classic-note__public-skeleton-avatar" />
            <div>
              <div className="classic-note__public-skeleton-name" />
              <div className="classic-note__public-skeleton-sub" />
            </div>
          </div>
          <div className="classic-note__public-skeleton-calendar" />
          <div className="classic-note__public-skeleton-label" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="classic-note__public-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="classic-note">
        <div className="wrap">
          <div style={{ padding: "80px 0", textAlign: "center", color: "#888" }}>
            존재하지 않는 사용자입니다.
          </div>
        </div>
      </div>
    );
  }

  if (!profile.classic_note_public) {
    return (
      <div className="classic-note">
        <div className="wrap">
          <div className="classic-note__public-blocked">
            <div className="classic-note__public-blocked-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="classic-note__public-blocked-title">비공개 클래식 노트입니다.</p>
            <p className="classic-note__public-blocked-desc">
              {profile.nickname}님의 클래식 노트는 현재 비공개 상태입니다.
            </p>
            <button
              className="classic-note__public-blocked-back"
              onClick={() => navigate(-1)}
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc =
    profile.avatar_url ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${profile.id}&backgroundColor=f6f3ec`;

  return (
    <>
      {/* 읽기 전용 날짜 패널 오버레이 */}
      {panelOpen && (
        <div className="note-panel-overlay" onClick={() => setPanelOpen(false)} />
      )}

      {/* 읽기 전용 날짜 패널 */}
      <div className={`note-panel${panelOpen ? " note-panel--open" : ""}`}>
        <div className="note-panel__header">
          <span className="note-panel__header-title">
            {selectedDate ? formatPanelDate(selectedDate) : ""}
          </span>
          <button
            className="note-panel__close"
            onClick={() => setPanelOpen(false)}
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

        <div className="note-panel__body">
          {selectedDateNotes.length === 0 && selectedDateBookmarks.length === 0 ? (
            <p className="note-panel__empty">이 날의 기록이 없습니다.</p>
          ) : (
            <ul className="note-panel__note-list">
              {selectedDateBookmarks.map((b) => (
                <li
                  key={`bm-${b.id}`}
                  className="note-panel__note-card note-panel__note-card--bookmark"
                  onClick={() => navigate(`/concert-info/${b.concert_id}`)}
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
                  <p className="note-panel__note-title">{b.concert.title}</p>
                </li>
              ))}

              {selectedDateNotes.map((note) => (
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
                          <span className="classic-note__list-badge-text">관람 기록</span>
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
                          <span className="classic-note__list-badge-text">자유 기록</span>
                        </>
                      )}
                    </span>
                  </div>

                  {note.title && (
                    <>
                      <p className="note-panel__note-title">{note.title}</p>
                      <hr className="note-panel__note-hr" />
                    </>
                  )}
                  {note.concert_id && concertMap[note.concert_id] !== undefined && (
                    <div
                      className="note-panel__concert-info note-panel__concert-info--link"
                      onClick={() => navigate(`/concert-info/${note.concert_id}`)}
                    >
                      <span className="note-panel__concert-title">
                        공연명 : {concertMap[note.concert_id]}
                      </span>
                    </div>
                  )}
                  {note.content && (
                    <>
                      <div
                        className={`note-panel__note-content tiptap-content${
                          expandedNotes.has(note.id)
                            ? " note-panel__note-content--expanded"
                            : ""
                        }`}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="classic-note">
        <div className="wrap">
          {/* 프로필 헤더 */}
          <div className="classic-note__public-header">
            <img
              src={avatarSrc}
              alt={profile.nickname ?? ""}
              className="classic-note__public-avatar"
            />
            <div className="classic-note__public-user">
              <h1 className="classic-note__public-name">{profile.nickname}</h1>
              <p className="classic-note__public-sub">의 클래식 노트</p>
            </div>
          </div>

          {/* 캘린더 */}
          <ClassicNoteCalendar
            selectedDate={selectedDate}
            notes={notes}
            bookmarks={bookmarks}
            onDayClick={handleDayClick}
            onMonthChange={(date) => setCurrentMonth(date)}
          />

          {/* 해당 월 기록 목록 */}
          {(() => {
            const { start: monthStart, end: monthEnd } = getMonthRange(currentMonth);
            const monthNotesList = notes.filter(
              (n) => n.note_date >= monthStart && n.note_date <= monthEnd
            );
            const monthBookmarks = bookmarks.filter((b) => {
              if (b.scheduled_dates && b.scheduled_dates.length > 0) {
                return b.scheduled_dates.some((d) => d >= monthStart && d <= monthEnd);
              }
              const iso = concertDateToISO(b.concert.start_date);
              return iso >= monthStart && iso <= monthEnd;
            });
            const monthLabel = formatMonthLabel(currentMonth);

            return (
              <div className="classic-note__month-list">
                <h2 className="classic-note__month-label">{monthLabel}의 기록</h2>
                {monthBookmarks.length === 0 && monthNotesList.length === 0 ? (
                  <p className="classic-note__empty">이 달의 기록이 없습니다.</p>
                ) : (
                  <>
                    {/* 관심 공연 */}
                    {monthBookmarks.length > 0 && (
                      <div className="classic-note__group">
                        <h3 className="classic-note__group-label">관심 공연</h3>
                        <ul className="classic-note__list">
                          {monthBookmarks
                            .flatMap((bm) => {
                              const datesInMonth =
                                bm.scheduled_dates && bm.scheduled_dates.length > 0
                                  ? bm.scheduled_dates.filter((d) => d >= monthStart && d <= monthEnd)
                                  : [concertDateToISO(bm.concert.start_date)].filter(Boolean);
                              return datesInMonth.map((date) => ({ bm, date }));
                            })
                            .map(({ bm, date }) => (
                              <li
                                key={`bookmark-${bm.id}-${date}`}
                                className="classic-note__list-item"
                                onClick={() => navigate(`/concert-info/${bm.concert_id}`)}
                              >
                                <span className="classic-note__list-date">
                                  {date ? formatNoteDate(date) : ""}
                                </span>
                                <span className="classic-note__list-badge classic-note__list-badge--bookmark">
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
                                <span className="classic-note__list-title">{bm.concert.title}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* 관람 기록 */}
                    {monthNotesList.filter((n) => n.type === "concert_record").length > 0 && (
                      <div className="classic-note__group">
                        <h3 className="classic-note__group-label">관람 기록</h3>
                        <ul className="classic-note__list">
                          {monthNotesList
                            .filter((n) => n.type === "concert_record")
                            .map((note) => (
                              <li
                                key={`note-${note.id}`}
                                className="classic-note__list-item"
                                onClick={() => {
                                  setSelectedDate(new Date(note.note_date + "T00:00:00"));
                                  setPanelOpen(true);
                                }}
                              >
                                <span className="classic-note__list-date">
                                  {formatNoteDate(note.note_date)}
                                </span>
                                <span className="classic-note__list-badge classic-note__list-badge--concert_record">
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
                                  <span className="classic-note__list-badge-text">관람 기록</span>
                                </span>
                                <span className="classic-note__list-title">
                                  {note.title ??
                                    (note.concert_id
                                      ? (concertMap[note.concert_id] ?? "(제목 없음)")
                                      : "(제목 없음)")}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* 자유 기록 */}
                    {monthNotesList.filter((n) => n.type === "free_writing").length > 0 && (
                      <div className="classic-note__group">
                        <h3 className="classic-note__group-label">자유 기록</h3>
                        <ul className="classic-note__list">
                          {monthNotesList
                            .filter((n) => n.type === "free_writing")
                            .map((note) => (
                              <li
                                key={`note-${note.id}`}
                                className="classic-note__list-item"
                                onClick={() => {
                                  setSelectedDate(new Date(note.note_date + "T00:00:00"));
                                  setPanelOpen(true);
                                }}
                              >
                                <span className="classic-note__list-date">
                                  {formatNoteDate(note.note_date)}
                                </span>
                                <span className="classic-note__list-badge classic-note__list-badge--free_writing">
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
                                  <span className="classic-note__list-badge-text">자유 기록</span>
                                </span>
                                <span className="classic-note__list-title">
                                  {note.title ?? "(제목 없음)"}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
