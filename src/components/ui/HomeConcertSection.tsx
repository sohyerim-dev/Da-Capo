import { useState, useEffect } from "react";
import { Link } from "react-router";
import "./HomeConcertSection.scss";

const tabData = [
  {
    label: "작곡가",
    items: [
      {
        name: "바흐",
        cards: [
          { title: "바흐 무반주 첼로 모음곡 전곡" },
          { title: "바흐 골드베르크 변주곡 — 임윤찬" },
          { title: "바흐 마태 수난곡 · 서울시합창단" },
          { title: "바흐 브란덴부르크 협주곡 전곡" },
        ],
      },
      {
        name: "모차르트",
        cards: [
          { title: "모차르트 피아노협주곡 21번 · KBS교향악단" },
          { title: "모차르트 레퀴엠 · 국립합창단" },
          { title: "모차르트 현악사중주의 밤" },
          { title: "모차르트 교향곡 40번 · 경기필하모닉" },
        ],
      },
      {
        name: "베토벤",
        cards: [
          { title: "2025 서울시향 얀 판 츠베덴의 베토벤 '합창'" },
          { title: "정명훈 x KBS교향악단 《베토벤 9》" },
          { title: "위대한 베토벤: 비창, 피아노협주곡 3번..." },
          { title: "야벨 콰르텟 베토벤 현악사중주 전곡연주 4" },
        ],
      },
      {
        name: "브람스",
        cards: [
          { title: "브람스 교향곡 4번 · 베를린 필하모닉" },
          { title: "브람스 피아노협주곡 2번 — 조성진" },
          { title: "브람스 클라리넷 소나타의 밤" },
          { title: "브람스 독일 레퀴엠 · 서울시향" },
        ],
      },
      {
        name: "차이코프스키",
        cards: [
          { title: "차이코프스키 피아노협주곡 1번 · 정명훈" },
          { title: "호두까기 인형 — 국립발레단" },
          { title: "차이코프스키 바이올린협주곡 — 양인모" },
          { title: "차이코프스키 교향곡 6번 '비창'" },
        ],
      },
      {
        name: "라흐마니노프",
        cards: [
          { title: "라흐마니노프 피아노협주곡 2번 — 임윤찬" },
          { title: "라흐마니노프 심포닉 댄스 · KBS교향악단" },
          { title: "라흐마니노프 피아노 소나타 2번" },
          { title: "라흐마니노프 베스퍼스 · 서울시합창단" },
        ],
      },
    ],
  },
  {
    label: "아티스트 · 단체",
    items: [
      {
        name: "서울시립교향악단",
        cards: [
          { title: "서울시향 정기연주회 2025-02" },
          { title: "서울시향 얀 판 츠베덴의 봄" },
          { title: "서울시향 × 임윤찬 — 쇼팽" },
          { title: "서울시향 신년 음악회 2025" },
        ],
      },
      {
        name: "경기필하모닉",
        cards: [
          { title: "경기필 정기연주회 — 드보르자크" },
          { title: "경기필 × 조성진 — 모차르트" },
          { title: "경기필 브루크너 교향곡 7번" },
          { title: "경기필 신년음악회 2025" },
        ],
      },
      {
        name: "KBS교향악단",
        cards: [
          { title: "KBS교향악단 정명훈 지휘 — 말러 5번" },
          { title: "KBS교향악단 스페셜 갈라 콘서트" },
          { title: "KBS교향악단 × 양인모 — 바이올린" },
          { title: "KBS교향악단 베토벤 전곡 시리즈 III" },
        ],
      },
      {
        name: "임윤찬",
        cards: [
          { title: "임윤찬 피아노 리사이틀 2025 — 바흐" },
          { title: "임윤찬 × 서울시향 — 라흐마니노프" },
          { title: "임윤찬 쇼팽 에튀드 전곡" },
          { title: "임윤찬 리사이틀 — 베토벤 후기 소나타" },
        ],
      },
      {
        name: "조성진",
        cards: [
          { title: "조성진 피아노 리사이틀 — 슈베르트" },
          { title: "조성진 × 경기필 — 모차르트" },
          { title: "조성진 쇼팽 발라드 전곡" },
          { title: "조성진 × 베를린 필 내한 공연" },
        ],
      },
      {
        name: "양인모",
        cards: [
          { title: "양인모 바이올린 독주회 — 바흐" },
          { title: "양인모 × KBS교향악단 — 차이코프스키" },
          { title: "양인모 파가니니 카프리스 전곡" },
          { title: "양인모 × 피아노 듀오 리사이틀" },
        ],
      },
      {
        name: "정명훈",
        cards: [
          { title: "정명훈 × KBS교향악단 《베토벤 9》" },
          { title: "정명훈 지휘 말러 교향곡 9번" },
          { title: "정명훈 × 파리 오케스트라 내한 공연" },
          { title: "정명훈 갈라 콘서트 2025" },
        ],
      },
    ],
  },
  {
    label: "작품 형태",
    items: [
      {
        name: "교향곡",
        cards: [
          { title: "브람스 교향곡 4번 · 베를린 필하모닉" },
          { title: "말러 교향곡 5번 · 정명훈" },
          { title: "드보르자크 신세계 교향곡 · 경기필" },
          { title: "베토벤 교향곡 9번 '합창' · 서울시향" },
        ],
      },
      {
        name: "협주곡",
        cards: [
          { title: "쇼팽 피아노협주곡 1번 — 조성진" },
          { title: "차이코프스키 바이올린협주곡 — 양인모" },
          { title: "라흐마니노프 피아노협주곡 2번 — 임윤찬" },
          { title: "드보르자크 첼로협주곡 · KBS교향악단" },
        ],
      },
      {
        name: "실내악",
        cards: [
          { title: "슈베르트 현악 5중주 · 노부스 콰르텟" },
          { title: "베토벤 현악사중주 전곡 시리즈" },
          { title: "피아노 트리오의 밤 — 브람스 & 슈만" },
          { title: "모차르트 현악사중주 · 서울 콰르텟" },
        ],
      },
      {
        name: "합창",
        cards: [
          { title: "베르디 레퀴엠 · 국립합창단" },
          { title: "바흐 마태 수난곡 · 서울시합창단" },
          { title: "라흐마니노프 베스퍼스 · 서울시합창단" },
          { title: "모차르트 레퀴엠 · 코리안심포니" },
        ],
      },
      {
        name: "오페라",
        cards: [
          { title: "베르디 《라 트라비아타》 — 국립오페라단" },
          { title: "푸치니 《토스카》 내한 공연" },
          { title: "모차르트 《피가로의 결혼》 · 서울시오페라단" },
          { title: "비제 《카르멘》 — 세종문화회관" },
        ],
      },
      {
        name: "리사이틀 · 독창회",
        cards: [
          { title: "임윤찬 피아노 리사이틀 2025" },
          { title: "양인모 바이올린 독주회" },
          { title: "소프라노 황수미 독창회" },
          { title: "조성진 피아노 리사이틀 — 슈베르트" },
        ],
      },
    ],
  },
  {
    label: "악기",
    items: [
      {
        name: "피아노",
        cards: [
          { title: "임윤찬 피아노 리사이틀 — 바흐 골드베르크" },
          { title: "조성진 쇼팽 발라드 전곡" },
          { title: "쇼팽 에튀드 전곡 — 피아노의 시간" },
          { title: "베토벤 피아노 소나타 전곡 시리즈" },
        ],
      },
      {
        name: "바이올린",
        cards: [
          { title: "양인모 바이올린 독주회 — 바흐" },
          { title: "파가니니 카프리스 전곡 — 양인모" },
          { title: "바이올린 마스터클래스 연주회 2025" },
          { title: "차이코프스키 바이올린협주곡 · KBS교향악단" },
        ],
      },
      {
        name: "첼로",
        cards: [
          { title: "바흐 무반주 첼로 모음곡 전곡" },
          { title: "첼로의 울림 — 드보르자크 협주곡" },
          { title: "첼로 앙상블의 밤 · 한국첼로협회" },
          { title: "슈만 첼로협주곡 · 서울시향" },
        ],
      },
      {
        name: "성악",
        cards: [
          { title: "소프라노 황수미 독창회" },
          { title: "테너 이용훈 갈라 콘서트" },
          { title: "바리톤 고성현 리사이틀" },
          { title: "국립오페라단 갈라 콘서트 2025" },
        ],
      },
      {
        name: "관악",
        cards: [
          { title: "서울시향 관악 앙상블의 밤" },
          { title: "플루트 리사이틀 — 김유빈" },
          { title: "목관 5중주 · 코리안 윈드 퀸텟" },
          { title: "호른 협주곡의 밤 · 코리안심포니" },
        ],
      },
      {
        name: "타악",
        cards: [
          { title: "마림바 독주회 — 이주연" },
          { title: "타악 앙상블 콘서트 2025" },
          { title: "드럼 & 퍼커션 나이트" },
          { title: "팀파니와 오케스트라의 밤 · 경기필" },
        ],
      },
    ],
  },
];

export default function HomeConcertSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  const currentItems = tabData[activeTab].items;
  const currentCards = currentItems[activeSubIndex].cards;

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

  return (
    <section className="home-concert">
      <div className="wrap">
        <h2 className="home-concert__title">| 공연 정보</h2>

        <div className="home-concert__tabs">
          {tabData.map((tab, i) => (
            <button
              key={tab.label}
              className={`home-concert__tab${activeTab === i ? " home-concert__tab--active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="home-concert__cards">
          {currentCards.map((card, i) => (
            <div key={i} className="home-concert__card">
              <img className="home-concert__card-img" src={`https://picsum.photos/seed/${activeTab}-${activeSubIndex}-${i}/300/400`} alt={card.title} />
              <p className="home-concert__card-title">{card.title}</p>
            </div>
          ))}
        </div>

        <div className="home-concert__sub-categories">
          {currentItems.map((item, i) => (
            <button
              key={item.name}
              className={`home-concert__sub-item${activeSubIndex === i ? " home-concert__sub-item--active" : ""}`}
              onClick={() => { setActiveSubIndex(i); setCycleKey((k) => k + 1); }}
            >
              {item.name}
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
