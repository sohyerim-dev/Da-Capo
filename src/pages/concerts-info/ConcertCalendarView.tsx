import { useState, useEffect } from "react";
import { useNavigate, useLocation, useNavigationType } from "react-router";
import Calendar from "react-calendar";
import { supabase } from "@/lib/supabase";
import {
  toDateStr,
  concertDateToISO,
  getMonthRange,
} from "@/pages/classic-note/classicNoteUtils";
import "./ConcertCalendarView.scss";

interface CalendarConcert {
  id: string;
  title: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
  area: string | null;
  schedule: string | null;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function isExtractedSchedule(schedule: string): boolean {
  return /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(schedule);
}

function getExtractedIsoDates(schedule: string): Set<string> {
  const dates = new Set<string>();
  schedule.split("\n").filter(Boolean).forEach((line) => {
    const match = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return;
    const iso = `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
    dates.add(iso);
  });
  return dates;
}

function parseScheduleWeekdays(schedule: string | null): Set<number> | null {
  if (!schedule) return null;
  if (schedule.includes("매일")) return null;
  const days = new Set<number>();
  WEEKDAY_LABELS.forEach((label, i) => {
    if (schedule.includes(label)) days.add(i);
  });
  return days.size > 0 ? days : null;
}

function isPerformingOnDate(
  c: CalendarConcert,
  dateStr: string,
  date: Date
): boolean {
  const isoStart = concertDateToISO(c.start_date);
  const isoEnd = concertDateToISO(c.end_date);
  if (!(isoStart <= dateStr && isoEnd >= dateStr)) return false;

  // 추출된 구체적 날짜가 있으면 해당 날짜만 확인
  if (c.schedule && isExtractedSchedule(c.schedule)) {
    return getExtractedIsoDates(c.schedule).has(dateStr);
  }

  // KOPIS 요일 패턴
  const scheduledDays = parseScheduleWeekdays(c.schedule);
  if (!scheduledDays) return true;
  return scheduledDays.has(date.getDay());
}

const SESSION_KEY = "concertCalendar";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ConcertCalendarView() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const shouldRestore = navType === "POP" || location.state?.fromDetail === true;
  const saved = shouldRestore ? loadSession() : null;

  const today = new Date();
  const [activeMonth, setActiveMonth] = useState<Date>(() => {
    if (saved?.activeMonth) return new Date(saved.activeMonth);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (saved?.selectedDate) return new Date(saved.selectedDate);
    return null;
  });
  const [concerts, setConcerts] = useState<CalendarConcert[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        activeMonth: activeMonth.toISOString(),
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
      })
    );
  }, [activeMonth, selectedDate]);

  useEffect(() => {
    const fetchConcerts = async () => {
      setLoading(true);
      const { start, end } = getMonthRange(activeMonth);
      const dotStart = start.replace(/-/g, ".");
      const dotEnd = end.replace(/-/g, ".");
      const oneYearAgo = new Date(
        activeMonth.getFullYear() - 1,
        activeMonth.getMonth(),
        1
      );
      const dotOneYearAgo = toDateStr(oneYearAgo).replace(/-/g, ".");
      const { data } = await supabase
        .from("concerts")
        .select("id, title, poster, start_date, end_date, area, schedule")
        .gte("start_date", dotOneYearAgo)
        .lte("start_date", dotEnd)
        .gte("end_date", dotStart)
        .order("start_date", { ascending: true })
        .limit(500);
      setConcerts(data ?? []);
      setLoading(false);
    };
    fetchConcerts();
  }, [activeMonth]);

  const hasConcertOnDate = (dateStr: string): boolean => {
    const date = new Date(dateStr + "T00:00:00");
    return concerts.some((c) => isPerformingOnDate(c, dateStr, date));
  };

  const concertsOnDate = (date: Date): CalendarConcert[] => {
    const dateStr = toDateStr(date);
    return concerts.filter((c) => isPerformingOnDate(c, dateStr, date));
  };

  const selectedConcerts = selectedDate ? concertsOnDate(selectedDate) : [];
  const visibleConcerts = selectedConcerts.slice(0, visibleCount);

  return (
    <div className="concert-cal">
      <div className="concert-cal__calendar-wrap">
        <Calendar
          locale="ko-KR"
          onClickDay={(date) => {
            setSelectedDate(date);
            setVisibleCount(8);
          }}
          onActiveStartDateChange={({ activeStartDate }) => {
            if (!activeStartDate) return;
            const newY = activeStartDate.getFullYear();
            const newM = activeStartDate.getMonth();
            if (
              newY !== activeMonth.getFullYear() ||
              newM !== activeMonth.getMonth()
            ) {
              setActiveMonth(new Date(newY, newM, 1));
              setSelectedDate(null);
            }
          }}
          formatDay={(_locale, date) => String(date.getDate())}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const dateStr = toDateStr(date);
            if (!hasConcertOnDate(dateStr)) return null;
            return <span className="concert-cal__dot" />;
          }}
          tileClassName={({ date, view }) => {
            if (view !== "month") return null;
            if (selectedDate && toDateStr(date) === toDateStr(selectedDate)) {
              return "concert-cal__tile--selected";
            }
            return null;
          }}
        />
        {loading && <div className="concert-cal__loading-overlay" />}
      </div>

      {selectedDate && (
        <div className="concert-cal__results">
          <h3 className="concert-cal__results-title">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 공연
            <span className="concert-cal__results-count"> ({selectedConcerts.length}건)</span>
          </h3>
          {selectedConcerts.length === 0 ? (
            <p className="concert-cal__empty">이 날은 공연이 없습니다.</p>
          ) : (
            <>
              <div className="concert-cal__cards">
                {visibleConcerts.map((concert) => (
                  <div
                    key={concert.id}
                    className="concert-cal__card"
                    onClick={() =>
                      navigate(`/concert-info/${concert.id}`, {
                        state: { fromDetail: true },
                      })
                    }
                  >
                    <div className="concert-cal__card-img">
                      {concert.poster && (
                        <img src={concert.poster} alt={concert.title ?? ""} />
                      )}
                    </div>
                    <p className="concert-cal__card-title">{concert.title}</p>
                    {concert.area && (
                      <p className="concert-cal__card-area">{concert.area}</p>
                    )}
                  </div>
                ))}
              </div>
              {visibleCount < selectedConcerts.length && (
                <div className="concert-cal__more-wrap">
                  <button
                    className="concert-cal__more-btn"
                    onClick={() => setVisibleCount((v) => v + 8)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    더보기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
