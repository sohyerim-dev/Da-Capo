import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import "./MagazineDetail.scss";

interface Concert {
  id: string;
  title: string | null;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface MagazinePost {
  id: number;
  title: string;
  category: string;
  content: string;
  author_nickname: string;
  view_count: number | null;
  created_at: string | null;
}

const CATEGORY_SLUG: Record<string, string> = {
  "공지": "notice",
  "큐레이터 픽": "curator",
  "클래식 읽기": "reading",
  "기타": "etc",
};

function formatDate(str: string): string {
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}.${str.slice(4, 6)}.${str.slice(6, 8)}`;
  }
  if (/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(str)) {
    return `${str.slice(0, 4)}.${str.slice(5, 7)}.${str.slice(8, 10)}`;
  }
  const d = new Date(str.replace(" ", "T"));
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function MagazineDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [post, setPost] = useState<MagazinePost | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: postData, error } = await supabase
        .from("magazine_posts")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(postData);

      // 조회수 증가
      await supabase.rpc("increment_view_count", { p_post_id: Number(id) });

      // 첨부 공연 조회
      const { data: concertLinks } = await supabase
        .from("magazine_concerts")
        .select("concert_id, display_order")
        .eq("post_id", Number(id))
        .order("display_order", { ascending: true });

      if (concertLinks && concertLinks.length > 0) {
        const concertIds = concertLinks.map((c) => c.concert_id);
        const { data: concertData } = await supabase
          .from("concerts")
          .select("id, title, poster, start_date, end_date")
          .in("id", concertIds);

        if (concertData) {
          // display_order 순서 유지
          const ordered = concertLinks
            .map((link) => concertData.find((c) => c.id === link.concert_id))
            .filter((c): c is Concert => !!c);
          setConcerts(ordered);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from("magazine_posts")
      .delete()
      .eq("id", Number(id));
    setDeleteLoading(false);
    if (!error) {
      navigate("/magazine");
    }
  };

  if (loading) {
    return (
      <div className="magazine-detail-page">
        <div className="wrap magazine-detail-page__inner">
          <div className="magazine-detail-page__skeleton-badge" />
          <div className="magazine-detail-page__skeleton-title" />
          <div className="magazine-detail-page__skeleton-title-sm" />
          <div className="magazine-detail-page__skeleton-meta" />
          <hr className="magazine-detail-page__divider" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="magazine-detail-page__skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="magazine-detail-page">
        <div className="wrap magazine-detail-page__not-found">
          <p>존재하지 않는 글입니다.</p>
          <Link to="/magazine">목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="magazine-detail-page">
      <div className="wrap magazine-detail-page__inner">
        <div className="magazine-detail-page__meta-top">
          <Link to="/magazine" className="magazine-detail-page__back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            목록
          </Link>
        </div>

        <span className={`magazine-detail-page__badge magazine-detail-page__badge--${CATEGORY_SLUG[post.category] ?? "etc"}`}>
          {post.category}
        </span>
        <h1 className="magazine-detail-page__title">{post.title}</h1>
        <div className="magazine-detail-page__info">
          <span>{post.author_nickname}</span>
          <span>·</span>
          <span>{post.created_at ? formatDate(post.created_at) : ""}</span>
          <span>·</span>
          <span>조회 {(post.view_count ?? 0).toLocaleString()}</span>
        </div>

        <hr className="magazine-detail-page__divider" />

        <div
          className="magazine-detail-page__content tiptap-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {concerts.length > 0 && (
          <div className="magazine-detail-page__concerts">
            <h2 className="magazine-detail-page__concerts-title">
              연결된 공연
            </h2>
            <div className="magazine-detail-page__concerts-list">
              {concerts.map((concert) => (
                <Link
                  key={concert.id}
                  to={`/concert-info/${concert.id}`}
                  className="magazine-concert-card"
                >
                  {concert.poster && (
                    <img
                      src={concert.poster}
                      alt={concert.title ?? ""}
                      className="magazine-concert-card__poster"
                    />
                  )}
                  <div className="magazine-concert-card__info">
                    <p className="magazine-concert-card__title">
                      {concert.title}
                    </p>
                    <p className="magazine-concert-card__date">
                      {concert.start_date ? formatDate(concert.start_date) : ""}
                      {concert.end_date !== concert.start_date && concert.end_date &&
                        ` ~ ${formatDate(concert.end_date)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {user?.role === "admin" && (
          <div className="magazine-detail-page__admin-actions">
            <button
              className="magazine-detail-page__action-btn"
              onClick={() => navigate(`/magazine/${id}/edit`)}
            >
              수정
            </button>
            <button
              className="magazine-detail-page__action-btn magazine-detail-page__action-btn--delete"
              onClick={() => setShowDeleteConfirm(true)}
            >
              삭제
            </button>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="magazine-detail-page__modal-overlay" onClick={() => !deleteLoading && setShowDeleteConfirm(false)}>
            <div className="magazine-detail-page__delete-confirm" onClick={(e) => e.stopPropagation()}>
              <p className="magazine-detail-page__delete-confirm-title">글을 삭제하시겠습니까?</p>
              <p className="magazine-detail-page__delete-confirm-desc">삭제 후 복구할 수 없습니다.</p>
              <div className="magazine-detail-page__delete-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                >
                  취소
                </button>
                <button
                  className="magazine-detail-page__delete-confirm-btn"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
