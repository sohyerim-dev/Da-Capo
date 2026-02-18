import { useState } from "react";

const tabData = [
  {
    label: "작곡가",
    items: ["바흐", "모차르트", "베토벤", "브람스", "차이코프스키", "라흐마니노프", "쇼팽", "드보르자크", "말러", "슈베르트"],
  },
  {
    label: "아티스트 / 단체",
    items: ["서울시립교향악단", "경기필하모닉", "KBS교향악단", "임윤찬", "조성진", "양인모", "정명훈"],
  },
  {
    label: "작품 형태",
    items: ["교향곡", "협주곡", "실내악", "합창", "오페라", "리사이틀 · 독창회"],
  },
  {
    label: "악기",
    items: ["피아노", "바이올린", "첼로", "성악", "관악", "타악"],
  },
];

const MOCK_CARDS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  title: "공연명",
  img: `https://picsum.photos/seed/concert-${i}/300/400`,
}));

const PAGE_SIZE = 4;
const SUB_PAGE_SIZE = 6;

export default function ConcertBrowse() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [subPage, setSubPage] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const currentItems = tabData[activeTab].items;
  const totalSubPages = Math.ceil(currentItems.length / SUB_PAGE_SIZE);
  const visibleSubItems = currentItems.slice(subPage * SUB_PAGE_SIZE, (subPage + 1) * SUB_PAGE_SIZE);

  const handleTabChange = (i: number) => {
    setActiveTab(i);
    setActiveSubIndex(0);
    setSubPage(0);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <>
      {/* 대분류 탭 */}
      <div className="concert-info__tabs">
        {tabData.map((tab, i) => (
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
          onClick={() => setSubPage((p) => Math.max(0, p - 1))}
          disabled={subPage === 0}
          aria-label="이전"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="concert-info__sub-list">
          {visibleSubItems.map((item, i) => {
            const globalIndex = subPage * SUB_PAGE_SIZE + i;
            return (
              <button
                key={item}
                className={`concert-info__sub-item${activeSubIndex === globalIndex ? " concert-info__sub-item--active" : ""}`}
                onClick={() => { setActiveSubIndex(globalIndex); setVisibleCount(PAGE_SIZE); }}
              >
                {item}
              </button>
            );
          })}
        </div>
        <button
          className="concert-info__sub-arrow"
          onClick={() => setSubPage((p) => Math.min(totalSubPages - 1, p + 1))}
          disabled={subPage === totalSubPages - 1}
          aria-label="다음"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* 카드 그리드 */}
      <div className="concert-info__cards">
        {MOCK_CARDS.slice(0, visibleCount).map((card) => (
          <div key={card.id} className="concert-info__card">
            <div className="concert-info__card-img">
              <img src={card.img} alt={card.title} />
            </div>
            <p className="concert-info__card-title">{card.title}</p>
          </div>
        ))}
      </div>

      {/* 더보기 */}
      {visibleCount < MOCK_CARDS.length && (
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
  );
}
