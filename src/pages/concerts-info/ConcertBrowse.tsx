import { useEffect, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router";
import { supabase } from "../../lib/supabase";
import { concertTabData } from "../../data/concertTabData";

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  synopsis: string | null;
}

const PAGE_SIZE = 4;
const SUB_PAGE_SIZE = 6;
const SUB_PAGE_SIZE_MOBILE = 3;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1200px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1200px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const AREAS = [
  "서울특별시", "인천광역시", "경기도", "부산광역시", "대구광역시",
  "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
  "강원특별자치도", "충청북도", "충청남도", "전북특별자치도",
  "전라남도", "경상북도", "경상남도", "제주특별자치도",
];

const DATE_OPTIONS = [
  { label: "전체", value: "" },
  { label: "이번 달", value: "thisMonth" },
  { label: "다음 달", value: "nextMonth" },
  { label: "3개월 이내", value: "3months" },
  { label: "6개월 이내", value: "6months" },
];

function getDateRange(filter: string): { from: string; to: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

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
  const shouldRestore = navType === "POP" || location.state?.fromDetail === true;
  const saved = shouldRestore ? loadSession() : null;
  const isMobile = useIsMobile();
  const subPageSize = isMobile ? SUB_PAGE_SIZE_MOBILE : SUB_PAGE_SIZE;

  const [activeTab, setActiveTab] = useState<number>(saved?.activeTab ?? 0);
  const [activeSubIndex, setActiveSubIndex] = useState<number>(saved?.activeSubIndex ?? 0);
  const [subPage, setSubPage] = useState<number>(saved?.subPage ?? 0);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterArea, setFilterArea] = useState<string>(saved?.filterArea ?? "");
  const [filterDate, setFilterDate] = useState<string>(saved?.filterDate ?? "");

  useEffect(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ activeTab, activeSubIndex, subPage, filterArea, filterDate })
    );
  }, [activeTab, activeSubIndex, subPage, filterArea, filterDate]);

  const hasFilter = filterArea !== "" || filterDate !== "";

  const currentTab = concertTabData[activeTab];
  const currentItems = currentTab.items;
  const totalSubPages = Math.ceil(currentItems.length / subPageSize);
  const visibleSubItems = currentItems.slice(
    subPage * subPageSize,
    (subPage + 1) * subPageSize
  );
  const activeItem = currentItems[activeSubIndex];

  useEffect(() => {
    const fetchConcerts = async () => {
      setLoading(true);

      let query = supabase
        .from("concerts")
        .select("id, title, poster, synopsis")
        .in("status", ["공연예정", "공연중"]);

      if (!activeItem.showOthers) {
        const orFilter = activeItem.keywords
          .flatMap((keyword) =>
            currentTab.searchFields.map((f) => `${f}.ilike.%${keyword}%`)
          )
          .join(",");
        query = query.or(orFilter);

        for (const kw of activeItem.excludeKeywords ?? []) {
          query = query.not("title", "ilike", `%${kw}%`);
        }
      }

      if (filterArea) {
        query = query.eq("area", filterArea);
      }

      if (filterDate) {
        const range = getDateRange(filterDate);
        if (range) {
          query = query.lte("start_date", range.to).gte("end_date", range.from);
        }
      }

      const { data, error } = await query
        .order("start_date", { ascending: true })
        .limit(100);

      if (!error && data) {
        let filtered: Concert[];

        if (activeItem.showOthers) {
          const otherKeywords = currentTab.items
            .filter((item) => !item.showOthers)
            .flatMap((item) => item.keywords);
          filtered = data.filter(
            (c) =>
              !otherKeywords.some(
                (kw) =>
                  (c.title ?? "").includes(kw) || (c.synopsis ?? "").includes(kw)
              )
          );
        } else {
          const requireAny = activeItem.requireAny;
          filtered = requireAny
            ? data.filter((c) =>
                requireAny.some(
                  (kw) =>
                    (c.title ?? "").includes(kw) || (c.synopsis ?? "").includes(kw)
                )
              )
            : data;
        }

        setConcerts(filtered);
      }
      setLoading(false);
    };

    fetchConcerts();
  }, [activeTab, activeSubIndex, filterArea, filterDate]);

  const handleTabChange = (i: number) => {
    setActiveTab(i);
    setActiveSubIndex(0);
    setSubPage(0);
    setVisibleCount(PAGE_SIZE);
  };

  const handleSubItemClick = (globalIndex: number) => {
    setActiveSubIndex(globalIndex);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <>
      {/* 대분류 탭 */}
      <div className="concert-info__tabs">
        {concertTabData.map((tab, i) => (
          <button
            key={tab.label}
            className={`concert-info__tab${activeTab === i ? " concert-info__tab--active" : ""}`}
            onClick={() => handleTabChange(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 소분류 */}
      <div className="concert-info__sub-wrap">
        <button
          className="concert-info__sub-arrow"
          onClick={() => setSubPage((p: number) => Math.max(0, p - 1))}
          disabled={subPage === 0}
          aria-label="이전"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="concert-info__sub-list">
          {visibleSubItems.map((item, i) => {
            const globalIndex = subPage * subPageSize + i;
            return (
              <button
                key={item.label}
                className={`concert-info__sub-item${activeSubIndex === globalIndex ? " concert-info__sub-item--active" : ""}`}
                onClick={() => handleSubItemClick(globalIndex)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          className="concert-info__sub-arrow"
          onClick={() => setSubPage((p: number) => Math.min(totalSubPages - 1, p + 1))}
          disabled={subPage === totalSubPages - 1}
          aria-label="다음"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* 필터 버튼 */}
      <div className="concert-info__filter-row">
        <button
          className={`concert-info__filter-btn${hasFilter ? " concert-info__filter-btn--active" : ""}`}
          onClick={() => setIsFilterOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          필터{hasFilter ? " ●" : ""}
        </button>
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
                  onClick={() => setFilterDate(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      {loading ? (
        <div className="concert-info__cards">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="concert-info__skeleton">
              <div className="concert-info__skeleton-img" />
              <div className="concert-info__skeleton-title" />
            </div>
          ))}
        </div>
      ) : concerts.length === 0 ? (
        <p className="concert-info__search-empty">해당 공연이 없습니다.</p>
      ) : (
        <>
          <div className="concert-info__cards">
            {concerts.slice(0, visibleCount).map((concert) => (
              <Link key={concert.id} to={`/concert-info/${concert.id}`} className="concert-info__card">
                <div className="concert-info__card-img">
                  <img src={concert.poster ?? ""} alt={concert.title ?? ""} />
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
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
