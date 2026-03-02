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

// tag-concerts.mjs 와 동일한 TAXONOMY
const TAXONOMY = {
  작곡가: [
    "코렐리", "퍼셀", "비발디", "텔레만", "바흐", "헨델",
    "글루크", "하이든", "모차르트", "베토벤",
    "베버", "파가니니", "로시니", "도니제티", "벨리니", "슈베르트",
    "베를리오즈", "멘델스존", "슈만", "쇼팽", "리스트",
    "바그너", "베르디", "브루흐", "브람스", "브루크너", "보로딘",
    "생상스", "프랑크", "비제", "포레", "무소르그스키", "차이코프스키",
    "드보르자크", "마스네", "그리그", "림스키코르사코프", "엘가", "푸치니",
    "말러", "슈트라우스", "시벨리우스", "닐센",
    "드뷔시", "스크랴빈", "라흐마니노프", "라벨", "야나체크", "레스피기",
    "바르톡", "스트라빈스키", "프로코피예프", "힌데미트", "거슈윈",
    "쇼스타코비치", "메시앙", "번스타인", "윤이상", "아르보 패르트", "진은숙",
  ],
  작품형태: [
    "관현악", "교향곡", "협주곡", "실내악", "독주곡", "성악곡",
    "합창곡", "오페라", "발레", "음악극", "가곡", "영화음악",
  ],
  악기: [
    "피아노", "바이올린", "비올라", "첼로", "플루트", "오보에",
    "클라리넷", "바순", "호른", "트럼펫", "트롬본", "튜바",
    "하프", "더블베이스", "오르간", "클래식 기타", "성악", "관악", "타악",
    "오케스트라",
  ],
  시대: ["바로크", "고전", "초기 낭만", "후기 낭만", "근대", "현대"],
  출연: [
    "금난새", "김다미", "김봄소리", "김선욱", "김송현", "김정원",
    "문지영", "문태국", "박재홍", "박혜상", "백건우", "사무엘 윤",
    "선우예권", "손민수", "손열음", "신지아", "양성원", "양인모",
    "임선혜", "임윤찬", "임지영", "임현정",
    "장한나", "정경화", "정명화", "정명훈", "조성진", "조수미",
    "클라라 주미 강", "홍혜란", "황수미",
    "KBS교향악단", "경기필하모닉", "고잉홈프로젝트", "국립심포니오케스트라",
    "국립합창단", "콜레기움 무지쿰 서울", "콜레기움 보칼레 서울",
    "대전시립교향악단", "부천필하모닉오케스트라", "서울모테트합창단",
    "서울시립교향악단", "인천시립교향악단",
    "해외 연주자", "해외 단체",
  ],
};

const COMPOSER_ALIASES = {
  무소륵스키: "무소르그스키",
  무쏘르그스키: "무소르그스키",
  차이콥스키: "차이코프스키",
  "리하르트 슈트라우스": "슈트라우스",
  "R. 슈트라우스": "슈트라우스",
  "R.슈트라우스": "슈트라우스",
  드보르작: "드보르자크",
  드보르짝: "드보르자크",
  쇼스타코비츠: "쇼스타코비치",
  프로코피에프: "프로코피예프",
  스크리아빈: "스크랴빈",
  바르토크: "바르톡",
  버르톡: "바르톡",
  시벨류스: "시벨리우스",
  야나첵: "야나체크",
  "림스키 코르사코프": "림스키코르사코프",
};

const ALL_TAGS = new Set(Object.values(TAXONOMY).flat());
const COMPOSER_SET = new Set(TAXONOMY["작곡가"]);

const ERA_MAP = {
  바로크: ["코렐리", "퍼셀", "비발디", "텔레만", "바흐", "헨델"],
  고전: ["글루크", "하이든", "모차르트", "베토벤"],
  "초기 낭만": [
    "베버", "파가니니", "로시니", "도니제티", "벨리니", "슈베르트",
    "베를리오즈", "멘델스존", "슈만", "쇼팽", "리스트",
  ],
  "후기 낭만": [
    "바그너", "베르디", "브루흐", "브람스", "브루크너", "보로딘",
    "생상스", "프랑크", "비제", "포레", "무소르그스키", "차이코프스키",
    "드보르자크", "마스네", "그리그", "림스키코르사코프", "엘가", "푸치니",
    "말러", "슈트라우스", "시벨리우스", "닐센",
  ],
  근대: [
    "드뷔시", "스크랴빈", "라흐마니노프", "라벨", "야나체크", "레스피기",
    "바르톡", "스트라빈스키", "프로코피예프", "힌데미트", "거슈윈",
  ],
  현대: ["쇼스타코비치", "메시앙", "번스타인", "윤이상", "아르보 패르트", "진은숙"],
};

