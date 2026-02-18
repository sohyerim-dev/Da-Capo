import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { concertTabData } from "../../data/concertTabData";
import "./HomeConcertSection.scss";

interface Concert {
  id: string;
  title: string;
  poster: string;
}

const HOME_LABELS_PER_TAB: string[][] = [
  ["바흐", "모차르트", "베토벤", "브람스", "차이코프스키", "쇼팽"],
  ["서울시립교향악단", "경기필하모닉", "KBS교향악단", "임윤찬", "조성진", "정명훈"],
  [], // 작품 형태: 전체 6개 그대로
  [], // 악기: 전체 6개 그대로
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
  const homeLabels = HOME_LABELS_PER_TAB[activeTab];
  const currentItems = homeLabels.length > 0
    ? currentTab.items.filter((item) => homeLabels.includes(item.label))
    : currentTab.items;

  // 탭 변경 시 소제목 초기화
  useEffect(() => {
    setActiveSubIndex(0);
  }, [activeTab]);

  // 소제목 자동 순환 (클릭 시 타이머 리셋)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSubIndex((prev) => (prev + 1) % currentItems.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [activeTab, currentItems.length, cycleKey]);

  // 공연 데이터 fetch (캐싱)
  useEffect(() => {
    setIsVisible(false);

    const activeItem = currentItems[activeSubIndex];
    const cacheKey = `${activeTab}-${activeSubIndex}`;

    if (cacheRef.current[cacheKey]) {
      const timer = setTimeout(() => {
        setConcerts(cacheRef.current[cacheKey]);
        setIsVisible(true);
      }, FADE_MS);
      return () => clearTimeout(timer);
    }

    const fetchConcerts = async () => {
      const orFilter = activeItem.keywords
        .flatMap((keyword) =>
          currentTab.searchFields.map((f) => `${f}.ilike.%${keyword}%`)
        )
        .join(",");

      const { data, error } = await supabase
        .from("concerts")
        .select("id, title, poster")
        .or(orFilter)
        .in("status", ["공연예정", "공연중"])
        .order("start_date", { ascending: true })
        .limit(4);

      if (!error && data) {
        cacheRef.current[cacheKey] = data;
        setConcerts(data);
      }
      setIsVisible(true);
    };

    const timer = setTimeout(fetchConcerts, FADE_MS);
    return () => clearTimeout(timer);
  }, [activeTab, activeSubIndex]);

  return (
    <section className="home-concert">
      <div className="wrap">
        <h2 className="home-concert__title">| 공연 정보</h2>

        <div className="home-concert__tabs">
          {concertTabData.map((tab, i) => (
            <button
              key={tab.label}
              className={`home-concert__tab${activeTab === i ? " home-concert__tab--active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`home-concert__cards${!isVisible ? " home-concert__cards--loading" : ""}`}>
          {concerts.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="home-concert__skeleton" />
              ))
            : concerts.map((concert) => (
                <Link key={concert.id} to={`/concert-info/${concert.id}`} className="home-concert__card">
                  <img
                    className="home-concert__card-img"
                    src={concert.poster}
                    alt={concert.title}
                  />
                  <p className="home-concert__card-title">{concert.title}</p>
                </Link>
              ))}
        </div>

        <div className="home-concert__sub-categories">
          {currentItems.map((item, i) => (
            <button
              key={item.label}
              className={`home-concert__sub-item${activeSubIndex === i ? " home-concert__sub-item--active" : ""}`}
              onClick={() => { setActiveSubIndex(i); setCycleKey((k) => k + 1); }}
            >
              {item.label}
            </button>
          ))}
          <Link to="/concert-info" className="home-concert__more">
            … More
          </Link>
        </div>
      </div>
    </section>
  );
}
