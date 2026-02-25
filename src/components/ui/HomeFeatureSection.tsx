import { Link } from "react-router";
import "./HomeFeatureSection.scss";

const cards = [
  {
    icon: "/images/ticket-svg.svg",
    iconAlt: "공연 티켓",
    title: "공연 탐색",
    desc: "클래식 팬의 관점으로\n공연 탐색하기",
    variant: "dark",
    to: "/concert-info",
  },
  {
    icon: "/images/magazine-svg.svg",
    iconAlt: "매거진",
    title: "매거진",
    desc: "추천 공연과\n음악 이야기 읽기",
    variant: "light",
    to: "/magazine",
  },
  {
    icon: "/images/note-svg.svg",
    iconAlt: "클래식 노트",
    title: "나의 클래식 노트",
    desc: "관람 기록과 생각 남기기",
    variant: "dark",
    to: "/classic-note",
  },
];

export default function HomeFeatureSection() {
  return (
    <section className="home-feature">
      <div className="wrap">
        <div className="home-feature__header">
          <h2 className="home-feature__title">
            <span className="home-feature__title-desktop">클래식 공연을 발견하고, 즐기고, 기록하다</span>
            <span className="home-feature__title-mobile">클래식 공연을 발견하고,<br />즐기고, 기록하다</span>
          </h2>
          <p className="home-feature__subtitle">
            Da Capo에서 당신만의 클래식 경험을 이어가세요
          </p>
        </div>
        <div className="home-feature__cards">
          {cards.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className={`home-feature__card home-feature__card--${card.variant}`}
            >
              <div className="home-feature__card-icon">
                <img src={card.icon} alt={card.iconAlt} draggable="false" />
              </div>
              <h3 className="home-feature__card-title">{card.title}</h3>
              <p className="home-feature__card-desc">
                {card.desc.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