const KNOWN_COMPOSER_ERAS = {
  바로크: ["타르티니", "알비노니", "제미니아니"],
  고전: ["보케리니"],
  "초기 낭만": ["글린카", "이자이"],
  "후기 낭만": [
    "요한 슈트라우스", "슈트라우스 2세", "사라사테",
    "비에니아프스키", "스메타나", "글라주노프",
  ],
  근대: [
    "크라이슬러", "홀스트", "글리에르", "데 파야",
    "코플랜드", "하차투리안", "카발레프스키", "빌라로보스",
  ],
  현대: ["피아졸라", "쿠르탁", "리게티", "펜데레츠키", "구바이둘리나", "히나데라"],
};

// --------------- 유틸리티 ---------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, { tries = 3, baseDelayMs = 2000 } = {}) {
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
        msgLower.includes("econn") || msgLower.includes("enotfound");
      if (!shouldRetry || i === tries - 1) break;
      let delay = baseDelayMs * Math.pow(2, i);
      const retryMatch = msg.match(/try again in (\d+\.?\d*)s/i);
      if (retryMatch) {
        const retryAfter = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
        delay = Math.max(delay, retryAfter);
      }
      console.log(`  재시도 ${i + 1}/${tries - 1} (${(delay / 1000).toFixed(1)}초 대기)...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

function extractText(response) {
  return response?.choices?.[0]?.message?.content?.trim() ?? "";
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

async function fetchImageAsBase64(url) {
  const attempt = async () => {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const resized = await sharp(Buffer.from(buffer))
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
  };
  try {
    return await withRetry(attempt, { tries: 2, baseDelayMs: 400 });
  } catch {
    return null;
  }
}

// --------------- OCR: 이미지에서 텍스트 추출 ---------------

async function ocrImages(imageUrls) {
  const urls = (imageUrls ?? []).slice(0, 3);
  if (urls.length === 0) return "";

  const imgDataList = (await Promise.all(urls.map(fetchImageAsBase64))).filter(Boolean);
  if (imgDataList.length === 0) return "";

  const imageBlocks = imgDataList.map((img) => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }));

  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: "이 공연 포스터/프로그램 이미지에 **글자로 적혀 있는 모든 텍스트**를 그대로 옮겨 적어주세요. 작곡가명, 곡명, 출연자, 날짜, 장소 등 보이는 텍스트를 모두 포함하세요. 추측하거나 보이지 않는 정보를 추가하지 마세요. 텍스트가 없으면 빈 문자열을 반환하세요.",
            },
          ],
        },
      ],
    });

  try {
    const response = await withRetry(call, { tries: 2, baseDelayMs: 2000 });
    return extractText(response);
  } catch {
    return "";
  }
}

// --------------- 검증 프롬프트 ---------------

function buildVerifyPrompt(concert, ocrText) {
  const tagList = Object.entries(TAXONOMY)
    .map(([cat, tags]) => `[${cat}] ${tags.join(", ")}`)
    .join("\n");

  const aliasInfo = Object.entries(COMPOSER_ALIASES)
    .map(([alias, canonical]) => `${alias} → ${canonical}`)
    .join(", ");

  return `당신은 클래식 공연 태그 검수 전문가입니다.

아래 공연에 현재 부여된 tags와 ai_keywords가 **실제 텍스트에 근거가 있는지** 검증하세요.

## 공연 정보
- 제목: ${concert.title || "(없음)"}
- 출연: ${concert.performers || "(없음)"}
- 시놉시스: ${concert.synopsis || "(없음)"}
${ocrText ? `- 이미지 속 텍스트(OCR): ${ocrText}` : "- 이미지 텍스트: (없음)"}

## 현재 태그
tags: ${JSON.stringify(concert.tags || [])}
ai_keywords: ${JSON.stringify(concert.ai_keywords || [])}

## 허용 태그 목록
${tagList}

## 작곡가 표기 변형
${aliasInfo}

## 검증 규칙

### tags 검증
1. **작곡가 태그**: 제목, 시놉시스, 출연, 이미지 텍스트 중 하나 이상에 해당 작곡가명(또는 표기 변형)이 실제로 언급되어 있어야 합니다. 어디에도 언급되지 않은 작곡가 태그는 제거하세요.
2. **시대 태그**: 유효한 작곡가 태그에 대응하는 시대만 남깁니다. 작곡가가 모두 제거되면 시대도 제거합니다.
3. **작품형태 태그** (교향곡, 협주곡, 실내악 등): 텍스트에 해당 작품형태를 나타내는 단어가 있거나, 문맥상 명확히 추론 가능해야 합니다. (예: "피아노 독주회" → 독주곡 OK, "○○ 교향악단 정기연주회" + 프로그램에 교향곡/협주곡 언급 없으면 → 교향곡 태그는 근거 불충분이므로 제거)
4. **악기 태그**: 텍스트에서 해당 악기 또는 해당 악기를 연주하는 연주자가 언급되어야 합니다. 오케스트라 공연이면 "오케스트라" 태그는 유지합니다.
5. **출연 태그**: 출연진에 실제로 이름이 있어야 합니다. "해외 연주자"/"해외 단체"는 외국 국적 연주자/단체가 출연에 있을 때만 유지합니다.

### ai_keywords 검증
- 키워드도 텍스트(제목, 시놉시스, 출연, 이미지)에 근거가 있어야 합니다.
- 어디에도 언급되지 않은 작곡가명, 작품명, 설명은 제거하세요.
- 분위기 키워드("웅장한", "서정적" 등)는 시놉시스에 해당 분위기가 묘사되어 있으면 유지합니다.

### 누락 태그 추가
- 텍스트에 명확히 언급된 작곡가/악기/작품형태가 현재 태그에 빠져 있으면 추가하세요.
- 추가하는 태그는 반드시 허용 태그 목록에 있어야 합니다.
- 허용 태그 목록에 없는 작곡가/정보는 keywords에 추가하세요.

## 응답 형식
JSON으로만 응답하세요:
{
  "tags": ["검증 후 최종 태그 목록"],
  "keywords": ["검증 후 최종 키워드 목록"],
  "removed_tags": ["제거한 태그 목록"],
  "removed_keywords": ["제거한 키워드 목록"],
  "added_tags": ["새로 추가한 태그 목록"],
  "added_keywords": ["새로 추가한 키워드 목록"],
  "action": "approve 또는 fix",
  "reason": "변경 이유 (한 줄)"
}
- action "approve": 태그가 모두 적절하여 변경 없음
- action "fix": 태그를 수정함 (제거 또는 추가)`;
}

// --------------- 텍스트 기반 빠른 검증 (이미지 없이) ---------------

function quickTextVerify(concert) {
  const tags = concert.tags || [];
  const keywords = concert.ai_keywords || [];
  const text = `${concert.title || ""} ${concert.performers || ""} ${concert.synopsis || ""}`.toLowerCase();

  const allAliases = Object.entries(COMPOSER_ALIASES);

  // 작곡가 태그 중 텍스트에 근거 없는 것 찾기
  const suspiciousComposers = tags.filter((tag) => {
    if (!COMPOSER_SET.has(tag)) return false;
    // 정규명이 텍스트에 있으면 OK
    if (text.includes(tag.toLowerCase())) return false;
    // alias 역방향 검사
    const aliases = allAliases
      .filter(([, canonical]) => canonical === tag)
      .map(([alias]) => alias);
    if (aliases.some((alias) => text.includes(alias.toLowerCase()))) return false;
    return true; // 텍스트에 근거 없음
  });

  return { suspiciousComposers };
}

// --------------- 메인 검증 로직 ---------------

async function verifyConcert(concert) {
  const { suspiciousComposers } = quickTextVerify(concert);
  const hasImages = (concert.intro_images?.length ?? 0) > 0;

  // 텍스트에 근거 없는 작곡가가 없고 이미지도 없으면 → 텍스트만으로 빠른 승인 가능한지 체크
  if (suspiciousComposers.length === 0 && !hasImages) {
    // 태그가 모두 텍스트에 근거 있음 → AI 검증 없이 승인
    return { action: "approve", tags: concert.tags, keywords: concert.ai_keywords, reason: "텍스트 기반 자동 승인" };
  }

  // 이미지 OCR 수행 (의심스러운 작곡가가 있거나 이미지가 있는 경우)
  let ocrText = "";
  if (hasImages) {
    ocrText = await ocrImages(concert.intro_images);
  }

  // 이미지 OCR 후 의심스러운 작곡가가 OCR 텍스트에 있는지 확인
  if (suspiciousComposers.length > 0 && ocrText) {
    const ocrLower = ocrText.toLowerCase();
    const allAliases = Object.entries(COMPOSER_ALIASES);
    const stillSuspicious = suspiciousComposers.filter((tag) => {
      if (ocrLower.includes(tag.toLowerCase())) return false;
      const aliases = allAliases
        .filter(([, canonical]) => canonical === tag)
        .map(([alias]) => alias);
      return !aliases.some((alias) => ocrLower.includes(alias.toLowerCase()));
    });

    // OCR에서도 근거 없는 작곡가가 있으면 AI 검증 필요
    if (stillSuspicious.length === 0 && !hasImages) {
      return { action: "approve", tags: concert.tags, keywords: concert.ai_keywords, reason: "OCR 텍스트 기반 자동 승인" };
    }
  }

  // AI 검증 호출
  const prompt = buildVerifyPrompt(concert, ocrText);
  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 2000 });
  const raw = extractText(response);
  const result = extractJsonObject(raw);

  if (!result) {
    console.warn(`  JSON 파싱 실패, 수동 검수 유지: ${concert.id}`);
    return { action: "skip", tags: concert.tags, keywords: concert.ai_keywords, reason: "AI 응답 파싱 실패" };
  }

  // 결과 태그 후처리: TAXONOMY에 있는 것만, alias 정규화, 시대 태그 보정
  let finalTags = (result.tags || [])
    .map((t) => COMPOSER_ALIASES[t] ?? t)
    .filter((t) => ALL_TAGS.has(t));

  // 시대 태그 자동 보정
  const composersInTags = finalTags.filter((t) => COMPOSER_SET.has(t));
  for (const [era, composers] of Object.entries(ERA_MAP)) {
    if (composers.some((c) => composersInTags.includes(c)) && !finalTags.includes(era)) {
      finalTags.push(era);
    }
  }
  // KNOWN_COMPOSER_ERAS: 키워드에 있는 작곡가 → 시대 태그
  const kwLower = (result.keywords || []).map((k) => k.toLowerCase());
  for (const [era, composers] of Object.entries(KNOWN_COMPOSER_ERAS)) {
    if (composers.some((c) => kwLower.includes(c.toLowerCase())) && !finalTags.includes(era)) {
      finalTags.push(era);
    }
  }

  finalTags = [...new Set(finalTags)];
  const finalKeywords = [...new Set(result.keywords || [])];

  return {
    action: result.action || "fix",
    tags: finalTags,
    keywords: finalKeywords,
    removed_tags: result.removed_tags || [],
    removed_keywords: result.removed_keywords || [],
    added_tags: result.added_tags || [],
    added_keywords: result.added_keywords || [],
    reason: result.reason || "",
  };
}

// --------------- main ---------------

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`자동 검수 시작${dryRun ? " (DRY RUN — DB 반영 안 함)" : ""}...`);

  const { data, error } = await supabase
    .from("concerts")
    .select("id, title, synopsis, performers, poster, intro_images, tags, ai_keywords, status")
    .in("status", ["공연예정", "공연중"])
    .or("need_review.eq.true,tags.is.null,tags.eq.{}")
    .order("title");

  if (error) throw error;
  const concerts = data ?? [];
  console.log(`검수 대상: ${concerts.length}건\n`);

  let approved = 0;
  let fixed = 0;
  let skipped = 0;

  for (let i = 0; i < concerts.length; i++) {
    const c = concerts[i];
    const label = `[${i + 1}/${concerts.length}] ${c.title || c.id}`;

    try {
      const result = await verifyConcert(c);

      if (result.action === "approve") {
        console.log(`✓ ${label} — 승인 (${result.reason})`);
        if (!dryRun) {
          await supabase.from("concerts").update({ need_review: false }).eq("id", c.id);
        }
        approved++;
      } else if (result.action === "fix") {
        const removedStr = (result.removed_tags || []).concat(result.removed_keywords || []).join(", ");
        const addedStr = (result.added_tags || []).concat(result.added_keywords || []).join(", ");
        console.log(`✎ ${label}`);
        if (removedStr) console.log(`  제거: ${removedStr}`);
        if (addedStr) console.log(`  추가: ${addedStr}`);
        console.log(`  사유: ${result.reason}`);
        if (!dryRun) {
          await supabase.from("concerts").update({
            tags: result.tags,
            ai_keywords: result.keywords,
            need_review: false,
          }).eq("id", c.id);
        }
        fixed++;
      } else {
        console.log(`⚠ ${label} — 건너뜀 (${result.reason})`);
        skipped++;
      }
    } catch (e) {
      console.error(`✗ ${label} — 오류: ${e?.message || e}`);
      skipped++;
    }

    // rate limit 대응
    if ((i + 1) % 10 === 0) {
      await sleep(2000);
    } else {
      await sleep(500);
    }
  }

  console.log(`\n완료: 승인 ${approved}건, 수정 ${fixed}건, 건너뜀 ${skipped}건`);
  if (dryRun) {
    console.log("(DRY RUN이므로 DB에 반영되지 않았습니다. 실제 반영: --dry-run 제거)");
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
