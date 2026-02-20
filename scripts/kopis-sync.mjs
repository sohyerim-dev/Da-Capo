import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KOPIS_API_KEY = process.env.KOPIS_API_KEY;

const KOPIS_BASE = "http://www.kopis.or.kr/openApi/restful/pblprfr";
const GENRE_CODE = "CCCA"; // 서양음악(클래식)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const parser = new XMLParser();

// YYYYMMDD 문자열 반환
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// 2026-01-01부터 오늘+365일까지 31일 청크 배열 생성
function getDateWindows() {
  const windows = [];
  const start = new Date("2026-01-01");

  const end = new Date();
  end.setDate(end.getDate() + 365);

  let cursor = new Date(start);
  while (cursor < end) {
    const windowStart = new Date(cursor);
    const windowEnd = new Date(cursor);
    windowEnd.setDate(windowEnd.getDate() + 30);
    if (windowEnd > end) windowEnd.setTime(end.getTime());

    windows.push({
      stdate: formatDate(windowStart),
      eddate: formatDate(windowEnd),
    });

    cursor.setDate(cursor.getDate() + 31);
  }
  return windows;
}

// KOPIS API 한 페이지 호출
async function fetchPage(stdate, eddate, cpage) {
  const url = new URL(KOPIS_BASE);
  url.searchParams.set("service", KOPIS_API_KEY);
  url.searchParams.set("stdate", stdate);
  url.searchParams.set("eddate", eddate);
  url.searchParams.set("shcate", GENRE_CODE);
  url.searchParams.set("cpage", String(cpage));
  url.searchParams.set("rows", "100");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KOPIS fetch 실패: ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const db = parsed?.dbs?.db;
  if (!db) return [];
  return Array.isArray(db) ? db : [db];
}

// 한 날짜 구간의 모든 페이지 수집
async function fetchWindow(stdate, eddate) {
  const concerts = [];
  let cpage = 1;

  while (true) {
    const items = await fetchPage(stdate, eddate, cpage);
    if (items.length === 0) break;
    concerts.push(...items);
    if (items.length < 100) break;
    cpage++;
  }

  return concerts;
}

// 공연 상세 API 호출 (줄거리, 출연진)
async function fetchDetail(mt20id) {
  const url = `${KOPIS_BASE}/${mt20id}?service=${KOPIS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const db = parsed?.dbs?.db;
  if (!db) return null;
  return Array.isArray(db) ? db[0] : db;
}

// styurls.styurl → 배열로 정규화
function parseIntroImages(detail) {
  const raw = detail?.styurls?.styurl;
  if (!raw) return null;
  return Array.isArray(raw) ? raw : [raw];
}

// relates.relate → [{name, url}] 배열로 정규화
function parseTicketSites(detail) {
  const raw = detail?.relates?.relate;
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((r) => ({ name: r.relatenm, url: r.relateurl }));
}

// KOPIS 응답 → Supabase 행 변환
function toRow(item, detail) {
  return {
    id: item.mt20id,
    title: item.prfnm,
    genre: item.genrenm,
    status: item.prfstate,
    start_date: item.prfpdfrom,
    end_date: item.prfpdto,
    poster: item.poster,
    venue: item.fcltynm,
    area: item.area,
    open_run: item.openrun,
    synopsis: detail?.sty ?? null,
    performers: detail?.prfcast ?? null,
    intro_images: parseIntroImages(detail),
    schedule: detail?.dtguidance ?? null,
    producer: detail?.entrpsnmP ?? null,
    ticket_price: detail?.pcseguidance ?? null,
    crew: detail?.prfcrew ?? null,
    age_limit: detail?.prfage ?? null,
    ticket_sites: parseTicketSites(detail),
    synced_at: new Date().toISOString(),
  };
}

async function main() {
  console.log("KOPIS 동기화 시작");
  const windows = getDateWindows();
  console.log(`날짜 구간: ${windows.length}개`);

  const listItems = [];
  const seen = new Set();

  for (const { stdate, eddate } of windows) {
    console.log(`  구간 ${stdate} ~ ${eddate} 수집 중...`);
    const items = await fetchWindow(stdate, eddate);
    for (const item of items) {
      if (!seen.has(item.mt20id)) {
        seen.add(item.mt20id);
        listItems.push(item);
      }
    }
  }

  console.log(`총 ${listItems.length}건 - 상세 정보 수집 중...`);

  const allRows = [];
  for (let i = 0; i < listItems.length; i++) {
    const item = listItems[i];
    const detail = await fetchDetail(item.mt20id);
    allRows.push(toRow(item, detail));
    if ((i + 1) % 50 === 0) {
      console.log(`  상세 ${i + 1}/${listItems.length} 완료`);
    }
  }

  console.log(`총 ${allRows.length}건 수집 완료`);

  // Supabase upsert (100건씩 배치)
  const BATCH = 100;
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("concerts")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`upsert 실패 (${i}~${i + BATCH}):`, error.message);
    }
  }

  console.log("동기화 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
