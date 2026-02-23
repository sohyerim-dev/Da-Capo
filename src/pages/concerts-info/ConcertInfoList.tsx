import { useState } from "react";
import { useSearchParams } from "react-router";
import ConcertBrowse from "./ConcertBrowse";
import ConcertSearchResults from "./ConcertSearchResults";
import "./ConcertInfoList.scss";

export default function ConcertInfoList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(search);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="concert-info">
      <div className="wrap">
        <h1 className="concert-info__title">공연 정보 찾기</h1>

        {/* 검색 */}
        <div className="concert-info__search">
          <input
            type="text"
            className="concert-info__search-input"
            placeholder="검색하기"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="concert-info__search-btn" aria-label="검색" onClick={handleSearch}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {search ? <ConcertSearchResults query={search} /> : <ConcertBrowse />}

        <p className="concert-info__kopis-notice">
          본 서비스는 공연예술통합전산망(KOPIS)의 공공데이터를 활용하여 개발되었습니다.
        </p>
      </div>
    </div>
  );
}
