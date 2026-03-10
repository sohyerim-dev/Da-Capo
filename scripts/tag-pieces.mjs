import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error(
    "환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY 가 필요합니다."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// tag-concerts.mjs 와 동일한 TAXONOMY (곡 추출에도 같은 정규명 사용)
const COMPOSERS = [
  "코렐리", "퍼셀", "비발디", "텔레만", "바흐", "헨델",
  "글루크", "하이든", "모차르트", "베토벤",
  "베버", "파가니니", "로시니", "도니제티", "벨리니", "슈베르트",
  "베를리오즈", "멘델스존", "슈만", "쇼팽", "리스트",
  "바그너", "베르디", "브루흐", "브람스", "브루크너", "보로딘",
  "생상스", "프랑크", "비제", "포레", "무소르그스키", "차이코프스키",
  "드보르자크", "마스네", "그리그", "림스키코르사코프", "엘가",
  "푸치니", "말러", "슈트라우스", "시벨리우스", "닐센",
  "드뷔시", "스크랴빈", "라흐마니노프", "라벨", "야나체크",
  "레스피기", "바르톡", "스트라빈스키", "프로코피예프", "힌데미트", "거슈윈",
  "쇼스타코비치", "메시앙", "번스타인", "윤이상", "아르보 패르트", "진은숙",
];

const ERAS = ["바로크", "고전", "초기 낭만", "후기 낭만", "근대", "현대"];

const WORK_TYPES = [
  "관현악", "교향곡", "협주곡", "실내악", "독주곡",
  "성악곡", "합창곡", "오페라", "발레", "음악극", "가곡", "영화음악",
];

const INSTRUMENTS = [
  "피아노", "바이올린", "비올라", "첼로", "플루트", "오보에",
  "클라리넷", "바순", "호른", "트럼펫", "트롬본", "튜바",
  "하프", "더블베이스", "오르간", "클래식 기타", "성악", "관악", "타악", "오케스트라",
];

const ERA_MAP = {
  바로크: ["코렐리", "퍼셀", "비발디", "텔레만", "바흐", "헨델"],
  고전: ["글루크", "하이든", "모차르트", "베토벤"],
  "초기 낭만": ["베버", "파가니니", "로시니", "도니제티", "벨리니", "슈베르트", "베를리오즈", "멘델스존", "슈만", "쇼팽", "리스트"],
  "후기 낭만": ["바그너", "베르디", "브루흐", "브람스", "브루크너", "보로딘", "생상스", "프랑크", "비제", "포레", "무소르그스키", "차이코프스키", "드보르자크", "마스네", "그리그", "림스키코르사코프", "엘가", "푸치니", "말러", "슈트라우스", "시벨리우스", "닐센"],
  근대: ["드뷔시", "스크랴빈", "라흐마니노프", "라벨", "야나체크", "레스피기", "바르톡", "스트라빈스키", "프로코피예프", "힌데미트", "거슈윈"],
  현대: ["쇼스타코비치", "메시앙", "번스타인", "윤이상", "아르보 패르트", "진은숙"],
};

const COMPOSER_ALIASES = {
  무소륵스키: "무소르그스키", 무쏘르그스키: "무소르그스키",
  차이콥스키: "차이코프스키",
  "리하르트 슈트라우스": "슈트라우스", "R. 슈트라우스": "슈트라우스", "R.슈트라우스": "슈트라우스",
  드보르작: "드보르자크", 드보르짝: "드보르자크",
  쇼스타코비츠: "쇼스타코비치",
  프로코피에프: "프로코피예프",
  스크리아빈: "스크랴빈",
  바르토크: "바르톡", 버르톡: "바르톡",
  시벨류스: "시벨리우스",
  야나첵: "야나체크",
  "림스키 코르사코프": "림스키코르사코프",
};

const COMPOSER_SET = new Set(COMPOSERS);
const ERA_SET = new Set(ERAS);
const WORK_TYPE_SET = new Set(WORK_TYPES);
const INSTRUMENT_SET = new Set(INSTRUMENTS);

const TEXT_BATCH_SIZE = 8;

function normalizeComposer(name) {
  return COMPOSER_ALIASES[name] ?? name;
}

function resolveEra(composer) {
  for (const [era, list] of Object.entries(ERA_MAP)) {
    if (list.includes(composer)) return era;
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractText(response) {
  return response?.choices?.[0]?.message?.content?.trim() ?? "";
}

function extractJsonArray(text) {
  if (!text) return null;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function withRetry(fn, { tries = 4, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);
      const msgLower = msg.toLowerCase();
      const status = e?.status ?? e?.statusCode ?? 0;
      const shouldRetry =
        status === 429 || status >= 500 ||
        msgLower.includes("rate") || msgLower.includes("timeout") ||
        msgLower.includes("econn") || msgLower.includes("enotfound") ||
        msgLower.includes("overloaded");
      if (!shouldRetry || i === tries - 1) break;
      let delay = baseDelayMs * Math.pow(2, i);
      const retryMatch = msg.match(/try again in (\d+\.?\d*)s/i);
      if (retryMatch) {
        delay = Math.max(delay, Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500);
      }
      console.log(`  재시도 ${i + 1}/${tries - 1} (${(delay / 1000).toFixed(1)}초 대기)...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function fetchImageAsBase64(url) {
  try {
    return await withRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      const resized = await sharp(Buffer.from(buffer))
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
    }, { tries: 2, baseDelayMs: 400 });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// 프롬프트
// ─────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 "클래식 공연 곡 추출기"입니다.
주어진 공연 정보(제목/출연/시놉시스/이미지 텍스트)에서 **개별 곡(작품)** 목록을 추출하고,
각 곡에 시대/작곡가/악기/작품형태를 태깅합니다.

절대 규칙:
- 이미지는 처음부터 끝까지 빠짐없이 읽으세요. 상단, 중간, 하단 모든 영역을 확인하세요. 일부만 읽고 나머지를 추측하는 것은 금지입니다.
- 추측 금지: 텍스트/이미지에 직접 표기되지 않은 곡을 절대 넣지 마세요.
- 곡 번호(Op., No., BWV, K., 번 등)가 원문에 명시되어 있을 때만 제목에 포함하세요.
  원문에 번호가 없으면 번호 없이 기록하세요. (예: 원문이 "피아노 협주곡"이면 → "피아노 협주곡", 절대 "피아노 협주곡 5번"처럼 번호를 붙이지 마세요)
- 곡 제목은 공연 정보에 표기된 그대로 작성하세요. 부제/별칭도 원문에 있을 때만 포함.
- 공연 정보에 없는 곡을 절대 추가하지 마세요. 추측하여 곡을 만들어내는 것은 금지입니다.
- 출력은 JSON만: 설명/문장/마크다운 없이 JSON만.
- 작곡가가 아래 목록에 없으면 그대로 한글 정규명으로 기록.

작곡가 정규명 목록:
${COMPOSERS.join(", ")}

작곡가 표기 변형 (동일 인물):
${Object.entries(COMPOSER_ALIASES).map(([k, v]) => `${k} → ${v}`).join(", ")}

시대 목록: ${ERAS.join(", ")}

시대-작곡가 매핑:
${Object.entries(ERA_MAP).map(([era, list]) => `${era}: ${list.join(", ")}`).join("\n")}

작품형태 목록: ${WORK_TYPES.join(", ")}

악기 목록: ${INSTRUMENTS.join(", ")}

추출 규칙:
1. 프로그램에 나열된 모든 곡을 개별적으로 추출하세요.
2. 각 곡의 작곡가를 정규명으로 기록하고, 매핑 테이블에서 시대를 자동 결정하세요.
3. 작품형태는 곡의 성격에 따라 하나만 선택.
4. 악기는 해당 곡의 주요 독주/편성 악기. 오케스트라 곡이면 ["오케스트라"], 협주곡이면 ["피아노", "오케스트라"] 등.
5. 곡 제목은 원문 그대로(한글/영문 혼용 가능). 번호·부제는 원문에 있을 때만.
6. 곡을 특정할 수 없는 공연(갈라, "명곡 모음" 등)은 확인 가능한 곡만 넣고 나머지는 무시.
7. 이미지에 여러 날짜 프로그램이 있으면, 해당 공연의 기간에 맞는 것만.

반환 형식 (공연 ID를 키로 하는 객체, 값은 곡 배열):
{
  "PF123": [
    {
      "title": "피아노 협주곡 5번 '황제'",
      "composer": "베토벤",
      "era": "고전",
      "work_type": "협주곡",
      "instruments": ["피아노", "오케스트라"]
    }
  ]
}

곡이 없거나 추출할 수 없으면 빈 배열: { "PF123": [] }`;

function buildTextPrompt(concerts) {
  return concerts
    .map(
      (c) =>
        `[${c.id}]\n제목: ${c.title || ""}\n출연: ${c.performers || ""}\n제작: ${c.producer || ""}\n내용: ${c.synopsis || ""}`
    )
    .join("\n\n");
}

// ─────────────────────────────────────────
// AI 호출
// ─────────────────────────────────────────

async function extractPiecesText(concerts) {
  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildTextPrompt(concerts) },
      ],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 700 });
  const text = extractText(response);
  const parsed = extractJsonObject(text);

  if (!parsed) {
    console.warn("JSON 파싱 실패:", (text || "").slice(0, 140));
    return Object.fromEntries(concerts.map((c) => [c.id, []]));
  }

  // 결과를 concert id로 매핑
  const result = {};
  for (const c of concerts) {
    const val = parsed[c.id];
    result[c.id] = Array.isArray(val) ? val : [];
  }
  return result;
}

async function extractPiecesImage(concert) {
  const imageUrls = (concert.intro_images ?? []).slice(0, 3);
  if (imageUrls.length === 0) return { [concert.id]: [] };

  const imgDataList = (
    await Promise.all(imageUrls.map(fetchImageAsBase64))
  ).filter(Boolean);

  if (imgDataList.length === 0) {
    console.warn(`  이미지 fetch 실패, 텍스트로 대체: ${concert.id}`);
    return await extractPiecesText([concert]);
  }

  const imageBlocks = imgDataList.map((img) => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }));

  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `공연 ID: ${concert.id}\n제목: ${concert.title || ""}\n출연: ${concert.performers || ""}\n제작: ${concert.producer || ""}\n공연 기간: ${concert.start_date || ""} ~ ${concert.end_date || ""}\n\n중요: 이미지를 처음부터 끝까지 빠짐없이 읽으세요. 이미지 상단, 중간, 하단 모든 영역의 텍스트를 확인하세요. 일부만 읽고 나머지를 추측하지 마세요.\n이미지에 실제로 적혀있는 곡만 추출하세요. 이미지에서 읽을 수 없거나 불확실한 곡은 포함하지 마세요.\n공연 기간에 해당하는 프로그램만 태깅하세요.`,
            },
          ],
        },
      ],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 700 });
  const text = extractText(response);
  const parsed = extractJsonObject(text);

  if (!parsed) {
    console.warn(`이미지 JSON 파싱 실패, 텍스트 대체: ${concert.id}`);
    return await extractPiecesText([concert]);
  }

  const val = parsed[concert.id];
  return { [concert.id]: Array.isArray(val) ? val : [] };
}

