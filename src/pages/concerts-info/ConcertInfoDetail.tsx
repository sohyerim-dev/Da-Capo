import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { supabase } from "../../lib/supabase";
import "./ConcertInfoDetail.scss";

interface TicketSite {
  name: string;
  url: string;
}

const TICKET_SITE_NAMES: Record<string, string> = {
  놀유니버스: "NOL티켓",
};

interface Concert {
  id: string;
  title: string;
  status: string;
  poster: string;
  start_date: string;
  end_date: string;
  venue: string;
  area: string;
  open_run: string | null;
  schedule: string | null;
  age_limit: string | null;
  ticket_price: string | null;
  producer: string | null;
  performers: string | null;
  crew: string | null;
  synopsis: string | null;
  intro_images: string[] | null;
  ticket_sites: TicketSite[] | null;
}

function formatDate(date: string): string {
  if (!date) return date;
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  }
  return date;
}

export default function ConcertInfoDetail() {
  const { id } = useParams<{ id: string }>();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcert = async () => {
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) setConcert(data);
      setLoading(false);
    };

    if (id) fetchConcert();
  }, [id]);

  if (loading) {
    return (
      <div className="concert-detail">
        <div className="wrap">
          <div className="concert-detail__skeleton" />
        </div>
      </div>
    );
  }

  if (!concert) {
    return (
      <div className="concert-detail">
        <div className="wrap">
          <p className="concert-detail__empty">공연 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const dateRange =
    concert.open_run === "Y"
      ? `${formatDate(concert.start_date)} ~ 오픈런`
      : `${formatDate(concert.start_date)} ~ ${formatDate(concert.end_date)}`;

  return (
    <div className="concert-detail">
      <div className="wrap">
        <Link to="/concert-info" state={{ fromDetail: true }} className="concert-detail__back">
          ← 공연 목록
        </Link>

        <div className="concert-detail__top">
          {/* 포스터 */}
          <div className="concert-detail__poster">
            <img src={concert.poster} alt={concert.title} />
          </div>

          {/* 기본 정보 */}
          <div className="concert-detail__info">
            <span
              className={`concert-detail__status concert-detail__status--${
                concert.status === "공연중" ? "ongoing" : "upcoming"
              }`}
            >
              {concert.status}
            </span>
            <h1 className="concert-detail__title">{concert.title}</h1>

            <dl className="concert-detail__meta">
              <div className="concert-detail__meta-row">
                <dt>공연 기간</dt>
                <dd>{dateRange}</dd>
              </div>
              <div className="concert-detail__meta-row">
                <dt>공연장</dt>
                <dd>{concert.venue}</dd>
              </div>
              {concert.area && (
                <div className="concert-detail__meta-row">
                  <dt>지역</dt>
                  <dd>{concert.area}</dd>
                </div>
              )}
              {concert.schedule && (
                <div className="concert-detail__meta-row">
                  <dt>일정</dt>
                  <dd>{concert.schedule}</dd>
                </div>
              )}
              {concert.age_limit && (
                <div className="concert-detail__meta-row">
                  <dt>관람 연령</dt>
                  <dd>{concert.age_limit}</dd>
                </div>
              )}
              {concert.ticket_price && (
                <div className="concert-detail__meta-row">
                  <dt>티켓 가격</dt>
                  <dd>{concert.ticket_price}</dd>
                </div>
              )}
              {concert.producer && (
                <div className="concert-detail__meta-row">
                  <dt>제작사</dt>
                  <dd>{concert.producer}</dd>
                </div>
              )}
            </dl>

            {/* 예매처 */}
            {concert.ticket_sites && concert.ticket_sites.length > 0 && (
              <div className="concert-detail__tickets">
                {concert.ticket_sites.map((site) => (
                  <a
                    key={site.name}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="concert-detail__ticket-btn"
                  >
                    {TICKET_SITE_NAMES[site.name] ?? site.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 출연진 */}
        {concert.performers && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">출연진</h2>
            <p className="concert-detail__section-text">{concert.performers}</p>
          </div>
        )}

        {/* 제작진 */}
        {concert.crew && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">제작진</h2>
            <p className="concert-detail__section-text">{concert.crew}</p>
          </div>
        )}

        {/* 소개 */}
        {concert.synopsis && (
          <div className="concert-detail__section">
            <h2 className="concert-detail__section-title">소개</h2>
            <p className="concert-detail__section-text">{concert.synopsis}</p>
          </div>
        )}

        {/* 소개 이미지 */}
        {concert.intro_images && concert.intro_images.length > 0 && (
          <div className="concert-detail__intro-images">
            {concert.intro_images.map((url, i) => (
              <img key={i} src={url} alt={`소개 이미지 ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
