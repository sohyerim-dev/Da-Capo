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
  출연: [
    // 개인
    "금난새", "김다미", "김봄소리", "김선욱", "김송현", "김정원",
    "문지영", "문태국",
    "박재홍", "박혜상", "백건우", "사무엘 윤",
    "선우예권", "손민수", "손열음", "신지아", "양성원", "양인모",
    "임선혜", "임윤찬", "임지영", "임현정",
    "장한나", "정경화", "정명화", "정명훈", "조성진", "조수미",
    "클라라 주미 강", "홍혜란", "황수미",
    // 단체
    "KBS교향악단", "경기필하모닉", "고잉홈프로젝트", "국립심포니오케스트라",
    "국립합창단", "콜레기움 무지쿰 서울", "콜레기움 보칼레 서울",
    "대전시립교향악단", "부천필하모닉오케스트라", "서울모테트합창단",
    "서울시립교향악단", "인천시립교향악단",
    // 해외
    "해외 연주자", "해외 단체",
  ],
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

// OpenAI 응답에서 텍스트 추출
function extractText(response) {
  return response?.choices?.[0]?.message?.content?.trim() ?? "";
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

// TAXONOMY에 없는 작곡가 → 시대 매핑 (텍스트에서 발견 시 시대 태그 강제 추가용)
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

// 텍스트(제목+시놉시스)에서 작곡가명만 추출하는 경량 호출
async function extractComposersFromText(concert) {
  const title = concert.title || "";
  const synopsis = concert.synopsis || "";
  if (!title && !synopsis) return [];

  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 256,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `아래 공연 정보의 텍스트에 **직접 언급된** 작곡가 이름만 한국어로 나열해주세요.
중요: 텍스트에 실제로 적혀 있는 작곡가만 추출하세요. 추측하거나 연상되는 작곡가를 추가하지 마세요.
작곡가가 없으면 빈 배열 []을 반환하세요.
JSON 배열로만 응답하세요. 예: ["베토벤", "모차르트"]

제목: ${title}
시놉시스: ${synopsis}`,
        },
      ],
    });

  try {
    const response = await withRetry(call, { tries: 2, baseDelayMs: 2000 });
    const raw = extractText(response);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];

    // 할루시네이션 방지: AI가 반환한 작곡가가 실제 텍스트에 존재하는지 검증
    const textLower = `${title} ${synopsis}`.toLowerCase();
    const allAliases = Object.entries(COMPOSER_ALIASES);
    return arr.map((s) => String(s)).filter((name) => {
      if (textLower.includes(name.toLowerCase())) return true;
      // alias 역방향 검사: 정규명으로 반환했지만 텍스트에는 별명으로 적혀있는 경우
      const aliases = allAliases
        .filter(([, canonical]) => canonical === name)
        .map(([alias]) => alias);
      return aliases.some((alias) => textLower.includes(alias.toLowerCase()));
    });
  } catch {
    return [];
  }
}

// 작곡가·시대·키워드 강제 보정 (AI 누락 방지) — 텍스트 + keywords + 이미지 모두 검사
async function enforceTags(concert, tags, keywords) {
  const text = `${concert.title || ""} ${concert.synopsis || ""}`.toLowerCase();
  const kw = (keywords || []).map((k) => k.toLowerCase()).join(" ");
  let source = `${text} ${kw}`;
  const resultTags = [...tags];
  const resultKw = [...(keywords || [])];
  const kwLower = new Set(resultKw.map((k) => k.toLowerCase()));
  let allExtracted = [];

  // 1. 텍스트(제목+시놉시스)에서 작곡가명 추출 (텍스트 검증 포함)
  try {
    const textComposers = await extractComposersFromText(concert);
    if (textComposers.length > 0) {
      console.log(`  🔍 텍스트에서 작곡가 추출: ${textComposers.join(", ")}`);
      allExtracted.push(...textComposers);
    }
  } catch {
    // 실패 시 하드코딩 리스트로 폴백
  }

  // 2. 이미지 작곡가 추출은 enforceTags에서 제외 (검증 불가, 할루시네이션 위험)
  //    이미지 분석은 메인 태깅 단계(tagImageConcert)에서만 수행

  // alias 정규화 후 source에 추가
  const normalizedExtracted = normalizeAliases(allExtracted);
  source += " " + normalizedExtracted.map((c) => c.toLowerCase()).join(" ");

  // 3. ERA_MAP 작곡가가 source에 있으면 태그에 강제 추가
  for (const composers of Object.values(ERA_MAP)) {
    for (const composer of composers) {
      if (source.includes(composer.toLowerCase()) && !resultTags.includes(composer)) {
        resultTags.push(composer);
      }
    }
  }

  // 4. KNOWN_COMPOSER_ERAS 작곡가가 source에 있으면 시대 태그 + keywords 강제 추가
  for (const [era, composers] of Object.entries(KNOWN_COMPOSER_ERAS)) {
    for (const composer of composers) {
      if (source.includes(composer.toLowerCase())) {
        if (!resultTags.includes(era)) resultTags.push(era);
        if (!kwLower.has(composer.toLowerCase())) {
          resultKw.push(composer);
          kwLower.add(composer.toLowerCase());
        }
      }
    }
  }

  // 5. AI가 추출한 작곡가 중 TAXONOMY에 없는 것 → keywords에 강제 추가
  for (const raw of normalizedExtracted) {
    if (!ALL_TAGS.has(raw) && !kwLower.has(raw.toLowerCase())) {
      resultKw.push(raw);
      kwLower.add(raw.toLowerCase());
    }
  }

  const withEra = addEraTags(resultTags);
  return {
    tags: uniq(filterAllowedTags(withEra)),
    keywords: uniq(resultKw),
  };
}

