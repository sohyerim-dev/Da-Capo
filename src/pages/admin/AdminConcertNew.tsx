import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { concertTabData } from "@/data/concertTabData";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import "./AdminConcertNew.scss";

const AREAS = [
  "서울특별시",
  "인천광역시",
  "경기도",
  "부산광역시",
  "대구광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

export default function AdminConcertNew() {
  const navigate = useNavigate();

  // 폼 필드
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [area, setArea] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("공연예정");
  const [performers, setPerformers] = useState("");
  const [producer, setProducer] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [poster, setPoster] = useState("");
  const [ticketSites, setTicketSites] = useState<{ name: string; url: string }[]>([]);

  // 태그
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    title.trim() && venue.trim() && area && startDate && endDate;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setCustomTag("");
  };

  const addTicketSite = () => {
    setTicketSites((prev) => [...prev, { name: "", url: "" }]);
  };

  const updateTicketSite = (
    index: number,
    field: "name" | "url",
    value: string
  ) => {
    setTicketSites((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeTicketSite = (index: number) => {
    setTicketSites((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const id = `custom-${Date.now()}`;
    const toCompact = (iso: string) => iso.replace(/-/g, "");

    const { error: dbError } = await supabase.from("concerts").insert({
      id,
      title: title.trim(),
      venue: venue.trim(),
      area,
      start_date: toCompact(startDate),
      end_date: toCompact(endDate),
      status,
      genre: "서양음악(클래식)",
      performers: performers.trim() || null,
      producer: producer.trim() || null,
      ticket_price: ticketPrice.trim() || null,
      poster: poster.trim() || null,
      ticket_sites: ticketSites.filter((s) => s.name.trim() && s.url.trim()).length > 0
        ? ticketSites.filter((s) => s.name.trim() && s.url.trim())
        : null,
      tags: selectedTags.length > 0 ? selectedTags : null,
      need_review: false,
    });

    if (dbError) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    navigate(`/concert-info/${id}`);
  };

  return (
    <div className="admin-concert-new">
      <div className="wrap">
        <h1 className="admin-concert-new__title">공연 수동 등록</h1>

        <div className="admin-concert-new__form">
          {/* 기본 정보 */}
          <Input
            label="공연명"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공연 제목을 입력하세요"
          />

          <Input
            label="공연장"
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="예: 예술의전당 콘서트홀"
          />

          <div className="input-field">
            <label className="input-field__label">
              지역<span className="input-field__required"> *</span>
            </label>
            <select
              className="admin-concert-new__select"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">선택</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-concert-new__date-row">
            <div className="input-field">
              <label className="input-field__label">
                시작일<span className="input-field__required"> *</span>
              </label>
              <input
                type="date"
                className="admin-concert-new__date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <span className="admin-concert-new__date-sep">~</span>
            <div className="input-field">
              <label className="input-field__label">
                종료일<span className="input-field__required"> *</span>
              </label>
              <input
                type="date"
                className="admin-concert-new__date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="input-field">
            <label className="input-field__label">
              상태<span className="input-field__required"> *</span>
            </label>
            <select
              className="admin-concert-new__select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="공연예정">공연예정</option>
              <option value="공연중">공연중</option>
            </select>
          </div>

          <Input
            label="출연진"
            value={performers}
            onChange={(e) => setPerformers(e.target.value)}
            placeholder="예: 홍길동(피아노), 김철수(바이올린)"
          />

          <Input
            label="기획사"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
          />

          <Input
            label="티켓 가격"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            placeholder="예: R석 100,000원, S석 70,000원"
          />

          <Input
            label="포스터 URL"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="이미지 URL을 입력하세요"
          />

          {/* 예매처 */}
          <div className="input-field">
            <label className="input-field__label">예매처</label>
            <div className="admin-concert-new__ticket-sites">
              {ticketSites.map((site, i) => (
                <div key={i} className="admin-concert-new__ticket-site-row">
                  <input
                    placeholder="예매처명 (예: 인터파크)"
                    value={site.name}
                    onChange={(e) => updateTicketSite(i, "name", e.target.value)}
                  />
                  <input
                    placeholder="URL"
                    value={site.url}
                    onChange={(e) => updateTicketSite(i, "url", e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-concert-new__ticket-site-remove"
                    onClick={() => removeTicketSite(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="admin-concert-new__ticket-site-add"
                onClick={addTicketSite}
              >
                + 예매처 추가
              </Button>
            </div>
          </div>

          {/* 태그 */}
          <div className="admin-concert-new__tags-section">
            <label className="input-field__label">태그</label>

            {selectedTags.length > 0 && (
              <div className="admin-concert-new__tags-selected">
                {selectedTags.map((tag) => (
                  <span key={tag} className="admin-concert-new__tag-chip">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="admin-concert-new__tag-chip-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="admin-concert-new__tags-custom">
              <input
                className="admin-concert-new__tags-custom-input"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="목록에 없는 태그 직접 입력"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
              >
                추가
              </Button>
            </div>

            {concertTabData
              .filter((tab) => !tab.rankOnly)
              .map((tab) => {
                const isOpen = openSections.has(tab.label);
                const tags = tab.items
                  .filter((item) => !item.isSeparator)
                  .map((item) => item.tag ?? item.label);

                return (
                  <div key={tab.label} className="admin-concert-new__tags-group">
                    <button
                      type="button"
                      className={`admin-concert-new__tags-group-header${isOpen ? " admin-concert-new__tags-group-header--open" : ""}`}
                      onClick={() => toggleSection(tab.label)}
                    >
                      {tab.label}
                      <svg
                        viewBox="0 0 10 6"
                        width="10"
                        height="6"
                        className="admin-concert-new__tags-group-arrow"
                      >
                        <path
                          d="M1 1l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="admin-concert-new__tags-group-list">
                        {tags.map((tag) => (
                          <label
                            key={tag}
                            className={`admin-concert-new__tags-group-item${selectedTags.includes(tag) ? " admin-concert-new__tags-group-item--active" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag)}
                              onChange={() => toggleTag(tag)}
                            />
                            {tag}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {error && <p className="admin-concert-new__error">{error}</p>}

          <div className="admin-concert-new__actions">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
            <Button
              disabled={!canSubmit}
              loading={loading}
              onClick={handleSubmit}
            >
              등록하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
