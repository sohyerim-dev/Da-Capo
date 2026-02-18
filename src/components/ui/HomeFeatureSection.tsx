import { Link } from "react-router";
import "./HomeFeatureSection.scss";

const ConcertIcon = () => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M232,104a8,8,0,0,0,8-8V64a16,16,0,0,0-16-16H32A16,16,0,0,0,16,64V96a8,8,0,0,0,8,8,24,24,0,0,1,0,48,8,8,0,0,0-8,8v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160a8,8,0,0,0-8-8,24,24,0,0,1,0-48ZM32,167.2a40,40,0,0,0,0-78.4V64H88V192H32Zm192,0V192H104V64H224V88.8a40,40,0,0,0,0,78.4Z" />
  </svg>
);

const MagazineIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="10"
      y="8"
      width="28"
      height="36"
      rx="3"
      stroke="currentColor"
      strokeWidth="3.5"
    />
    <line
      x1="16"
      y1="18"
      x2="32"
      y2="18"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="25"
      x2="32"
      y2="25"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="32"
      x2="24"
      y2="32"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

const NoteIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 책 본체 */}
    <rect
      x="8"
      y="6"
      width="32"
      height="38"
      rx="3"
      stroke="currentColor"
      strokeWidth="3"
    />
    {/* 책 척추(spine) */}
    <line
      x1="16"
      y1="6"
      x2="16"
      y2="44"
      stroke="currentColor"
      strokeWidth="3"
    />
    {/* 줄 */}
    <line
      x1="22"
      y1="16"
      x2="34"
      y2="16"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="22"
      y1="23"
      x2="34"
      y2="23"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="22"
      y1="30"
      x2="30"
      y2="30"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const cards = [
  {
    icon: <ConcertIcon />,
    title: "공연 탐색",
    desc: "클래식 팬의 관점으로\n공연 탐색하기",
    variant: "dark",
    to: "/concert-info",
  },
  {
    icon: <MagazineIcon />,
    title: "매거진",
    desc: "추천 공연과\n음악 이야기 읽기",
    variant: "light",
    to: "/magazine",
  },
  {
    icon: <NoteIcon />,
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
              <div className="home-feature__card-icon">{card.icon}</div>
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
