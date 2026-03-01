import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import NoteDatePanel from "./NoteDatePanel";
import NoteFormPanel from "./NoteFormPanel";
import ClassicNoteCalendar from "./ClassicNoteCalendar";
import { toDateStr, concertDateToISO, formatNoteDate, getMonthRange, formatMonthLabel } from "./classicNoteUtils";
import "./ClassicNote.scss";

export interface Note {
  id: number;
  user_id: string;
  type: "concert_record" | "free_writing";
  title: string | null;
  content: string | null;
  note_date: string;
  concert_id: string | null;
  concert: { id: string; title: string | null } | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SubscribedUser {
  id: string;
  nickname: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface BookmarkItem {
  id: number;
  concert_id: string;
  scheduled_dates: string[] | null;
  concert: {
    id: string;
    title: string | null;
    start_date: string | null;
  };
}

export default function ClassicNote() {
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthNotes, setMonthNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkItem[]>([]);
  const [notePublic, setNotePublic] = useState<boolean | null>(null);

  const [subscribedUsers, setSubscribedUsers] = useState<SubscribedUser[]>([]);
  const [subscribers, setSubscribers] = useState<SubscribedUser[]>([]);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<string>("");

  const PAGE_SIZE = 5;
  const [bookmarkLimit, setBookmarkLimit] = useState(PAGE_SIZE);
  const [concertRecordLimit, setConcertRecordLimit] = useState(PAGE_SIZE);
  const [freeWritingLimit, setFreeWritingLimit] = useState(PAGE_SIZE);

  const fetchMonthNotes = useCallback(
    async (month: Date) => {
      if (!user) return;
      setLoading(true);
      const { start, end } = getMonthRange(month);
      const { data } = await supabase
        .from("notes")
        .select("*, concert:concerts(id, title)")
        .eq("user_id", user.id)
        .gte("note_date", start)
        .lte("note_date", end)
        .order("note_date", { ascending: false });
      setMonthNotes((data ?? []) as Note[]);
      setLoading(false);
    },
    [user]
  );

  const fetchMonthBookmarks = useCallback(
    async () => {
      if (!user) return;

      const { data: wlData } = await supabase
        .from("bookmarks")
        .select("id, concert_id, scheduled_dates, concert:concerts(id, title, start_date)")
        .eq("user_id", user.id);

      if (!wlData || wlData.length === 0) {
        setBookmarkItems([]);
        return;
      }

      const items: BookmarkItem[] = [];
      for (const wl of wlData) {
        const concert = wl.concert as BookmarkItem["concert"] | null;
        if (!concert) continue;
        const scheduledDates = wl.scheduled_dates ?? null;
        items.push({ id: wl.id, concert_id: wl.concert_id, scheduled_dates: scheduledDates, concert });
      }

      setBookmarkItems(items);
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("classic_note_public")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setNotePublic(data.classic_note_public ?? false);
      });

    supabase
      .from("classic_note_subscriptions")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(async ({ data: subData }) => {
        if (!subData || subData.length === 0) return;
        const ids = subData.map((s) => s.following_id as string);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, nickname, username, avatar_url")
          .in("id", ids);
        setSubscribedUsers((profileData ?? []) as SubscribedUser[]);
      });

    supabase
      .from("classic_note_subscriptions")
      .select("follower_id")
      .eq("following_id", user.id)
      .then(async ({ data: subData }) => {
        if (!subData || subData.length === 0) return;
        const ids = subData.map((s) => s.follower_id as string);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, nickname, username, avatar_url")
          .in("id", ids);
        setSubscribers((profileData ?? []) as SubscribedUser[]);
      });
  }, [user]);

  useEffect(() => {
    fetchMonthBookmarks();
  }, [fetchMonthBookmarks]);

  useEffect(() => {
    fetchMonthNotes(currentMonth);
    setBookmarkLimit(PAGE_SIZE);
    setConcertRecordLimit(PAGE_SIZE);
    setFreeWritingLimit(PAGE_SIZE);
  }, [currentMonth, fetchMonthNotes]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setPanelOpen(true);
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
    setSelectedDate(null);
  };

