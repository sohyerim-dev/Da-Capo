import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error(
    "환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY 가 필요합니다."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const TAXONOMY = {
  작곡가: [
    // 바로크
    "코렐리",
    "퍼셀",
    "비발디",
    "텔레만",
    "바흐",
    "헨델",
    // 고전
    "글루크",
    "하이든",
    "모차르트",
    "베토벤",
    // 초기 낭만
    "베버",
    "파가니니",
    "로시니",
    "도니제티",
    "벨리니",
    "슈베르트",
    "베를리오즈",
    "멘델스존",
    "슈만",
    "쇼팽",
    "리스트",
    // 후기 낭만
    "바그너",
    "베르디",
    "브루흐",
    "브람스",
    "브루크너",
    "보로딘",
    "생상스",
    "프랑크",
    "비제",
    "포레",
    "무소르그스키",
    "차이코프스키",
    "드보르자크",
    "마스네",
    "그리그",
    "림스키코르사코프",
    "엘가",
    "푸치니",
    "말러",
    "슈트라우스",
    "시벨리우스",
    "닐센",
    // 근대
    "드뷔시",
    "스크랴빈",
    "라흐마니노프",
    "라벨",
    "야나체크",
    "레스피기",
    "바르톡",
    "스트라빈스키",
    "프로코피예프",
    "힌데미트",
    "거슈윈",
    // 현대
    "쇼스타코비치",
    "메시앙",
    "번스타인",
    "윤이상",
    "아르보 패르트",
    "진은숙",
  ],
  작품형태: [
    "관현악",
    "교향곡",
    "협주곡",
    "실내악",
    "독주곡",
    "성악곡",
    "합창곡",
    "오페라",
    "발레",
    "음악극",
    "가곡",
    "영화음악",
  ],
  악기: [
    "피아노",
    "바이올린",
    "비올라",
    "첼로",
    "플루트",
    "오보에",
    "클라리넷",
    "바순",
    "호른",
    "트럼펫",
    "트롬본",
    "튜바",
    "하프",
    "더블베이스",
    "오르간",
    "클래식 기타",
    "성악",
    "관악",
    "타악",
    "오케스트라",
  ],
  시대: ["바로크", "고전", "초기 낭만", "후기 낭만", "근대", "현대"],
  출연: ["해외 연주자", "해외 단체"],
};

const ERA_MAP = {
  바로크: ["코렐리", "퍼셀", "비발디", "텔레만", "바흐", "헨델"],
  고전: ["글루크", "하이든", "모차르트", "베토벤"],
  "초기 낭만": [
    "베버",
    "파가니니",
    "로시니",
    "도니제티",
    "벨리니",
    "슈베르트",
    "베를리오즈",
    "멘델스존",
    "슈만",
    "쇼팽",
    "리스트",
  ],
  "후기 낭만": [
    "바그너",
    "베르디",
    "브루흐",
    "브람스",
    "브루크너",
    "보로딘",
    "생상스",
    "프랑크",
    "비제",
    "포레",
    "무소르그스키",
    "차이코프스키",
    "드보르자크",
    "마스네",
    "그리그",
    "림스키코르사코프",
    "엘가",
    "푸치니",
    "말러",
    "슈트라우스",
    "시벨리우스",
    "닐센",
  ],
  근대: [
    "드뷔시",
    "스크랴빈",
    "라흐마니노프",
    "라벨",
    "야나체크",
    "레스피기",
    "바르톡",
    "스트라빈스키",
    "프로코피예프",
    "힌데미트",
    "거슈윈",
  ],
  현대: ["쇼스타코비치", "메시앙", "번스타인", "윤이상", "아르보 패르트", "진은숙"],
};

// 작곡가명 한국어 표기 변형 → 정규명 매핑
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

const TEXT_BATCH_SIZE = 8;

// taxonomy whitelist 세트
const ALL_TAGS = new Set(Object.values(TAXONOMY).flat());

function uniq(arr) {
  return [...new Set(arr)];
}

// AI 응답 태그에서 별명을 정규명으로 변환
function normalizeAliases(tags) {
  return tags.map((t) => COMPOSER_ALIASES[t] ?? t);
}

// taxonomy에 존재하는 태그만 남김 (모델 실수 방지)
function filterAllowedTags(tags) {
  return tags.filter((t) => ALL_TAGS.has(t));
}

function addEraTags(tags) {
  const eraTags = [];
  for (const [era, composers] of Object.entries(ERA_MAP)) {
    if (composers.some((c) => tags.includes(c))) eraTags.push(era);
  }
  return uniq([...tags, ...eraTags]);
}

// Anthropic 응답에서 text 블록만 안전하게 합치기
function extractTextFromAnthropic(response) {
  const blocks = Array.isArray(response?.content) ? response.content : [];
  const text = blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text;
}

// JSON 덩어리만 안전하게 추출 (앞뒤 설명 섞여도 파싱 가능)
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

// 태그 후처리 파이프라인: alias 정규화 → whitelist → ERA 자동 추가 → dedup
function finalizeTags(rawTags) {
  const normalized = normalizeAliases(Array.isArray(rawTags) ? rawTags : []);
  const allowed = filterAllowedTags(normalized);
  const withEra = addEraTags(allowed);
  return uniq(filterAllowedTags(withEra));
}

const SYSTEM_PROMPT = `당신은 클래식 공연 태깅 전문가입니다. 주어진 공연 정보를 분석하여 정해진 태그 목록에서 적절한 태그를 빠짐없이 선택해주세요.

중요: 작곡가명은 한국어 표기가 다양할 수 있습니다. 아래 표기 변형을 모두 같은 작곡가로 인식하고, 반드시 정규명으로 태깅하세요:
- 무소르그스키 (= 무소륵스키, 무쏘르그스키)
- 차이코프스키 (= 차이콥스키)
- 슈트라우스 (= 리하르트 슈트라우스, R. 슈트라우스) — 요한 슈트라우스(왈츠)가 아닌 리하르트 슈트라우스를 의미
- 드보르자크 (= 드보르작, 드보르짝)
- 쇼스타코비치 (= 쇼스타코비츠)
- 프로코피예프 (= 프로코피에프)
- 스크랴빈 (= 스크리아빈)
- 바르톡 (= 바르토크, 버르톡)
- 시벨리우스 (= 시벨류스)
- 야나체크 (= 야나첵)

태그 선택 규칙:
1. 공연의 핵심 요소를 최대한 많이 태깅합니다. 누락이 없도록 주의하세요.
2. 제목이나 출연자 이름만으로 파악 가능한 태그도 반드시 선택합니다.
   예) "피아노 독주회" → ["피아노", "독주곡"]
   예) "소프라노 독창회" → ["성악", "성악곡"]
   예) "베토벤 교향곡 9번" → ["베토벤", "교향곡"]
3. 혼합 프로그램은 해당하는 작품형태 태그를 모두 선택합니다.
   예) "피아노 협주곡 + 교향곡" 프로그램 → ["협주곡", "교향곡"] 둘 다
   예) "베토벤 교향곡 9번(합창)" → ["교향곡", "합창곡"] 둘 다
4. 협주곡은 독주 악기 태그도 함께 선택합니다.
   예) "피아노 협주곡" → ["협주곡", "피아노"]
   예) "바이올린 협주곡" → ["협주곡", "바이올린"]
   단, 원래 피아노곡을 오케스트라로 편곡한 경우에는 피아노 태그 없음.
5. 성악가(소프라노·메조소프라노·테너·바리톤·베이스)가 협연하는 공연은 성악 태그를 선택합니다.
6. 프로그램에 여러 작곡가의 작품이 포함되면 해당 작곡가를 모두 태깅합니다.
7. 작품형태 태그 구분 기준:
   - 교향곡: 오케스트라가 교향곡을 연주하는 공연.
   - 협주곡: 독주 악기와 오케스트라가 협연하는 공연.
   - 실내악: 현악 4중주, 피아노 트리오, 2중주~8중주 등 소규모 기악 앙상블. 합창·성악 작품에는 실내악 태그를 붙이지 않음.
   - 독주곡: 기악 연주자 한 명이 중심이 되는 공연. 피아노·바이올린 등 독주회.
   - 성악곡: 성악가가 중심이 되는 공연. 소프라노·테너 독창회, 리사이틀 등.
   - 합창곡: 미사, 레퀴엠, 오라토리오, 칸타타, 모테트 등 합창단이 참여하는 성악·합창 작품.
   - 오페라: 오페라 공연.
   - 발레: 발레 공연 또는 발레 음악이 주요 프로그램인 공연.
   - 음악극: 오페라 외에 음악과 극이 결합된 공연 형식(뮤지컬 등 포함).
   - 가곡: 성악가가 가곡(예술가곡, 한국가곡 등)을 주요 프로그램으로 다루는 공연.
   - 영화음악: 영화 OST, 영화음악을 주요 프로그램으로 다루는 공연.
   - 관현악: 오케스트라가 연주하는 교향곡·협주곡 외의 관현악 작품. 서곡, 교향시, 관현악 모음곡, 관현악 편곡 등. 교향곡이나 협주곡이 아닌 오케스트라 레퍼토리에 사용합니다. 교향곡·협주곡 태그와 함께 사용 가능합니다(혼합 프로그램).
8. 악기 태그 중 "오케스트라"는 오케스트라가 주역으로 참여하는 관현악 공연 전반에 사용합니다(교향곡·협주곡 등 오케스트라 공연에 함께 태깅).
9. 오케스트라(관현악단) 공연에서는 오케스트라에 편성된 악기를 개별 태깅하지 않습니다. "오케스트라" 태그 하나로 대표합니다. 단, 협주곡의 독주 악기는 예외적으로 태깅합니다.
10. 시대 태그는 공연의 주요 레퍼토리 시대를 기준으로 태깅합니다:
   - 바로크: 1600~1750 (코렐리, 비발디, 바흐, 헨델 등)
   - 고전: 1750~1820 (하이든, 모차르트, 베토벤 등)
   - 초기 낭만: 1820~1850 (슈베르트, 멘델스존, 슈만, 쇼팽, 리스트 등)
   - 후기 낭만: 1850~1910 (브람스, 차이코프스키, 말러, 푸치니, 슈트라우스 등)
   - 근대: 1890~1945 (드뷔시, 라벨, 바르톡, 스트라빈스키, 프로코피예프 등)
   - 현대: 1945~현재 (쇼스타코비치, 메시앙, 윤이상, 아르보 패르트, 진은숙 등)
   혼합 프로그램은 해당 시대 태그를 모두 선택합니다.
11. 출연 태그:
   - "해외 연주자": 출연진(performers)에 외국인 개인 연주자(지휘자, 독주자, 성악가 등)가 포함되어 있으면 태깅합니다. 한국계 해외 연주자도 포함합니다. 한국인 연주자만 출연하는 공연에는 태깅하지 않습니다.
   - "해외 단체": 출연진에 해외 오케스트라, 해외 앙상블, 해외 합창단 등 외국 단체가 포함되어 있으면 태깅합니다.
12. tags에는 반드시 위 태그 목록에 있는 값만 사용하세요. 목록에 없는 작곡가, 출연진, 악기, 작품형태 등은 tags가 아닌 keywords에 넣으세요.
13. tags 외에, 공연을 자유롭게 설명하는 키워드를 keywords 필드에 추가로 제공해주세요.
    keywords에는 태그 목록에 없는 작곡가명, 구체적 작품명(예: "운명 교향곡", "사계"), 분위기(예: "웅장한", "서정적"), 특징(예: "초연", "세계 초연"), 협연자 정보 등을 자유롭게 포함할 수 있습니다. 5~15개 이내로 작성하세요.
14. 반드시 JSON 형식으로만 응답하세요: {"공연ID": {"tags": ["태그1", "태그2"], "keywords": ["키워드1", "키워드2"], "confidence": "high"}}
    confidence는 high 또는 low만 사용합니다. 다음 경우에 low를 사용하세요:
    - 공연 정보가 너무 부족하거나 제목만으로는 장르 판단이 불확실할 때
    - 작품형태 선택이 두 가지 이상으로 애매할 때
    - 프로그램 내용을 파악하기 어려울 때`;

function buildTagList() {
  return Object.entries(TAXONOMY)
    .map(([cat, tags]) => `[${cat}] ${tags.join(", ")}`)
    .join("\n");
}

function buildTextPrompt(concerts) {
  return `태그 목록:\n${buildTagList()}\n\n공연 목록:\n${concerts
    .map(
      (c) =>
        `[${c.id}]\n제목: ${c.title || ""}\n출연: ${c.performers || ""}\n제작: ${
          c.producer || ""
        }\n내용: ${c.synopsis || ""}`
    )
    .join("\n\n")}`;
}

function parseTagResult(parsed, fallbackIds) {
  return Object.fromEntries(
    (fallbackIds ?? Object.keys(parsed)).map((id) => {
      const val = parsed?.[id];
      if (!val) return [id, { tags: [], keywords: [], confidence: "low" }];
      if (Array.isArray(val))
        return [id, { tags: val, keywords: [], confidence: "high" }];
      return [
        id,
        {
          tags: Array.isArray(val.tags) ? val.tags : [],
          keywords: Array.isArray(val.keywords) ? val.keywords : [],
          confidence: val.confidence === "low" ? "low" : "high",
        },
      ];
    })
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, { tries = 3, baseDelayMs = 600 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e).toLowerCase();
      const status = e?.status ?? e?.statusCode ?? 0;
      const shouldRetry =
        status === 429 ||
        status >= 500 ||
        msg.includes("rate") ||
        msg.includes("timeout") ||
        msg.includes("econn") ||
        msg.includes("enotfound");

      if (!shouldRetry || i === tries - 1) break;
      const delay = baseDelayMs * Math.pow(2, i);
      await sleep(delay);
    }
  }
  throw lastErr;
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

    const base64 = resized.toString("base64");
    return { base64, mediaType: "image/jpeg" };
  };

  try {
    return await withRetry(attempt, { tries: 2, baseDelayMs: 400 });
  } catch {
    return null;
  }
}

