import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Concert {
  id: string;
  title: string;
  poster: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
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
      const { data, error } = await supabase
        .from("concerts")
        .select("id, title, poster, venue, start_date, end_date, status")
        .or(`title.ilike.%${query}%,synopsis.ilike.%${query}%,performers.ilike.%${query}%`)
        .in("status", ["공연예정", "공연중"])
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
        <p className="concert-info__search-empty">검색 중...</p>
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
          <div key={concert.id} className="concert-info__card">
            <div className="concert-info__card-img">
              <img src={concert.poster} alt={concert.title} />
            </div>
            <p className="concert-info__card-title">{concert.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
