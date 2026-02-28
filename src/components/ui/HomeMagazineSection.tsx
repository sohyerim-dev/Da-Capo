import { Link } from "react-router";
import "./HomeMagazineSection.scss";

interface MagazineItem {
  id: number;
  category: "큐레이터 픽" | "클래식 읽기";
  title: string;
  author: string;
}

const MAGAZINE_ITEMS: MagazineItem[] = [
  {
    id: 1,
    category: "큐레이터 픽",
    title: "3월 추천 공연",
    author: "줄라이",
  },
  {
    id: 2,
    category: "클래식 읽기",
    title: "클래식 왜 안 들어?",
    author: "어거스트",
  },
];

export default function HomeMagazineSection() {
  return (
    <section className="home-magazine">
      <div className="wrap">
        <h2 className="home-magazine__title">| 매거진</h2>

        <div className="home-magazine__desc">
          <div className="home-magazine__desc-block">
            <h3 className="home-magazine__desc-heading">큐레이터 픽</h3>
            <p className="home-magazine__desc-text">
              클래식 애호가가 매달 다음 달에 열리는 공연을 직접 선정해 추천하는
              콘텐츠입니다. 추천 이유와 감상 포인트를 함께 제공하여 관람할
              공연을 미리 발견하고 선택하는 데 도움을 제공합니다.
            </p>
          </div>
          <div className="home-magazine__desc-block">
            <h3 className="home-magazine__desc-heading">클래식 읽기</h3>
            <p className="home-magazine__desc-text">
              작곡가, 작품, 연주자, 음악사부터 감상과 생각까지 클래식에 관한
              다양한 이야기를 담는 글 콘텐츠입니다. 정보와 해석, 개인의 시선을
              통해 클래식을 더 깊이 이해하고 즐길 수 있도록 돕습니다.
            </p>
          </div>
        </div>

        <div className="home-magazine__list-wrap">
          <ul className="home-magazine__list">
            {MAGAZINE_ITEMS.map((item) => (
              <li key={item.id} className="home-magazine__item">
                <div className="home-magazine__link">
                  <span
                    className={`home-magazine__tag home-magazine__tag--${item.category === "큐레이터 픽" ? "curator" : "reading"}`}
                  >
                    {item.category}
                  </span>
                  <span className="home-magazine__item-title">
                    {item.title}
                  </span>
                  <span className="home-magazine__author">
                    by. {item.author}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="home-magazine__overlay">
            <p className="home-magazine__overlay-text">
              3/10 정식 오픈일에 공개 예정
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
