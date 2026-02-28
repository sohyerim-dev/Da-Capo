import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router";
import { supabase } from "../../lib/supabase";
import { concertTabData } from "../../data/concertTabData";

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  synopsis: string | null;
  bookmark_count: number;
  rank: number | null;
  tags: string[] | null;
  performers: string | null;
}

type SortOption = "start_date" | "bookmark_count";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "공연 임박순", value: "start_date" },
  { label: "찜 많은 순", value: "bookmark_count" },
];

const PAGE_SIZE = 8;
const BOXOFFICE_PAGE_SIZE = 8;

const AREAS = [
  "서울특별시",
  "인천광역시",
  "경기도",
  "부산광역시",
  "대구광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const DATE_OPTIONS = [
  { label: "전체", value: "" },
  { label: "이번 달", value: "thisMonth" },
  { label: "다음 달", value: "nextMonth" },
  { label: "3개월 이내", value: "3months" },
  { label: "6개월 이내", value: "6months" },
  { label: "직접 선택", value: "custom" },
];

function getDateRange(filter: string): { from: string; to: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

  if (filter === "thisMonth") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (filter === "nextMonth") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth() + 2, 0)),
    };
  }
  if (filter === "3months") {
    const to = new Date(now);
    to.setMonth(to.getMonth() + 3);
    return { from: fmt(now), to: fmt(to) };
  }
  if (filter === "6months") {
    const to = new Date(now);
    to.setMonth(to.getMonth() + 6);
    return { from: fmt(now), to: fmt(to) };
  }
  return null;
}

function isoToDot(iso: string): string {
  return iso.replace(/-/g, ".");
}