// ─────────────────────────────────────────
// 후처리 & 저장
// ─────────────────────────────────────────

function validatePiece(raw) {
  if (!raw || typeof raw !== "object") return null;

  const composer = normalizeComposer(raw.composer || "");
  const era = ERA_SET.has(raw.era) ? raw.era : resolveEra(composer);
  const workType = WORK_TYPE_SET.has(raw.work_type) ? raw.work_type : null;
  const instruments = Array.isArray(raw.instruments)
    ? raw.instruments.filter((i) => INSTRUMENT_SET.has(i))
    : [];

  // 최소한 작곡가 또는 작품형태가 있어야 유의미
  if (!composer && !workType) return null;

  return {
    title: raw.title || null,
    composer: composer || null,
    era: era || null,
    work_type: workType,
    instruments,
  };
}

async function savePieces(concertId, rawPieces) {
  const pieces = rawPieces.map(validatePiece).filter(Boolean);
  if (pieces.length === 0) return 0;

  const rows = pieces.map((p) => ({
    concert_id: concertId,
    title: p.title,
    composer: p.composer,
    era: p.era,
    work_type: p.work_type,
    instruments: p.instruments,
  }));

  const { error } = await supabase.from("pieces").insert(rows);
  if (error) {
    console.error(`  DB insert 실패 ${concertId}:`, error.message);
    return 0;
  }
  return pieces.length;
}

