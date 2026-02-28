import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KOPIS_API_KEY = process.env.KOPIS_API_KEY;

const KOPIS_BASE = "http://www.kopis.or.kr/openApi/restful/pblprfr";
const KOPIS_BOXOFFICE = "http://www.kopis.or.kr/openApi/restful/boxoffice";
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
  if (!res.ok) {
    const body = await res.text();
    console.error(`KOPIS fetch 실패: ${res.status}`, body);
    console.error("요청 URL:", url.toString());
    throw new Error(`KOPIS fetch 실패: ${res.status}`);
  }
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

// 박스오피스 API 호출 → [{mt20id, rnum}] 반환
async function fetchBoxoffice() {
  const now = new Date();
  const eddate = formatDate(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const stdate = formatDate(start);

  const url = new URL(KOPIS_BOXOFFICE);
  url.searchParams.set("service", KOPIS_API_KEY);
  url.searchParams.set("stdate", stdate);
  url.searchParams.set("eddate", eddate);
  url.searchParams.set("catecode", GENRE_CODE);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.warn(`박스오피스 API 실패: ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const db = parsed?.boxofs?.boxof;
  if (!db) return [];
  const list = Array.isArray(db) ? db : [db];
  return list.map((item) => ({
    mt20id: String(item.mt20id),
    rnum: Number(item.rnum),
  }));
}

// KOPIS 응답 → Supabase 행 변환
function toRow(item, detail) {
  const row = {
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
    synced_at: new Date().toISOString(),
  };

  if (detail) {
    row.synopsis = detail.sty ?? null;
    row.performers = detail.prfcast ?? null;
    row.intro_images = parseIntroImages(detail);
    row.schedule = detail.dtguidance ?? null;
    row.producer = detail.entrpsnmP ?? null;
    row.ticket_price = detail.pcseguidance ?? null;
    row.crew = detail.prfcrew ?? null;
    row.age_limit = detail.prfage ?? null;
    row.ticket_sites = parseTicketSites(detail);
  }

  return row;
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
    const batchIds = batch.map((r) => r.id);

    // 이미 태그가 있는 기존 공연 ID 조회 (upsert 후 need_review 표시용)
    const { data: existingTagged } = await supabase
      .from("concerts")
      .select("id")
      .in("id", batchIds)
      .not("tags", "is", null);
    const taggedIds = (existingTagged ?? []).map((r) => r.id);

    const { error } = await supabase
      .from("concerts")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`upsert 실패 (${i}~${i + BATCH}):`, error.message);
      continue;
    }

    // 태그가 있던 공연이 업데이트됐으면 need_review = true
    if (taggedIds.length > 0) {
      await supabase
        .from("concerts")
        .update({ need_review: true })
        .in("id", taggedIds);
      console.log(`  태그 재검수 표시: ${taggedIds.length}건`);
    }
  }

  // 박스오피스 순위 업데이트
  console.log("박스오피스 순위 업데이트 중...");
  const boxofficeList = await fetchBoxoffice();
  console.log(`박스오피스 ${boxofficeList.length}건`);

  if (boxofficeList.length > 0) {
    // 기존 순위 초기화
    await supabase.from("concerts").update({ rank: null }).not("rank", "is", null);

    // 새 순위 반영
    for (const { mt20id, rnum } of boxofficeList) {
      await supabase.from("concerts").update({ rank: rnum }).eq("id", mt20id);
    }
    console.log("순위 업데이트 완료");
  }

  // 제목 기반 출연진 자동 보정
  console.log("출연진 자동 보정 중...");
  const PERFORMER_RULES = [
    { patterns: ["%서울시향%", "%서울시립교향악단%"], name: "서울시립교향악단" },
    { patterns: ["%인천시향%", "%인천시립교향악단%"], name: "인천시립교향악단" },
    { patterns: ["%대전시립교향악단%"], name: "대전시립교향악단" },
    { patterns: ["%국립심포니오케스트라%"], name: "국립심포니오케스트라" },
    { patterns: ["%경기필하모닉%", "%경기필%"], name: "경기필하모닉" },
    { patterns: ["%KBS교향악단%"], name: "KBS교향악단" },
    { patterns: ["%고잉홈프로젝트%"], name: "고잉홈프로젝트" },
  ];

  let fixCount = 0;
  for (const rule of PERFORMER_RULES) {
    for (const pattern of rule.patterns) {
      const { data } = await supabase
        .from("concerts")
        .select("id, performers")
        .ilike("title", pattern);

      if (!data) continue;

      for (const concert of data) {
        if (concert.performers?.includes(rule.name)) continue;
        const newPerformers = !concert.performers
          ? rule.name
          : `${rule.name}, ${concert.performers}`;
        await supabase
          .from("concerts")
          .update({ performers: newPerformers })
          .eq("id", concert.id);
        fixCount++;
      }
    }
  }
  console.log(`출연진 보정 완료: ${fixCount}건`);

  console.log("동기화 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
