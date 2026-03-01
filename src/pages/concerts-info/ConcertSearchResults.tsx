import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";

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

      let q = supabase
        .from("concerts")
        .select("id, title, poster, venue, start_date, end_date, status")
        .in("status", ["공연예정", "공연중"]);

      for (const w of words) {
        q = q.or(
          `title.ilike.%${w}%,synopsis.ilike.%${w}%,performers.ilike.%${w}%,producer.ilike.%${w}%,venue.ilike.%${w}%,tags.cs.{${w}},ai_keywords.cs.{${w}}`
        );
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