const SESSION_KEY = "concertBrowse";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ConcertBrowse() {
  const location = useLocation();
  const navType = useNavigationType();
  const shouldRestore =
    navType === "POP" || location.state?.fromDetail === true;
  const saved = shouldRestore ? loadSession() : null;
  const [activeTab, setActiveTab] = useState<number>(saved?.activeTab ?? 0);
  const [activeSubIndex, setActiveSubIndex] = useState<number | null>(
    saved?.activeSubIndex ?? null
  );
  const [isPanelOpen, setIsPanelOpen] = useState(saved?.isPanelOpen ?? false);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [visibleCount, setVisibleCount] = useState(saved?.visibleCount ?? PAGE_SIZE);
  const scrollRestored = useRef(false);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterArea, setFilterArea] = useState<string>(saved?.filterArea ?? "");
  const [filterDate, setFilterDate] = useState<string>(saved?.filterDate ?? "");
  const [filterSort, setFilterSort] = useState<SortOption>(
    saved?.filterSort ?? "start_date"
  );
  const [customFrom, setCustomFrom] = useState<string>(saved?.customFrom ?? "");
  const [customTo, setCustomTo] = useState<string>(saved?.customTo ?? "");

  useEffect(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        activeTab,
        activeSubIndex,
        isPanelOpen,
        filterArea,
        filterDate,
        filterSort,
        customFrom,
        customTo,
        visibleCount,
      })
    );
  }, [activeTab, activeSubIndex, isPanelOpen, filterArea, filterDate, filterSort, customFrom, customTo, visibleCount]);

  useEffect(() => {
    if (concerts.length > 0 && shouldRestore && !scrollRestored.current) {
      scrollRestored.current = true;
      const lastId = sessionStorage.getItem(SESSION_KEY + "_lastId");
      if (lastId) {
        setTimeout(() => {
          const el = document.querySelector(`[data-concert-id="${lastId}"]`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [concerts]);

  const hasFilter = filterArea !== "" || (filterDate !== "" && (filterDate !== "custom" || customFrom !== ""));

  const currentTab = concertTabData[activeTab];
  const currentItems = currentTab.items;
  const activeItem =
    currentTab.rankOnly || activeSubIndex === null
      ? null
      : currentItems[activeSubIndex];

  useEffect(() => {
    const fetchConcerts = async () => {
      setLoading(true);

      let query = supabase
        .from("concerts")
        .select("id, title, poster, synopsis, bookmark_count, rank, tags, performers")
        .in("status", ["공연예정", "공연중"]);

      if (currentTab.rankOnly) {
        query = query.not("rank", "is", null).order("rank", { ascending: true });
      } else {
        if (activeItem && !activeItem.isSeparator) {
          if (currentTab.usePerformers && activeItem.tag) {
            query = query.or(`performers.ilike.%${activeItem.tag}%,tags.cs.{${activeItem.tag}}`);
          } else if (activeItem.tags && activeItem.tags.length > 0) {
            query = query.or(activeItem.tags.map((t) => `tags.cs.{${t}}`).join(","));
          } else if (activeItem.tag) {
            query = query.contains("tags", [activeItem.tag]);
          }
        }

        if (filterSort === "bookmark_count") {
          query = query.order("bookmark_count", {
            ascending: false,
            nullsFirst: false,
          });
        } else {
          query = query.order("start_date", { ascending: true });
        }
      }

      if (filterArea) {
        query = query.eq("area", filterArea);
      }

      if (filterDate === "custom") {
        if (customFrom) {
          const from = isoToDot(customFrom);
          const to = customTo ? isoToDot(customTo) : from;
          query = query.lte("start_date", to).gte("end_date", from);
        }
      } else if (filterDate) {
        const range = getDateRange(filterDate);
        if (range) {
          query = query.lte("start_date", range.to).gte("end_date", range.from);
        }
      }

      const { data, error } = await query.limit(100);

      if (!error && data) {
        let filtered: Concert[];

        filtered = data as Concert[];

        setConcerts(filtered);
      }
      setLoading(false);
    };

    fetchConcerts();
  }, [activeTab, activeSubIndex, filterArea, filterDate, filterSort, customFrom, customTo]);

  const handleTabChange = (i: number) => {
    const tab = concertTabData[i];
    if (tab.rankOnly) {
      setActiveTab(i);
      setActiveSubIndex(null);
      setVisibleCount(BOXOFFICE_PAGE_SIZE);
      setFilterSort("start_date");
      setFilterArea("");
      setFilterDate("");
      setCustomFrom("");
      setCustomTo("");
      setIsPanelOpen(false);
      return;
    }
    if (activeTab === i) {
      setIsPanelOpen((prev) => !prev);
    } else {
      setActiveTab(i);
      setActiveSubIndex(null);
      setVisibleCount(PAGE_SIZE);
      setFilterSort("start_date");
      setFilterArea("");
      setFilterDate("");
      setCustomFrom("");
      setCustomTo("");
      setIsPanelOpen(true);
    }
  };

  const handleSubItemClick = (index: number | null) => {
    setActiveSubIndex(index);
    setVisibleCount(PAGE_SIZE);
    setFilterSort("start_date");
    setFilterArea("");
    setFilterDate("");
    setCustomFrom("");
    setCustomTo("");
  };

  return (
    <>
      <hr className="concert-info__section-divider" />

      {/* 대분류 탭 */}
      <div className="concert-info__tabs">
        {concertTabData.map((tab, i) => (
          <Fragment key={tab.label}>
            {tab.rankOnly && <span className="concert-info__tab-sep">/</span>}
            <button
              className={`concert-info__tab${activeTab === i ? " concert-info__tab--active" : ""}`}
              onClick={() => handleTabChange(i)}
            >
              {tab.label}
            </button>
          </Fragment>
        ))}
      </div>

      {/* 소분류 패널 */}
      {isPanelOpen && !currentTab.rankOnly && (
        <div className="concert-info__panel">
          <button
            className={`concert-info__panel-item${activeSubIndex === null ? " concert-info__panel-item--active" : ""}`}
            onClick={() => handleSubItemClick(null)}
          >
            {activeSubIndex === null && (
              <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            전체
          </button>
          {currentItems.map((item, i) =>
            item.isSeparator ? (
              <span key={item.label} className="concert-info__panel-separator">
                {item.label}
              </span>
            ) : (
              <button
                key={item.label}
                className={`concert-info__panel-item${activeSubIndex === i ? " concert-info__panel-item--active" : ""}`}
                onClick={() => handleSubItemClick(i)}
              >
                {activeSubIndex === i && (
                  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {item.label}
              </button>
            )
          )}
        </div>
      )}

      <hr className="concert-info__section-divider" />

      {/* 필터 버튼 + 정렬 */}
      <div className="concert-info__filter-row">
        <button
          className={`concert-info__filter-btn${hasFilter ? " concert-info__filter-btn--active" : ""}`}
          onClick={() => setIsFilterOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 6h18M7 12h10M11 18h2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          필터{hasFilter ? " ●" : ""}
        </button>
        {!currentTab.rankOnly && (
          <select
            className="concert-info__sort-select"
            value={filterSort}
            onChange={(e) => {
              setFilterSort(e.target.value as SortOption);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 필터 패널 */}
      {isFilterOpen && (
        <div className="concert-info__filter-panel">
          <div className="concert-info__filter-section">
            <p className="concert-info__filter-label">지역</p>
            <div className="concert-info__filter-options">
              <button
                className={`concert-info__filter-option${filterArea === "" ? " concert-info__filter-option--active" : ""}`}
                onClick={() => setFilterArea("")}
              >
                전체
              </button>
              {AREAS.map((area) => (
                <button
                  key={area}
                  className={`concert-info__filter-option${filterArea === area ? " concert-info__filter-option--active" : ""}`}
                  onClick={() => setFilterArea(filterArea === area ? "" : area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="concert-info__filter-section">
            <p className="concert-info__filter-label">날짜</p>
            <div className="concert-info__filter-options">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`concert-info__filter-option${filterDate === opt.value ? " concert-info__filter-option--active" : ""}`}
                  onClick={() => {
                    setFilterDate(opt.value);
                    if (opt.value !== "custom") {
                      setCustomFrom("");
                      setCustomTo("");
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filterDate === "custom" && (
              <div className="concert-info__filter-date-inputs">
                <input
                  type="date"
                  className="concert-info__filter-date-input"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="concert-info__filter-date-sep">~</span>
                <input
                  type="date"
                  className="concert-info__filter-date-input"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            )}
          </div>

          {hasFilter && (
            <button
              className="concert-info__filter-reset"
              onClick={() => {
                setFilterArea("");
                setFilterDate("");
                setCustomFrom("");
                setCustomTo("");
              }}
            >
              초기화
            </button>
          )}
        </div>
      )}

      {/* 카드 그리드 */}
      {!currentTab.rankOnly && activeSubIndex === null && !isPanelOpen ? (
        <div className="concert-info__guide">
          <p className="concert-info__guide-title">카테고리를 선택해 공연을 탐색해보세요</p>
          <p className="concert-info__guide-sub">탭을 클릭하면 세부 장르를 고를 수 있어요</p>
        </div>
      ) : loading ? (
        <div className="concert-info__cards">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="concert-info__skeleton">
              <div className="concert-info__skeleton-img" />
              <div className="concert-info__skeleton-title" />
            </div>
          ))}
        </div>
      ) : !loading && concerts.length === 0 ? (
        <p className="concert-info__search-empty">해당 공연이 없습니다.</p>
      ) : (
        <>
          <div className="concert-info__cards">
            {concerts.slice(0, visibleCount).map((concert) => (
              <Link
                key={concert.id}
                to={`/concert-info/${concert.id}`}
                className="concert-info__card"
                data-concert-id={concert.id}
                onClick={() => sessionStorage.setItem(SESSION_KEY + "_lastId", concert.id)}
              >
                <div className="concert-info__card-img">
                  <img src={concert.poster ?? ""} alt={concert.title ?? ""} />
                  {concert.rank && (
                    <span className="concert-info__card-rank">
                      박스오피스 {concert.rank}위
                    </span>
                  )}
                </div>
                <p className="concert-info__card-title">{concert.title}</p>
              </Link>
            ))}
          </div>

          {/* 더보기 */}
          {visibleCount < concerts.length && (
            <div className="concert-info__more-wrap">
              <button
                className="concert-info__more-btn"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                더보기
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
