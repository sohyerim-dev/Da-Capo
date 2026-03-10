import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";
import "./HomeMagazineSection.scss";

interface MagazineItem {
  id: number;
  category: string;
  title: string;
  author_bio_name: string | null;
}

export default function HomeMagazineSection() {
  const [items, setItems] = useState<MagazineItem[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const [curatorRes, readingRes] = await Promise.all([
        supabase
          .from("magazine_posts")
          .select("id, category, title, author_bio_name")
          .eq("category", "큐레이터 픽")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("magazine_posts")
          .select("id, category, title, author_bio_name")
          .eq("category", "클래식 읽기")
          .order("created_at", { ascending: false })
          .limit(2),
      ]);
      setItems([...(curatorRes.data ?? []), ...(readingRes.data ?? [])]);
    };
    fetchPosts();
  }, []);

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
              클래식에 관한 다양한 이야기를 담는 글 콘텐츠입니다.공연 경험과
              감상, 작곡가와 작품 이야기, 음악에 대한 생각까지 클래식을 여러
              시선으로 풀어냅니다.
            </p>
          </div>
        </div>

        <ul className="home-magazine__list">
          {items.map((item) => (
            <li key={item.id} className="home-magazine__item">
              <Link
                to={`/magazine/${item.id}`}
                className="home-magazine__link"
              >
                <span
                  className={`home-magazine__tag home-magazine__tag--${item.category === "큐레이터 픽" ? "curator" : "reading"}`}
                >
                  {item.category}
                </span>
                <span className="home-magazine__item-title">
                  {item.title}
                </span>
                <span className="home-magazine__author">
                  {item.author_bio_name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="home-magazine__footer">
          <Link to="/magazine" className="home-magazine__more">
            더보기
          </Link>
        </div>
      </div>
    </section>
  );
}