// 태그 논리 검증: 의심스러운 누락이 있으면 true 반환
function hasTagInconsistency(concert, tags) {
  const title = (concert.title || "").toLowerCase();
  const performers = (concert.performers || "").toLowerCase();
  const synopsis = (concert.synopsis || "").toLowerCase();
  const text = `${title} ${performers} ${synopsis}`;
  const tagSet = new Set(tags);

  const SOLO_INSTRUMENTS = [
    "피아노", "바이올린", "비올라", "첼로", "플루트", "오보에",
    "클라리넷", "바순", "호른", "트럼펫", "트롬본", "튜바",
    "하프", "더블베이스", "오르간", "클래식 기타", "성악",
  ];
  const ORCH_KEYWORDS = [
    "교향악단", "오케스트라", "필하모닉", "심포니", "관현악단", "필하모니",
  ];
  const COMPOSER_TAGS = new Set(TAXONOMY["작곡가"]);
  const ERA_TAGS = new Set(TAXONOMY["시대"]);

  // 1. 제목/시놉시스에 "교향곡"이 있는데 태그에 없음
  if ((title.includes("교향곡") || synopsis.includes("교향곡")) && !tagSet.has("교향곡")) return true;

  // 2. 제목/시놉시스에 "협주곡"이 있는데 태그에 없음
  if ((title.includes("협주곡") || synopsis.includes("협주곡")) && !tagSet.has("협주곡")) return true;

  // 3. 협주곡 태그는 있는데 독주 악기 태그가 하나도 없음
  if (tagSet.has("협주곡") && !SOLO_INSTRUMENTS.some((i) => tagSet.has(i))) return true;

  // 4. 출연진에 오케스트라/교향악단이 있는데 오케스트라 태그 없음
  if (ORCH_KEYWORDS.some((k) => performers.includes(k)) && !tagSet.has("오케스트라")) return true;

  // 5. 작곡가 태그가 있는데 시대 태그가 하나도 없음
  const hasComposer = tags.some((t) => COMPOSER_TAGS.has(t));
  const hasEra = tags.some((t) => ERA_TAGS.has(t));
  if (hasComposer && !hasEra) return true;

  // 5-1. 시대 태그가 하나도 없는데:
  //      - 제목/시놉시스에 작곡가 키워드가 있거나
  //      - 이미지가 있음 (포스터에 작곡가/프로그램 정보 포함 가능)
  if (!hasEra) {
    const KNOWN_COMPOSERS = [
      "피아졸라", "크라이슬러", "요한 슈트라우스", "슈트라우스 2세",
      "엘가", "홀스트", "닐센", "글리에르", "레스피기",
      "거슈윈", "코플랜드", "이자이", "사라사테", "비에니아프스키",
      "타르티니", "알비노니", "제미니아니", "보케리니",
      "글라주노프", "하차투리안", "카발레프스키",
      "히나데라", "빌라로보스", "데 파야",
      "스메타나", "야나체크", "글린카",
      "림스키코르사코프", "무소르그스키",
      "쿠르탁", "리게티", "펜데레츠키", "구바이둘리나",
    ];
    const hasKnownComposer = KNOWN_COMPOSERS.some((c) => text.includes(c.toLowerCase()));
    const hasImages = (concert.intro_images?.length ?? 0) > 0;
    if (hasKnownComposer || hasImages) return true;
  }

  // 5-2. ERA_MAP 작곡가가 제목/시놉시스에 있는데 태그에 없음
  const ALL_ERA_COMPOSERS = Object.values(ERA_MAP).flat();
  for (const composer of ALL_ERA_COMPOSERS) {
    if (text.includes(composer.toLowerCase()) && !tagSet.has(composer)) return true;
  }

  // 6. 제목에 "독주회/리사이틀"이 있는데 독주곡 태그 없음
  if ((title.includes("독주회") || title.includes("리사이틀")) && !tagSet.has("독주곡")) return true;

  // 7. 제목에 "오페라"가 있는데 오페라 태그 없음
  if (title.includes("오페라") && !tagSet.has("오페라")) return true;

  // 8. 태그가 2개 이하면 대부분 누락 가능성 높음
  if (tags.length <= 2) return true;

  return false;
}