// ─────────────────────────────────────────
// 메인
// ─────────────────────────────────────────

async function main() {
  console.log("곡 추출 시작 (gpt-4o)...");

  // pieces가 아직 없는 공연예정/공연중 공연 조회
  const { data: allConcerts, error: concertErr } = await supabase
    .from("concerts")
    .select("id, title, synopsis, performers, producer, intro_images, start_date, end_date")
    .in("status", ["공연예정", "공연중"]);

  if (concertErr) throw concertErr;

  // 이미 pieces가 있는 concert_id 목록
  const { data: existingPieces, error: pieceErr } = await supabase
    .from("pieces")
    .select("concert_id");

  if (pieceErr) throw pieceErr;

  const doneIds = new Set((existingPieces ?? []).map((p) => p.concert_id));
  const list = (allConcerts ?? []).filter((c) => !doneIds.has(c.id));

  console.log(`곡 추출할 공연: ${list.length}건 (이미 완료: ${doneIds.size}건)`);

  const textConcerts = list.filter((c) => c.synopsis?.trim());
  const imageConcerts = list.filter(
    (c) => !c.synopsis?.trim() && (c.intro_images?.length ?? 0) > 0
  );
  const nothingConcerts = list.filter(
    (c) => !c.synopsis?.trim() && (c.intro_images?.length ?? 0) === 0
  );

  console.log(
    `텍스트: ${textConcerts.length}건 | 이미지: ${imageConcerts.length}건 | 정보없음: ${nothingConcerts.length}건`
  );

  let totalPieces = 0;
  let emptyConcerts = 0;
  let fail = 0;

  // 1) 텍스트 + 정보없음: 배치 처리
  const allTextConcerts = [...textConcerts, ...nothingConcerts];

  for (let i = 0; i < allTextConcerts.length; i += TEXT_BATCH_SIZE) {
    const batch = allTextConcerts.slice(i, i + TEXT_BATCH_SIZE);
    console.log(
      `[텍스트] ${i + 1}~${Math.min(i + TEXT_BATCH_SIZE, allTextConcerts.length)} / ${allTextConcerts.length}`
    );

    try {
      const result = await extractPiecesText(batch);

      for (const concert of batch) {
        const rawPieces = result[concert.id] ?? [];

        // 텍스트로 곡이 안 나오고 이미지가 있으면 이미지로 재시도
        if (rawPieces.length === 0 && (concert.intro_images?.length ?? 0) > 0) {
          try {
            console.log(`  이미지로 재시도: ${concert.title || concert.id}`);
            const imgResult = await extractPiecesImage(concert);
            const imgPieces = imgResult[concert.id] ?? [];
            const saved = await savePieces(concert.id, imgPieces);
            totalPieces += saved;
            if (saved === 0) emptyConcerts++;
            continue;
          } catch {
            // 이미지도 실패 시 아래에서 빈 배열 저장
          }
        }

        const saved = await savePieces(concert.id, rawPieces);
        totalPieces += saved;
        if (saved === 0) emptyConcerts++;
      }
    } catch (e) {
      console.error(`텍스트 배치 실패:`, e?.message || e);
      fail += batch.length;
    }

    await sleep(3000);
  }

  // 2) 이미지: 1건씩 처리
  for (let i = 0; i < imageConcerts.length; i++) {
    const concert = imageConcerts[i];

    if (i === 0 || (i + 1) % 20 === 0) {
      console.log(`[이미지] ${i + 1} / ${imageConcerts.length}`);
    }

    try {
      const result = await extractPiecesImage(concert);
      const rawPieces = result[concert.id] ?? [];
      const saved = await savePieces(concert.id, rawPieces);
      totalPieces += saved;
      if (saved === 0) emptyConcerts++;
    } catch (e) {
      console.error(`이미지 추출 실패 ${concert.id}:`, e?.message || e);
      fail++;
    }

    await sleep(4000);
  }

  console.log(
    `\n완료: ${totalPieces}개 곡 추출, 빈 공연 ${emptyConcerts}건, 실패 ${fail}건`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
