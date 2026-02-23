import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { concertTabData } from "../../data/concertTabData";
import "./HomeConcertSection.scss";

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  synopsis: string | null;
  rank: number | null;
}

const HOME_LABELS_PER_TAB: string[][] = [
  ["바흐", "모차르트", "베토벤", "브람스", "차이코프스키", "쇼팽"],
  [
    "서울시립교향악단",
    "경기필하모닉",
    "KBS교향악단",
    "임윤찬",
    "조성진",
    "정명훈",
  ],
  [], // 작품 형태: 전체 6개 그대로
  [], // 악기: 전체 6개 그대로
  [], // 박스오피스: rankOnly, 사용 안 함
];

export default function HomeConcertSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const cacheRef = useRef<Record<string, Concert[]>>({});
  const FADE_MS = 300;

  const currentTab = concertTabData[activeTab];
  const isRankOnly = currentTab.rankOnly ?? false;
  const homeLabels = HOME_LABELS_PER_TAB[activeTab] ?? [];
  const currentItems = isRankOnly
    ? []
    : homeLabels.length > 0
      ? homeLabels
          .map((label) => currentTab.items.find((item) => item.label === label))
          .filter(
            (item): item is NonNullable<typeof item> => item !== undefined
          )
      : currentTab.items;

  // 탭 변경 시 소제목 초기화
  useEffect(() => {
    setActiveSubIndex(0);
  }, [activeTab]);

  // 소제목 자동 순환 (rankOnly 탭 제외)
  useEffect(() => {
    if (isRankOnly || currentItems.length === 0) return;
    const timer = setInterval(() => {
      setActiveSubIndex((prev) => (prev + 1) % currentItems.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [activeTab, currentItems.length, cycleKey, isRankOnly]);

  // 공연 데이터 fetch (캐싱)
  useEffect(() => {
    setIsVisible(false);

    const cacheKey = isRankOnly ? "rankOnly" : `${activeTab}-${activeSubIndex}`;

    if (cacheRef.current[cacheKey]) {
      const timer = setTimeout(() => {
        setConcerts(cacheRef.current[cacheKey]);
        setIsVisible(true);
      }, FADE_MS);
      return () => clearTimeout(timer);
    }

    const fetchConcerts = async () => {
      if (isRankOnly) {
        const { data, error } = await supabase
          .from("concerts")
          .select("id, title, poster, synopsis, rank")
          .in("status", ["공연예정", "공연중"])
          .not("rank", "is", null)
          .order("rank", { ascending: true })
          .limit(4);

        if (!error && data) {
          cacheRef.current[cacheKey] = data as Concert[];
          setConcerts(data as Concert[]);
        }
        setIsVisible(true);
        return;
      }

      const activeItem = currentItems[activeSubIndex];
      let query = supabase
        .from("concerts")
        .select("id, title, poster, synopsis, rank")
        .in("status", ["공연예정", "공연중"]);

      if (!activeItem.showOthers) {
        const orFilter = activeItem.keywords
          .flatMap((keyword) =>
            currentTab.searchFields.map((f) => `${f}.ilike.%${keyword}%`)
          )
          .join(",");
        if (orFilter) query = query.or(orFilter);

        for (const kw of activeItem.excludeKeywords ?? []) {
          query = query.not("title", "ilike", `%${kw}%`);
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
                  (c.title ?? "").includes(kw) ||
                  (c.synopsis ?? "").includes(kw)
              )
          );
        } else {
          const requireAny = activeItem.requireAny;
          filtered = requireAny
            ? data.filter((c) =>
                requireAny.some(
                  (kw) =>
                    (c.title ?? "").includes(kw) ||
                    (c.synopsis ?? "").includes(kw)
                )
              )
            : data;
        }

        const result = filtered.slice(0, 4);
        cacheRef.current[cacheKey] = result;
        setConcerts(result);
      }
      setIsVisible(true);
    };

    const timer = setTimeout(fetchConcerts, FADE_MS);
    return () => clearTimeout(timer);
  }, [activeTab, activeSubIndex, isRankOnly]);

  return (
    <section className="home-concert">
      <div className="wrap">
        <h2 className="home-concert__title">| 공연 정보</h2>

        <div className="home-concert__tabs">
          {concertTabData.map((tab, i) =>
            tab.rankOnly ? null : (
              <button
                key={tab.label}
                className={`home-concert__tab${activeTab === i ? " home-concert__tab--active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {tab.label}
              </button>
            )
          )}
        </div>

        <div
          className={`home-concert__cards${!isVisible ? " home-concert__cards--loading" : ""}`}
        >
          {concerts.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="home-concert__skeleton" />
              ))
            : concerts.map((concert) => (
                <Link
                  key={concert.id}
                  to={`/concert-info/${concert.id}`}
                  className="home-concert__card"
                >
                  <div className="home-concert__card-img-wrap">
                    <img
                      className="home-concert__card-img"
                      src={concert.poster ?? ""}
                      alt={concert.title ?? ""}
                    />
                    {concert.rank && (
                      <span className="home-concert__card-rank">
                        박스오피스 {concert.rank}위
                      </span>
                    )}
                  </div>
                  <p className="home-concert__card-title">{concert.title}</p>
                </Link>
              ))}
        </div>

        {!isRankOnly && (
          <div className="home-concert__sub-categories">
            {currentItems.map((item, i) => (
              <button
                key={item.label}
                className={`home-concert__sub-item${activeSubIndex === i ? " home-concert__sub-item--active" : ""}`}
                onClick={() => {
                  setActiveSubIndex(i);
                  setCycleKey((k) => k + 1);
                }}
              >
                {item.label}
              </button>
            ))}
            <Link to="/concert-info" className="home-concert__more">
              … More
            </Link>
          </div>
        )}

        {isRankOnly && (
          <div className="home-concert__sub-categories">
            <Link to="/concert-info" className="home-concert__more">
              … More
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
