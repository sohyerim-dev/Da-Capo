import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";

// 표기 변형 맵: 검색어 → 함께 검색할 변형 목록
const SPELLING_VARIANTS: Record<string, string[]> = {
  // ㄱ
  "거슈윈": ["조지 거슈윈"],
  "조지 거슈윈": ["거슈윈"],
  "그리그": ["에드바르 그리그"],
  "에드바르 그리그": ["그리그"],
  "글라스": ["글래스"],
  "글래스": ["글라스"],
  // ㄴ
  "닐센": ["닐슨"],
  "닐슨": ["닐센"],
  // ㄷ
  "도니제티": ["도니체티"],
  "도니체티": ["도니제티"],
  "드보르자크": ["드보르작"],
  "드보르작": ["드보르자크"],
  "드뷔시": ["드뷔씨"],
  "드뷔씨": ["드뷔시"],
  // ㄹ
  "라벨": ["모리스 라벨"],
  "모리스 라벨": ["라벨"],
  "라흐마니노프": ["라흐마니노브"],
  "라흐마니노브": ["라흐마니노프"],
  "로시니": ["로씨니"],
  "로씨니": ["로시니"],
  "리스트": ["프란츠 리스트"],
  "프란츠 리스트": ["리스트"],
  "림스키코르사코프": ["림스키 코르사코프"],
  "림스키 코르사코프": ["림스키코르사코프"],
  // ㅁ
  "마스네": ["쥘 마스네"],
  "쥘 마스네": ["마스네"],
  "말러": ["구스타프 말러"],
  "구스타프 말러": ["말러"],
  "메시앙": ["올리비에 메시앙"],
  "올리비에 메시앙": ["메시앙"],
  "멘델스존": ["멘델손"],
  "멘델손": ["멘델스존"],
  "모차르트": ["모짜르트", "모자르트"],
  "모짜르트": ["모차르트", "모자르트"],
  "모자르트": ["모차르트", "모짜르트"],
  "무소르그스키": ["무소륵스키"],
  "무소륵스키": ["무소르그스키"],
  // ㅂ
  "바그너": ["리하르트 바그너"],
  "리하르트 바그너": ["바그너"],
  "바르톡": ["바르토크"],
  "바르토크": ["바르톡"],
  "바흐": ["바하", "요한 세바스티안 바흐"],
  "바하": ["바흐"],
  "요한 세바스티안 바흐": ["바흐", "바하"],
  "번스타인": ["레너드 번스타인"],
  "레너드 번스타인": ["번스타인"],
  "베르디": ["주세페 베르디"],
  "주세페 베르디": ["베르디"],
  "베버": ["베베르"],
  "베베르": ["베버"],
  "베토벤": ["루트비히 판 베토벤"],
  "루트비히 판 베토벤": ["베토벤"],
  "벨리니": ["빈첸초 벨리니"],
  "빈첸초 벨리니": ["벨리니"],
  "보로딘": ["알렉산드르 보로딘"],
  "알렉산드르 보로딘": ["보로딘"],
  "브람스": ["요하네스 브람스"],
  "요하네스 브람스": ["브람스"],
  "브루크너": ["브룩너"],
  "브룩너": ["브루크너"],
  "브루흐": ["막스 브루흐"],
  "막스 브루흐": ["브루흐"],
  "브리튼": ["브리텐"],
  "브리텐": ["브리튼"],
  "비발디": ["안토니오 비발디"],
  "안토니오 비발디": ["비발디"],
  "비제": ["조르주 비제"],
  "조르주 비제": ["비제"],
  // ㅅ
  "생상스": ["생상", "생상쓰"],
  "생상": ["생상스"],
  "생상쓰": ["생상스"],
  "쇤베르크": ["쇠베르크"],
  "쇠베르크": ["쇤베르크"],
  "쇼스타코비치": ["쇼스타코비츠"],
  "쇼스타코비츠": ["쇼스타코비치"],
  "쇼팽": ["쇼팡"],
  "쇼팡": ["쇼팽"],
  "슈만": ["로베르트 슈만"],
  "로베르트 슈만": ["슈만"],
  "슈베르트": ["프란츠 슈베르트"],
  "프란츠 슈베르트": ["슈베르트"],
  "슈트라우스": ["스트라우스"],
  "스트라우스": ["슈트라우스"],
  "스크랴빈": ["스크리아빈"],
  "스크리아빈": ["스크랴빈"],
  "스트라빈스키": ["이고르 스트라빈스키"],
  "이고르 스트라빈스키": ["스트라빈스키"],
  "시벨리우스": ["얀 시벨리우스"],
  "얀 시벨리우스": ["시벨리우스"],
  // ㅇ
  "아르보 패르트": ["아르보패르트"],
  "아르보패르트": ["아르보 패르트"],
  "야나체크": ["야나첵"],
  "야나첵": ["야나체크"],
  "엘가": ["에드워드 엘가"],
  "에드워드 엘가": ["엘가"],
  "이자이": ["외젠 이자이"],
  "외젠 이자이": ["이자이"],
  // ㅊ
  "차이코프스키": ["챠이코프스키", "차이콥스키"],
  "챠이코프스키": ["차이코프스키", "차이콥스키"],
  "차이콥스키": ["차이코프스키", "챠이코프스키"],
  // ㅍ
  "파가니니": ["니콜로 파가니니"],
  "니콜로 파가니니": ["파가니니"],
  "퍼셀": ["퍼씰"],
  "퍼씰": ["퍼셀"],
  "포레": ["가브리엘 포레"],
  "가브리엘 포레": ["포레"],
  "푸치니": ["자코모 푸치니"],
  "자코모 푸치니": ["푸치니"],
  "풀랑크": ["풀랭크"],
  "풀랭크": ["풀랑크"],
  "피아졸라": ["피아솔라"],
  "피아솔라": ["피아졸라"],
  "프랑크": ["세자르 프랑크"],
  "세자르 프랑크": ["프랑크"],
  "프로코피예프": ["프로콥예프"],
  "프로콥예프": ["프로코피예프"],
  // ㅎ
  "하이든": ["요제프 하이든"],
  "요제프 하이든": ["하이든"],
  "하차투리안": ["하차투리얀"],
  "하차투리얀": ["하차투리안"],
  "헨델": ["핸델"],
  "핸델": ["헨델"],
  // 한국 작곡가
  "윤이상": ["윤 이상"],
  "윤 이상": ["윤이상"],
  "진은숙": ["진 은숙"],
  "진 은숙": ["진은숙"],
};