async function tagTextBatch(concerts) {
  const call = async () =>
    anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildTextPrompt(concerts) }],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 700 });
  const text = extractTextFromAnthropic(response);
  const parsed = extractJsonObject(text);

  if (!parsed) {
    console.warn("JSON 파싱 실패, 빈 태그 처리:", (text || "").slice(0, 140));
    return Object.fromEntries(
      concerts.map((c) => [c.id, { tags: [], keywords: [], confidence: "low" }])
    );
  }

  return parseTagResult(
    parsed,
    concerts.map((c) => c.id)
  );
}

async function tagImageConcert(concert) {
  const imageUrls = (concert.intro_images ?? []).slice(0, 3);
  if (imageUrls.length === 0) {
    return { [concert.id]: { tags: [], keywords: [], confidence: "low" } };
  }

  const imgDataList = (
    await Promise.all(imageUrls.map(fetchImageAsBase64))
  ).filter(Boolean);

  if (imgDataList.length === 0) {
    console.warn(`  이미지 fetch 전부 실패, 텍스트로 대체: ${concert.id}`);
    return await tagTextBatch([concert]);
  }

  const imageBlocks = imgDataList.map((img) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType,
      data: img.base64,
    },
  }));

  const call = async () =>
    anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `태그 목록:\n${buildTagList()}\n\n공연 ID: ${concert.id}\n제목: ${
                concert.title || ""
              }\n출연: ${concert.performers || ""}\n제작: ${
                concert.producer || ""
              }\n\n위 이미지(${imgDataList.length}장)는 이 공연의 소개 이미지입니다. 이미지에 포함된 텍스트(작곡가명, 곡명, 프로그램 정보 등)를 빠짐없이 꼼꼼하게 읽어주세요. 특히 프로그램 목록에 나열된 작곡가와 작품명을 모두 확인하고 태그에 반영해주세요.`,
            },
          ],
        },
      ],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 700 });
  const text = extractTextFromAnthropic(response);
  const parsed = extractJsonObject(text);

  if (!parsed) {
    console.warn(`이미지 JSON 파싱 실패, 텍스트 태깅으로 재시도: ${concert.id}`);
    return await tagTextBatch([concert]);
  }

  return parseTagResult(parsed, [concert.id]);
}

