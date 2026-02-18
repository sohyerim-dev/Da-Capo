import { useState } from "react";
import ConcertBrowse from "./ConcertBrowse";
import ConcertSearchResults from "./ConcertSearchResults";
import "./ConcertInfoList.scss";

export default function ConcertInfoList() {
  const [search, setSearch] = useState("");

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="concert-info__search-btn" aria-label="검색">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {search ? <ConcertSearchResults query={search} /> : <ConcertBrowse />}
      </div>
    </div>
  );
}
