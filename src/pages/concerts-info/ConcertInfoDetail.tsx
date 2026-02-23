import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { supabase } from "../../lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./ConcertInfoDetail.scss";

interface TicketSite {
  name: string;
  url: string;
}

const TICKET_SITE_NAMES: Record<string, string> = {
  놀유니버스: "NOL티켓",
};

interface Concert {
  id: string;
  title: string | null;
  status: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  area: string | null;
  open_run: string | null;
  schedule: string | null;
  age_limit: string | null;
  ticket_price: string | null;
  producer: string | null;
  performers: string | null;
  crew: string | null;
  synopsis: string | null;
  intro_images: string[] | null;
  ticket_sites: TicketSite[] | null;
  rank: number | null;
}

function formatDate(date: string): string {
  if (!date) return date;
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date.slice(0, 4)}.${date.slice(5, 7)}.${date.slice(8, 10)}`;
  }
  return date;
}

function concertDateToISO(dateStr: string | null): string {
  if (!dateStr) return "";
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\./g, "-");
  }
  return dateStr.split("T")[0] ?? "";
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

function getPerformanceDates(concert: Concert): string[] {
  const startISO = concertDateToISO(concert.start_date);
  const endISO = concertDateToISO(concert.end_date ?? concert.start_date);
  if (!startISO) return [];

  const scheduledDays = parseScheduleWeekdays(concert.schedule);
  const endDate = new Date((endISO || startISO) + "T00:00:00");

  // 먼저 전체 공연 날짜 수집 (최대 200개)
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

  if (allDates.length === 0) return [];

  // 오늘 이후 날짜가 있으면 오늘부터, 없으면 마지막 90개 (이미 종료된 공연)
  const todayStr = new Date().toISOString().split("T")[0]!;
  const futureIdx = allDates.findIndex((d) => d >= todayStr);
  if (futureIdx !== -1) {
    return allDates.slice(futureIdx, futureIdx + 90);
  }
  return allDates.slice(-90);
}

function formatPickerDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayLabel = WEEKDAY_LABELS[d.getDay()];
  return `${formatDate(dateStr)} (${dayLabel})`;
}

export default function ConcertInfoDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsWatchlisted] = useState(false);
  const [bookmarkLoading, setWatchlistLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDates, setPickerDates] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const fetchConcert = async () => {
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .eq("id", id!)
        .single();

      if (!error && data) setConcert(data as Concert);
      setLoading(false);
    };

    if (id) fetchConcert();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("concert_id", id)
      .maybeSingle()
      .then(({ data }) => setIsWatchlisted(!!data));
  }, [user, id]);

  const handleToggleBookmark = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!id || !concert) return;
    setWatchlistLoading(true);
    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("concert_id", id);
      setIsWatchlisted(false);
      setWatchlistLoading(false);
    } else {
      const isMultiDay =
        concert.end_date && concert.end_date !== concert.start_date;
      if (isMultiDay) {
        const dates = getPerformanceDates(concert);
        if (dates.length > 0) {
          setPickerDates(dates);
          setSelectedDates(new Set());
          setShowDatePicker(true);
          setWatchlistLoading(false);
          return;
        }
      }
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, concert_id: id });
      setIsWatchlisted(true);
      setWatchlistLoading(false);
    }
  };

  const handleBookmarkWithDates = async (dates: string[]) => {
    if (!user || !id) return;
    setWatchlistLoading(true);
    await supabase.from("bookmarks").insert({
      user_id: user.id,
      concert_id: id,
      scheduled_dates: dates.length > 0 ? dates : null,
    });
    setIsWatchlisted(true);
    setShowDatePicker(false);
    setWatchlistLoading(false);
  };

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="concert-detail">
        <div className="wrap">
          <div className="concert-detail__skeleton">
            <div className="concert-detail__skeleton-poster" />
            <div className="concert-detail__skeleton-info">
              <div className="concert-detail__skeleton-badge" />
              <div className="concert-detail__skeleton-title" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="concert-detail__skeleton-row">
                  <div className="concert-detail__skeleton-row-label" />
                  <div className="concert-detail__skeleton-row-value concert-detail__skeleton-row-value--lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!concert) {
    return (
      <div className="concert-detail">
        <div className="wrap">
          <p className="concert-detail__empty">공연 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const dateRange =
    concert.open_run === "Y"
      ? `${concert.start_date ? formatDate(concert.start_date) : ""} ~ 오픈런`
      : `${concert.start_date ? formatDate(concert.start_date) : ""} ~ ${concert.end_date ? formatDate(concert.end_date) : ""}`;

  return (
    <div className="concert-detail">
      <div className="wrap">
        <Link
          to="/concert-info"
          state={{ fromDetail: true }}
          className="concert-detail__back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          공연 목록
        </Link>

        <div className="concert-detail__top">
          {/* 포스터 */}
          <div className="concert-detail__poster">
            <img src={concert.poster ?? ""} alt={concert.title ?? ""} />
          </div>

          {/* 기본 정보 */}
          <div className="concert-detail__info">
            <div className="concert-detail__badges">
              <span
                className={`concert-detail__status concert-detail__status--${
                  concert.status === "공연중" ? "ongoing" : "upcoming"
                }`}
              >
                {concert.status}
              </span>
              {concert.rank && (
                <span className="concert-detail__rank">
                  박스오피스 {concert.rank}위
                </span>
              )}
            </div>
            <div className="concert-detail__title-row">
              <h1 className="concert-detail__title">{concert.title}</h1>
              <button
                className={`concert-detail__save-btn${isBookmarked ? " concert-detail__save-btn--saved" : ""}`}
                onClick={handleToggleBookmark}
                disabled={bookmarkLoading}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isBookmarked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" />
                </svg>
                {isBookmarked ? "관심 취소" : "관심 공연"}
              </button>
            </div>

            <dl className="concert-detail__meta">
              <div className="concert-detail__meta-row">
                <dt>공연 기간</dt>
                <dd>{dateRange}</dd>
              </div>
              <div className="concert-detail__meta-row">
                <dt>공연장</dt>
                <dd>{concert.venue}</dd>
              </div>
              {concert.area && (
                <div className="concert-detail__meta-row">
                  <dt>지역</dt>
                  <dd>{concert.area}</dd>
                </div>
              )}
              {concert.schedule && (
                <div className="concert-detail__meta-row">
                  <dt>일정</dt>
                  <dd>{concert.schedule}</dd>
                </div>
              )}
              {concert.age_limit && (
                <div className="concert-detail__meta-row">
                  <dt>관람 연령</dt>
                  <dd>{concert.age_limit}</dd>
                </div>
              )}
              {concert.ticket_price && (
                <div className="concert-detail__meta-row">
                  <dt>티켓 가격</dt>
                  <dd>{concert.ticket_price}</dd>
                </div>
              )}
              {concert.producer && (
                <div className="concert-detail__meta-row">
                  <dt>제작사</dt>
                  <dd>{concert.producer}</dd>
                </div>
              )}
            </dl>

            {/* 예매처 */}
            {concert.ticket_sites && concert.ticket_sites.length > 0 && (
              <div className="concert-detail__ticket-section">
                <span className="concert-detail__ticket-label">예매처</span>
                <div className="concert-detail__tickets">
                  {concert.ticket_sites.map((site) => (
                    <a
                      key={site.name}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="concert-detail__ticket-btn"
                    >
                      {TICKET_SITE_NAMES[site.name] ?? site.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 출연진 */}
        {concert.performers && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">출연진</h2>
            <p className="concert-detail__section-text">{concert.performers}</p>
          </div>
        )}

        {/* 제작진 */}
        {concert.crew && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">제작진</h2>
            <p className="concert-detail__section-text">{concert.crew}</p>
          </div>
        )}

        {/* 소개 */}
        {concert.synopsis && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">소개</h2>
            <p className="concert-detail__section-text">{concert.synopsis}</p>
          </div>
        )}

        {/* 소개 이미지 */}
        {concert.intro_images && concert.intro_images.length > 0 && (
          <div className="concert-detail__intro-images">
            {concert.intro_images.map((url, i) => (
              <img key={i} src={url} alt={`소개 이미지 ${i + 1}`} />
            ))}
          </div>
        )}
      </div>

      {/* 날짜 선택 모달 */}
      {showLoginPrompt && (
        <div
          className="concert-detail__date-picker-overlay"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="concert-detail__login-prompt"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="concert-detail__date-picker-title">
              로그인이 필요합니다
            </h3>
            <p className="concert-detail__login-prompt-desc">
              관심 공연을 등록하려면 로그인해주세요.
            </p>
            <div className="concert-detail__login-prompt-actions">
              <button
                type="button"
                className="concert-detail__date-picker-cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                취소
              </button>
              <Link
                to="/login"
                className="concert-detail__date-picker-confirm"
                onClick={() => setShowLoginPrompt(false)}
              >
                로그인하기
              </Link>
            </div>
          </div>
        </div>
      )}

      {showDatePicker && (
        <div
          className="concert-detail__date-picker-overlay"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="concert-detail__date-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="concert-detail__date-picker-title">
              관람 예정일 선택
            </h3>
            <p className="concert-detail__date-picker-desc">
              관람 예정인 날짜를 선택해주세요. 여러 날 선택 가능합니다.
            </p>

            <div className="concert-detail__date-picker-actions-top">
              <button
                type="button"
                className="concert-detail__date-picker-select-all"
                onClick={() => setSelectedDates(new Set(pickerDates))}
              >
                전체 선택
              </button>
              <button
                type="button"
                className="concert-detail__date-picker-select-all"
                onClick={() => setSelectedDates(new Set())}
              >
                전체 해제
              </button>
            </div>

            <ul className="concert-detail__date-list">
              {pickerDates.map((date) => (
                <li key={date} className="concert-detail__date-item">
                  <label className="concert-detail__date-label">
                    <input
                      type="checkbox"
                      checked={selectedDates.has(date)}
                      onChange={() => toggleDate(date)}
                    />
                    {formatPickerDate(date)}
                  </label>
                </li>
              ))}
            </ul>

            <div className="concert-detail__date-picker-footer">
              <button
                type="button"
                className="concert-detail__date-picker-cancel"
                onClick={() => setShowDatePicker(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="concert-detail__date-picker-confirm"
                onClick={() =>
                  handleBookmarkWithDates(Array.from(selectedDates).sort())
                }
                disabled={bookmarkLoading || selectedDates.size === 0}
              >
                {selectedDates.size > 0
                  ? `${selectedDates.size}일 등록`
                  : "날짜를 선택해주세요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