const SYSTEM_PROMPT = `당신은 "클래식 공연 태깅" 전용 정보추출기입니다.
목표는 주어진 공연 정보(제목/출연/시놉시스/이미지 텍스트)에 "직접 등장하는 사실"만 근거로,
지정된 태그 목록에서 tags를 선택하고, 목록 밖 정보는 keywords로 보강하는 것입니다.

절대 규칙 (위반 금지)
- 추측 금지: 텍스트나 이미지에 직접 표기되지 않은 작곡가/곡명/출연진을 연상해서 넣지 마세요.
  예: "사계"만 있으면 비발디를 넣지 마세요.
  예: "피아노 협주곡 2번"만 있으면 라흐마니노프를 넣지 마세요.
- 출력은 JSON만: 설명/문장/마크다운/코드블록 없이 JSON만 출력하세요.
- tags에는 "태그 목록에 존재하는 값"만 넣으세요. 목록 밖은 무조건 keywords로.
- tags에 중복 금지, keywords에 중복 금지.
- 불확실하면 넣지 말고 confidence를 low로.

입력 소스 우선순위 (근거 강도)
1) 이미지에 적힌 텍스트
2) 제목
3) 출연(performers)
4) 시놉시스(synopsis)
5) 제작(producer)
위 순서로 신뢰합니다.

작곡가/출연자 누락 방지 규칙 (가장 중요)
- 작곡가: 텍스트/이미지에 "이름이 실제로 적힌" 모든 작곡가를 반드시 포함하세요.
  - 태그 목록에 있으면 tags에
  - 태그 목록에 없으면 keywords에
- 출연진: 텍스트/이미지에 "이름이 실제로 적힌" 모든 출연자를 반드시 포함하세요.
  - 태그 목록에 있으면 tags에
  - 태그 목록에 없으면 keywords에

시대 태그 강제 규칙
- (tags + keywords)에 들어간 "모든 작곡가"에 대해 해당 시대 태그(바로크/고전/초기 낭만/후기 낭만/근대/현대)를 tags에 반드시 포함하세요.
- 혼합 프로그램이면 시대 태그는 여러 개 가능.
- 시대 판단이 애매하거나 확신이 없으면, 작곡가는 넣되 시대 태그는 가능한 범위에서만 넣고 confidence를 low로.

작곡가 표기 변형 정규화 (동일 인물로 간주하고 정규명으로만 기록)
- 무소르그스키 (= 무소륵스키, 무쏘르그스키)
- 차이코프스키 (= 차이콥스키)
- 슈트라우스 (= 리하르트 슈트라우스, R. 슈트라우스, R.슈트라우스)  ※ 요한 슈트라우스와 혼동 금지
- 드보르자크 (= 드보르작, 드보르짝)
- 쇼스타코비치 (= 쇼스타코비츠)
- 프로코피예프 (= 프로코피에프)
- 스크랴빈 (= 스크리아빈)
- 바르톡 (= 바르토크, 버르톡)
- 시벨리우스 (= 시벨류스)
- 야나체크 (= 야나첵)
- 림스키코르사코프 (= 림스키 코르사코프)

작품형태/악기 태그 규칙 (텍스트 근거 있을 때만)
- "교향곡/협주곡/실내악/독주회/리사이틀/오페라/발레/가곡/합창/영화음악" 같은 단어가 제목/시놉시스/이미지에 있으면 해당 태그를 넣으세요.
- 협주곡이면 독주 악기(피아노/바이올린 등)도 함께 태깅하세요.
- 오케스트라/교향악단이 출연에 명시되면 "오케스트라" 태그를 넣으세요.
- 오케스트라 공연에서는 개별 편성 악기를 태깅하지 마세요(협주 독주 악기는 예외).

이미지에 여러 날짜의 프로그램이 섞여 있을 때
- 공연 기간(start_date ~ end_date)에 해당하는 날짜의 프로그램만 반영하세요.
- 해당 날짜를 특정할 수 없으면 "보수적으로 최소만 태깅"하고 confidence를 low로.

keywords 작성 규칙
- 태그 목록에 없는 정보만 keywords에 넣으세요(태그 목록에 있는 값은 keywords에 넣지 마세요).
- 근거 있는 것만: 구체 곡명, 편곡자, 초연/한국초연, 부제, 프로그램 특징 등을 5~15개.
- 작곡가가 태그 목록에 없으면 그 작곡가 이름은 keywords에 반드시 포함하세요.

최종 자가점검 (반드시 수행)
1) 추측으로 넣은 작곡가/곡명/출연자가 없는가
2) 텍스트/이미지에 적힌 작곡가가 모두 포함됐는가(tags 또는 keywords)
3) 포함된 모든 작곡가에 대한 시대 태그가 tags에 있는가
4) 텍스트/이미지에 적힌 출연자가 모두 포함됐는가(tags 또는 keywords)
5) tags는 태그 목록 값만 들어갔는가
6) 모든 배열은 중복이 없는가

반환 형식 (반드시 준수)
- 반드시 아래 JSON 객체 1개만 반환하세요.
- 키는 공연ID 문자열입니다.
- 값은 아래 3개 키만 가집니다: tags, keywords, confidence
- confidence는 "high" 또는 "low"만.

예:
{
  "123": {
    "tags": ["모차르트", "고전", "교향곡", "오케스트라"],
    "keywords": ["교향곡 40번", "K.550"],
    "confidence": "high"
  }
}`;

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
        status === 429 ||
        status >= 500 ||
        msgLower.includes("rate") ||
        msgLower.includes("timeout") ||
        msgLower.includes("econn") ||
        msgLower.includes("enotfound");

      if (!shouldRetry || i === tries - 1) break;

      // 429 에러에서 "try again in X.XXXs" 파싱
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
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
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
    type: "image_url",
    image_url: {
      url: `data:${img.mediaType};base64,${img.base64}`,
    },
  }));

  const call = async () =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
              }\n공연 기간: ${concert.start_date || ""} ~ ${
                concert.end_date || ""
              }\n\n위 이미지(${imgDataList.length}장)는 이 공연의 소개 이미지입니다. 아래 지시를 따르세요:
1. 이미지에 글자로 적혀 있는 텍스트(작곡가명, 곡명, 출연자, 프로그램 정보 등)를 빠짐없이 읽으세요.
2. 여러 날짜의 프로그램이 나열되어 있으면, **이 공연의 날짜(${concert.start_date || ""} ~ ${concert.end_date || ""})에 해당하는 프로그램만** 찾아서 태깅하세요. 다른 날짜의 프로그램은 무시하세요.
3. 이미지에서 읽은 작곡가는 태그 목록에 있으면 tags, 없으면 keywords에 반드시 넣으세요.
4. 이미지에서 읽은 출연자도 태그 목록에 있으면 tags, 없으면 keywords에 반드시 넣으세요.
5. 이미지에 없는 정보를 추측하지 마세요.`,
            },
          ],
        },
      ],
    });

  const response = await withRetry(call, { tries: 3, baseDelayMs: 700 });
  const text = extractText(response);
  const parsed = extractJsonObject(text);

  if (!parsed) {
    console.warn(`이미지 JSON 파싱 실패, 텍스트 태깅으로 재시도: ${concert.id}`);
    return await tagTextBatch([concert]);
  }

  return parseTagResult(parsed, [concert.id]);
}

const FOREIGN_TAGS = ["해외 연주자", "해외 단체"];

async function updateTags(id, tags, keywords, needReview) {
  const foreignTags = tags.filter((t) => FOREIGN_TAGS.includes(t));
  const cleanTags = tags.filter((t) => !FOREIGN_TAGS.includes(t));

  const updateData = {
    tags: cleanTags,
    ai_keywords: keywords,
    need_review: needReview,
  };

  if (foreignTags.length > 0) {
    updateData.pending_foreign_tags = foreignTags;
  }

  const { error } = await supabase
    .from("concerts")
    .update(updateData)
    .eq("id", id);
  if (error) throw error;
}

async function main() {
  console.log("태깅 시작...");

  const { data: concerts, error } = await supabase
    .from("concerts")
    .select("id, title, synopsis, performers, producer, intro_images, start_date, end_date")
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

        let tags = finalizeTags(out.tags);
        let keywords = Array.isArray(out.keywords) ? out.keywords : [];
        let needReview = out.confidence !== "high";

        // 텍스트 태깅 결과가 low이고 이미지가 있으면 이미지로 재시도
        if (needReview && (concert.intro_images?.length ?? 0) > 0) {
          try {
            console.log(`  이미지로 재시도: ${concert.title || concert.id}`);
            const imgResult = await tagImageConcert(concert);
            const imgOut = imgResult[concert.id] ?? { tags: [], keywords: [], confidence: "low" };
            tags = finalizeTags(imgOut.tags);
            keywords = Array.isArray(imgOut.keywords) ? imgOut.keywords : [];
            needReview = imgOut.confidence !== "high";
          } catch {
            // 이미지 재시도 실패 시 텍스트 결과 유지
          }
        }

        // AI가 high라고 해도 논리 검증에서 걸리면 개별 재시도
        if (!needReview && hasTagInconsistency(concert, tags)) {
          console.log(`  ⚠ 검증 불일치, 텍스트 재태깅: ${concert.title || concert.id}`);
          try {
            await sleep(2000);
            const retryResult = await tagTextBatch([concert]);
            const retryOut = retryResult[concert.id] ?? { tags: [], keywords: [], confidence: "low" };
            tags = finalizeTags(retryOut.tags);
            keywords = Array.isArray(retryOut.keywords) ? retryOut.keywords : [];
            needReview = retryOut.confidence !== "high" || hasTagInconsistency(concert, tags);
          } catch {
            needReview = true;
          }

          // 텍스트 재시도에서도 불일치이고 이미지가 있으면 이미지로 시도
          if (needReview && (concert.intro_images?.length ?? 0) > 0) {
            try {
              console.log(`  ⚠ 이미지로 재시도: ${concert.title || concert.id}`);
              await sleep(2000);
              const imgResult = await tagImageConcert(concert);
              const imgOut = imgResult[concert.id] ?? { tags: [], keywords: [], confidence: "low" };
              tags = finalizeTags(imgOut.tags);
              keywords = Array.isArray(imgOut.keywords) ? imgOut.keywords : [];
              needReview = imgOut.confidence !== "high" || hasTagInconsistency(concert, tags);
            } catch {
              // 이미지도 실패 시 need_review 유지
            }
          }
        }

        // 최종 강제 보정: AI가 놓친 작곡가·시대·키워드를 텍스트+keywords+이미지에서 찾아 추가
        const enforced = await enforceTags(concert, tags, keywords);
        tags = enforced.tags;
        keywords = enforced.keywords;

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

    await sleep(3000);
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

      let tags = finalizeTags(out.tags);
      let keywords = Array.isArray(out.keywords) ? out.keywords : [];
      let needReview = out.confidence !== "high";

      if (!needReview && hasTagInconsistency(concert, tags)) {
        console.log(`  ⚠ 검증 불일치, 재태깅: ${concert.title || concert.id}`);
        try {
          await sleep(2000);
          const retryResult = await tagImageConcert(concert);
          const retryOut = retryResult[concert.id] ?? { tags: [], keywords: [], confidence: "low" };
          tags = finalizeTags(retryOut.tags);
          keywords = Array.isArray(retryOut.keywords) ? retryOut.keywords : [];
          needReview = retryOut.confidence !== "high" || hasTagInconsistency(concert, tags);
        } catch {
          needReview = true;
        }
      }

      // 최종 강제 보정: AI가 놓친 작곡가·시대·키워드를 텍스트+keywords+이미지에서 찾아 추가
      const enforced = await enforceTags(concert, tags, keywords);
      tags = enforced.tags;
      keywords = enforced.keywords;

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

    await sleep(4000);
  }

  console.log(
    `\n완료: 자동 태깅 ${success}건, 검수 필요 ${lowCount}건 (need_review=true), 실패 ${fail}건`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