  const handleAddNote = (date?: Date) => {
    setEditingNote(null);
    setFormDefaultDate(toDateStr(date ?? new Date()));
    setFormOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setFormDefaultDate(note.note_date);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingNote(null);
  };

  const handleFormSaved = () => {
    setFormOpen(false);
    setEditingNote(null);
    fetchMonthNotes(currentMonth);
  };

  const handleNoteDeleted = () => {
    fetchMonthNotes(currentMonth);
  };

  const selectedDateNotes = selectedDate
    ? monthNotes.filter((n) => n.note_date === toDateStr(selectedDate))
    : [];

  const selectedDateBookmarks = selectedDate
    ? (() => {
        const dateStr = toDateStr(selectedDate);
        return bookmarkItems.filter((w) => {
          if (w.scheduled_dates && w.scheduled_dates.length > 0) {
            return w.scheduled_dates.includes(dateStr);
          }
          return concertDateToISO(w.concert.start_date) === dateStr;
        });
      })()
    : [];

  return (
    <div className="classic-note">
      <div className="wrap">
        <div className="classic-note__header">
          <div className="classic-note__title-row">
            <h1 className="classic-note__title">나의 클래식 노트</h1>
            {notePublic !== null && (
              <Link
                to="/mypage#classic-note"
                className={`classic-note__public-badge${notePublic ? " classic-note__public-badge--on" : ""}`}
              >
                {notePublic ? "공개" : "비공개"}
              </Link>
            )}
            {subscribers.length > 0 && (
              <button
                className="classic-note__subscriber-count"
                onClick={() => setShowSubscribersModal(true)}
              >
                구독자 {subscribers.length}명
              </button>
            )}
          </div>
          <button
            className="classic-note__add-btn"
            onClick={() => handleAddNote()}
            aria-label="기록 추가"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 21h8" />
              <path d="m15 5 4 4" />
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            </svg>
          </button>
        </div>

        <ClassicNoteCalendar
          selectedDate={selectedDate}
          notes={monthNotes}
          bookmarks={bookmarkItems}
          onDayClick={handleDayClick}
          onMonthChange={(date) => setCurrentMonth(date)}
          minDate={new Date(2026, 0, 1)}
        />

        {/* 해당 월 기록 목록 */}
        <div className="classic-note__month-list">
          <h2 className="classic-note__month-label">
            {formatMonthLabel(currentMonth)}의 기록
          </h2>
          {loading ? (
            <div className="classic-note__list-skeleton">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="classic-note__skeleton-row" />
              ))}
            </div>
          ) : bookmarkItems.length === 0 && monthNotes.length === 0 ? (
            <p className="classic-note__empty">이 달의 기록이 없습니다.</p>
          ) : (
            <>
              {/* 관심 공연 */}
              {(() => {
                const { start: monthStart, end: monthEnd } = getMonthRange(currentMonth);
                const allBookmarkRows = bookmarkItems.flatMap((w) => {
                  const datesInMonth =
                    w.scheduled_dates && w.scheduled_dates.length > 0
                      ? w.scheduled_dates.filter((d) => d >= monthStart && d <= monthEnd)
                      : (() => {
                          const s = concertDateToISO(w.concert.start_date);
                          return s >= monthStart && s <= monthEnd ? [s] : [];
                        })();
                  return datesInMonth.map((date) => ({ w, date }));
                });
                if (allBookmarkRows.length === 0) return null;
                return (
                  <div className="classic-note__group">
                    <h3 className="classic-note__group-label">관심 공연</h3>
                    <ul className="classic-note__list">
                      {allBookmarkRows.slice(0, bookmarkLimit).map(({ w, date }) => (
                        <li
                          key={`bookmark-${w.id}-${date}`}
                          className="classic-note__list-item"
                          onClick={() => navigate(`/concert-info/${w.concert_id}`)}
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
                          <span className="classic-note__list-title">{w.concert.title}</span>
                        </li>
                      ))}
                    </ul>
                    {allBookmarkRows.length > bookmarkLimit && (
                      <button
                        className="classic-note__more-btn"
                        onClick={() => setBookmarkLimit((prev) => prev + PAGE_SIZE)}
                      >
                        더보기 ({allBookmarkRows.length - bookmarkLimit}개 남음)
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* 관람 기록 */}
              {(() => {
                const concertRecords = monthNotes.filter((n) => n.type === "concert_record");
                if (concertRecords.length === 0) return null;
                return (
                  <div className="classic-note__group">
                    <h3 className="classic-note__group-label">관람 기록</h3>
                    <ul className="classic-note__list">
                      {concertRecords.slice(0, concertRecordLimit).map((note) => (
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
                            {note.title ?? note.concert?.title ?? "(제목 없음)"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {concertRecords.length > concertRecordLimit && (
                      <button
                        className="classic-note__more-btn"
                        onClick={() => setConcertRecordLimit((prev) => prev + PAGE_SIZE)}
                      >
                        더보기 ({concertRecords.length - concertRecordLimit}개 남음)
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* 자유 기록 */}
              {(() => {
                const freeWritings = monthNotes.filter((n) => n.type === "free_writing");
                if (freeWritings.length === 0) return null;
                return (
                  <div className="classic-note__group">
                    <h3 className="classic-note__group-label">자유 기록</h3>
                    <ul className="classic-note__list">
                      {freeWritings.slice(0, freeWritingLimit).map((note) => (
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
                    {freeWritings.length > freeWritingLimit && (
                      <button
                        className="classic-note__more-btn"
                        onClick={() => setFreeWritingLimit((prev) => prev + PAGE_SIZE)}
                      >
                        더보기 ({freeWritings.length - freeWritingLimit}개 남음)
                      </button>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {subscribedUsers.length > 0 && (
          <div className="classic-note__subscriptions">
            <h3 className="classic-note__subscriptions-label">구독 중인 노트</h3>
            <div className="classic-note__subscriptions-list">
              {subscribedUsers.map((u) => (
                <div key={u.id} className="classic-note__subscription-chip">
                  <Link
                    to={`/classic-note/${u.username}`}
                    className="classic-note__subscription-chip-link"
                  >
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}&backgroundColor=f6f3ec`}
                      alt={u.nickname ?? ""}
                    />
                    <span>{u.nickname}</span>
                  </Link>
                  <button
                    className="classic-note__subscription-chip-remove"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("classic_note_subscriptions")
                        .delete()
                        .eq("follower_id", user!.id)
                        .eq("following_id", u.id);
                      if (!error) {
                        setSubscribedUsers((prev) => prev.filter((s) => s.id !== u.id));
                      }
                    }}
                    aria-label={`${u.nickname} 구독 취소`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <NoteDatePanel
        open={panelOpen}
        date={selectedDate}
        notes={selectedDateNotes}
        bookmarks={selectedDateBookmarks}
        onClose={handlePanelClose}
        onAddNote={() => selectedDate && handleAddNote(selectedDate)}
        onEditNote={handleEditNote}
        onNoteDeleted={handleNoteDeleted}
      />

      <NoteFormPanel
        open={formOpen}
        defaultDate={formDefaultDate}
        editingNote={editingNote}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
      />

      {/* 구독자 모달 */}
      {showSubscribersModal && (
        <>
          <div
            className="classic-note__subscribers-overlay"
            onClick={() => setShowSubscribersModal(false)}
            aria-hidden="true"
          />
          <div
            className="classic-note__subscribers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscribers-modal-title"
          >
            <div className="classic-note__subscribers-modal-header">
              <span id="subscribers-modal-title" className="classic-note__subscribers-modal-title">
                구독자 {subscribers.length}명
              </span>
              <button
                className="classic-note__subscribers-modal-close"
                onClick={() => setShowSubscribersModal(false)}
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <ul className="classic-note__subscribers-list">
              {subscribers.map((u) => (
                <li key={u.id}>
                  <Link
                    to={`/classic-note/${u.username}`}
                    className="classic-note__subscriber-item"
                    onClick={() => setShowSubscribersModal(false)}
                  >
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}&backgroundColor=f6f3ec`}
                      alt={u.nickname ?? ""}
                    />
                    <span>{u.nickname}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