const SEARCH_FIELDS = ["title", "synopsis", "performers", "producer", "venue"] as const;

function buildOrCondition(words: string[]): string {
  return words.flatMap((w) =>
    SEARCH_FIELDS.map((f) => `${f}.ilike.%${w}%`).concat([
      `tags.cs.{${w}}`,
      `ai_keywords.cs.{${w}}`,
    ])
  ).join(",");
}

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

interface Props {
  query: string;
}

export default function ConcertSearchResults({ query }: Props) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;

    const fetchResults = async () => {
      setLoading(true);
      const words = query.trim().split(/\s+/).filter(Boolean);

      const today = new Date();
      const todayDot = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

      let q = supabase
        .from("concerts")
        .select("id, title, poster, venue, start_date, end_date, status")
        .in("status", ["공연예정", "공연중"])
        .gte("end_date", todayDot);

      // 각 단어별로 변형어를 하나의 OR 조건으로 묶고, 단어 간에는 AND 처리
      for (const w of words) {
        const variants = [w, ...(SPELLING_VARIANTS[w] ?? [])];
        q = q.or(buildOrCondition(variants));
      }

      const { data, error } = await q
        .order("start_date", { ascending: true })
        .limit(40);

      if (!error && data) setConcerts(data);
      setLoading(false);
    };

    fetchResults();
  }, [query]);

  if (loading) {
    return (
      <div className="concert-info__search-results">
        <div className="concert-info__cards">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="concert-info__skeleton">
              <div className="concert-info__skeleton-img" />
              <div className="concert-info__skeleton-title" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (concerts.length === 0) {
    return (
      <div className="concert-info__search-results">
        <p className="concert-info__search-empty">
          &ldquo;{query}&rdquo; 검색 결과가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="concert-info__search-results">
      <p className="concert-info__search-count">
        &ldquo;{query}&rdquo; 검색 결과 {concerts.length}건
      </p>
      <div className="concert-info__cards">
        {concerts.map((concert) => (
          <Link key={concert.id} to={`/concert-info/${concert.id}`} state={{ q: query }} className="concert-info__card">
            <div className="concert-info__card-img">
              <img src={concert.poster ?? ""} alt={concert.title ?? ""} />
            </div>
            <p className="concert-info__card-title">{concert.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