async function updateTags(id, tags, keywords, needReview) {
  const { error } = await supabase
    .from("concerts")
    .update({ tags, ai_keywords: keywords, need_review: needReview })
    .eq("id", id);
  if (error) throw error;
}

async function main() {
  console.log("태깅 시작...");

  const { data: concerts, error } = await supabase
    .from("concerts")
    .select("id, title, synopsis, performers, producer, intro_images")
    .is("tags", null)
    .in("status", ["공연예정", "공연중"]);

  if (error) throw error;

  const list = concerts ?? [];
  console.log(`태깅할 공연: ${list.length}건`);

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

  let success = 0;
  let fail = 0;
  let lowCount = 0;

  // 1) 텍스트 + 정보없음: 배치 처리
  const allTextConcerts = [...textConcerts, ...nothingConcerts];

  for (let i = 0; i < allTextConcerts.length; i += TEXT_BATCH_SIZE) {
    const batch = allTextConcerts.slice(i, i + TEXT_BATCH_SIZE);
    console.log(
      `[텍스트] ${i + 1}~${Math.min(i + TEXT_BATCH_SIZE, allTextConcerts.length)} / ${allTextConcerts.length}`
    );

    try {
      const result = await tagTextBatch(batch);

      for (const concert of batch) {
        const out = result[concert.id] ?? {
          tags: [],
          keywords: [],
          confidence: "low",
        };

        const tags = finalizeTags(out.tags);
        const keywords = Array.isArray(out.keywords) ? out.keywords : [];
        const needReview = out.confidence !== "high";

        await updateTags(concert.id, tags, keywords, needReview);

        if (needReview) {
          console.log(`  ⚠ 검수 필요: ${concert.title || concert.id}`);
          lowCount++;
        } else {
          success++;
        }
      }
    } catch (e) {
      console.error(`텍스트 배치 실패:`, e?.message || e);
      fail += batch.length;
    }

    await sleep(300);
  }

  // 2) 이미지: 1건씩 처리
  for (let i = 0; i < imageConcerts.length; i++) {
    const concert = imageConcerts[i];

    if (i === 0 || (i + 1) % 20 === 0) {
      console.log(`[이미지] ${i + 1} / ${imageConcerts.length}`);
    }

    try {
      const result = await tagImageConcert(concert);
      const out = result[concert.id] ?? {
        tags: [],
        keywords: [],
        confidence: "low",
      };

      const tags = finalizeTags(out.tags);
      const keywords = Array.isArray(out.keywords) ? out.keywords : [];
      const needReview = out.confidence !== "high";

      await updateTags(concert.id, tags, keywords, needReview);

      if (needReview) {
        console.log(`  ⚠ 검수 필요: ${concert.title || concert.id}`);
        lowCount++;
      } else {
        success++;
      }
    } catch (e) {
      console.error(`이미지 태깅 실패 ${concert.id}:`, e?.message || e);
      fail++;
    }

    await sleep(200);
  }

  console.log(
    `\n완료: 자동 태깅 ${success}건, 검수 필요 ${lowCount}건 (need_review=true), 실패 ${fail}건`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
