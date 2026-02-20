import Calendar from "react-calendar";
import { toDateStr, concertDateToISO } from "./classicNoteUtils";

interface CalendarNote {
  note_date: string;
  type: "concert_record" | "free_writing";
}

interface CalendarBookmark {
  scheduled_dates: string[] | null;
  concert: { start_date: string | null };
}

interface Props {
  selectedDate: Date | null;
  notes: CalendarNote[];
  bookmarks: CalendarBookmark[];
  onDayClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  minDate?: Date;
}

export default function ClassicNoteCalendar({
  selectedDate,
  notes,
  bookmarks,
  onDayClick,
  onMonthChange,
  minDate,
}: Props) {
  return (
    <div className="classic-note__calendar-wrap">
      <Calendar
        locale="ko-KR"
        value={selectedDate}
        minDate={minDate}
        onClickDay={onDayClick}
        onActiveStartDateChange={({ activeStartDate }) => {
          if (activeStartDate) onMonthChange(activeStartDate);
        }}
        formatDay={(_locale, date) => String(date.getDate())}
        tileContent={({ date, view }) => {
          if (view !== "month") return null;
          const dateStr = toDateStr(date);
          const hasConcertRecord = notes.some(
            (n) => n.type === "concert_record" && n.note_date === dateStr
          );
          const hasFreeWriting = notes.some(
            (n) => n.type === "free_writing" && n.note_date === dateStr
          );
          const hasBookmark = bookmarks.some((b) => {
            if (b.scheduled_dates && b.scheduled_dates.length > 0) {
              return b.scheduled_dates.includes(dateStr);
            }
            return concertDateToISO(b.concert.start_date) === dateStr;
          });

          if (!hasConcertRecord && !hasFreeWriting && !hasBookmark) return null;

          return (
            <span className="classic-note__tile-icons">
              {hasConcertRecord && (
                <span className="classic-note__tile-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
                </span>
              )}
              {hasFreeWriting && (
                <span className="classic-note__tile-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
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
                </span>
              )}
              {hasBookmark && (
                <span className="classic-note__tile-icon classic-note__tile-icon--bookmark">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                  </svg>
                </span>
              )}
            </span>
          );
        }}
        tileClassName={({ date, view }) => {
          if (view !== "month") return null;
          if (selectedDate && toDateStr(date) === toDateStr(selectedDate)) {
            return "classic-note__tile--selected";
          }
          return null;
        }}
      />
    </div>
  );
}
