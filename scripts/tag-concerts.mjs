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
    "바흐", "헨델", "비발디", "하이든", "모차르트", "베토벤", "슈베르트",
    "멘델스존", "슈만", "쇼팽", "리스트", "브람스", "생상스", "드보르자크",
    "차이코프스키", "시벨리우스", "말러", "드뷔시", "라벨", "라흐마니노프",
    "스트라빈스키", "프로코피예프", "쇼스타코비치",
  ],
  아티스트: [
    "금난새", "김다미", "김봄소리", "김선욱", "박혜상", "백건우", "선우예권",
    "손열음", "양성원", "양인모", "임선혜", "임윤찬", "장한나", "정경화",
    "정명화", "정명훈", "조성진", "조수미", "클라라 주미 강", "황수미",
    "KBS교향악단", "경기필하모닉", "고잉홈프로젝트", "대전시립교향악단",
    "서울시립교향악단", "인천시립교향악단",
  ],
  작품형태: ["교향곡", "협주곡", "실내악", "합창", "오페라", "리사이틀"],
  악기: ["피아노", "바이올린", "비올라", "첼로", "플루트", "오보에", "성악", "관악", "타악"],
};

const TEXT_BATCH_SIZE = 8;

const SYSTEM_PROMPT = `당신은 클래식 공연 태깅 전문가입니다. 주어진 공연 정보를 분석하여 정해진 태그 목록에서 적절한 태그를 빠짐없이 선택해주세요.

태그 선택 규칙:
1. 공연의 핵심 요소를 최대한 많이 태깅합니다. 누락이 없도록 주의하세요.
2. 제목이나 출연자 이름만으로 파악 가능한 태그도 반드시 선택합니다.
   예) "임윤찬 피아노 리사이틀" → ["임윤찬", "피아노", "리사이틀"]
   예) "베토벤 교향곡 9번" → ["베토벤", "교향곡"]
3. 혼합 프로그램은 해당하는 작품형태 태그를 모두 선택합니다.
   예) "피아노 협주곡 + 교향곡" 프로그램 → ["협주곡", "교향곡"] 둘 다
   예) "베토벤 교향곡 9번(합창)" → ["교향곡", "합창"] 둘 다
4. 협주곡은 독주 악기 태그도 함께 선택합니다.
   예) "피아노 협주곡" → ["협주곡", "피아노"]
   예) "바이올린 협주곡" → ["협주곡", "바이올린"]
   단, 원래 피아노곡을 오케스트라로 편곡한 경우에는 피아노 태그 없음.
5. 성악가(소프라노·메조소프라노·테너·바리톤·베이스)가 협연하는 공연은 성악 태그를 선택합니다.
   예) 오케스트라 공연에 소프라노 협연 → 성악 태그 포함
6. 프로그램에 여러 작곡가의 작품이 포함되면 해당 작곡가를 모두 태깅합니다.
   예) "바흐·모차르트·베토벤 작품" → ["바흐", "모차르트", "베토벤"] 모두
7. 아티스트 태그는 해당 공연의 주요 출연자/단체일 때 선택합니다.
8. 작품형태 태그 구분 기준:
   - 합창: 미사(Mass), 레퀴엠(Requiem), 오라토리오, 칸타타, 모테트 등 합창단이 참여하는 대규모 성악·합창 작품. 바흐 미사 b단조, 헨델 메시아, 베토벤 합창 교향곡 등이 해당.
   - 실내악: 현악 4중주, 피아노 트리오 등 소규모 기악 앙상블(보통 8명 이하). 합창·성악 작품에는 실내악 태그를 붙이지 않음.
   - 오페라: 오페라 공연 또는 오페라 갈라 콘서트.
   - 리사이틀: 독주자나 독창자 한 명이 중심이 되는 공연. 독주회, 독창회 포함.
   - 교향곡: 오케스트라가 교향곡을 연주하는 공연.
   - 협주곡: 독주 악기와 오케스트라가 협연하는 공연.
9. 정보가 부족해도 파악 가능한 태그는 반드시 포함하고, 반드시 JSON 형식으로만 응답하세요: {"공연ID": ["태그1", "태그2"]}`;

function buildTagList() {
  return Object.entries(TAXONOMY)
    .map(([cat, tags]) => `[${cat}] ${tags.join(", ")}`)
    .join("\n");
}

function buildTextPrompt(concerts) {
  return `태그 목록:\n${buildTagList()}\n\n공연 목록:\n${concerts
    .map(
      (c) =>
        `[${c.id}]\n제목: ${c.title || ""}\n출연: ${c.performers || ""}\n제작: ${c.producer || ""}\n내용: ${(c.synopsis || "").slice(0, 400)}`
    )
    .join("\n\n")}`;
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();

    // 1024px 이하로 리사이즈 + JPEG 압축 (5MB 제한 대응)
    const resized = await sharp(Buffer.from(buffer))
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resized.toString("base64");
    return { base64, mediaType: "image/jpeg" };
  } catch {
    return null;
  }
}

async function tagTextBatch(concerts) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildTextPrompt(concerts) }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("JSON 파싱 실패, 빈 태그 처리:", text.slice(0, 100));
    return Object.fromEntries(concerts.map((c) => [c.id, []]));
  }
  return JSON.parse(jsonMatch[0]);
}

async function tagImageConcert(concert) {
  const imageUrls = (concert.intro_images ?? []).slice(0, 3);
  if (imageUrls.length === 0) return { [concert.id]: [] };

  // 최대 3장 병렬 fetch
  const imgDataList = (
    await Promise.all(imageUrls.map(fetchImageAsBase64))
  ).filter(Boolean);

  // 이미지 fetch 전부 실패 시 텍스트로 대체
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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `태그 목록:\n${buildTagList()}\n\n공연 ID: ${concert.id}\n제목: ${concert.title || ""}\n출연: ${concert.performers || ""}\n제작: ${concert.producer || ""}\n\n위 이미지(${imgDataList.length}장)는 이 공연의 소개 이미지입니다. 모든 이미지를 참고하여 태그를 선택해주세요.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // 이미지에서 정보를 못 찾으면 제목+출연자 텍스트로 재시도
    console.warn(`이미지 JSON 파싱 실패, 텍스트 태깅으로 재시도: ${concert.id}`);
    return await tagTextBatch([concert]);
  }
  return JSON.parse(jsonMatch[0]);
}

async function updateTags(id, tags) {
  const { error } = await supabase
    .from("concerts")
    .update({ tags })
    .eq("id", id);
  if (error) throw error;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("태깅 시작...");

  const { data: concerts, error } = await supabase
    .from("concerts")
    .select("id, title, synopsis, performers, producer, intro_images")
    .is("tags", null);

  if (error) throw error;
  console.log(`태깅할 공연: ${concerts.length}건`);

  const textConcerts = concerts.filter((c) => c.synopsis?.trim());
  const imageConcerts = concerts.filter(
    (c) => !c.synopsis?.trim() && c.intro_images?.length > 0
  );
  const nothingConcerts = concerts.filter(
    (c) => !c.synopsis?.trim() && !c.intro_images?.length
  );

  console.log(
    `텍스트: ${textConcerts.length}건 | 이미지: ${imageConcerts.length}건 | 정보없음: ${nothingConcerts.length}건`
  );

  let success = 0;
  let fail = 0;

  // 1. 텍스트 + 정보없음: 배치 처리
  const allTextConcerts = [...textConcerts, ...nothingConcerts];
  for (let i = 0; i < allTextConcerts.length; i += TEXT_BATCH_SIZE) {
    const batch = allTextConcerts.slice(i, i + TEXT_BATCH_SIZE);
    console.log(
      `[텍스트] ${i + 1}~${Math.min(i + TEXT_BATCH_SIZE, allTextConcerts.length)} / ${allTextConcerts.length}`
    );
    try {
      const result = await tagTextBatch(batch);
      for (const concert of batch) {
        const tags = result[concert.id] ?? [];
        await updateTags(concert.id, tags);
        success++;
      }
    } catch (e) {
      console.error(`텍스트 배치 실패:`, e.message);
      fail += batch.length;
    }
    await sleep(300);
  }

  // 2. 이미지: 1건씩 처리
  for (let i = 0; i < imageConcerts.length; i++) {
    const concert = imageConcerts[i];
    if (i === 0 || (i + 1) % 20 === 0) {
      console.log(`[이미지] ${i + 1} / ${imageConcerts.length}`);
    }
    try {
      const result = await tagImageConcert(concert);
      const tags = result[concert.id] ?? [];
      await updateTags(concert.id, tags);
      success++;
    } catch (e) {
      console.error(`이미지 태깅 실패 ${concert.id}:`, e.message);
      fail++;
    }
    await sleep(200);
  }

  console.log(`\n완료: 성공 ${success}건, 실패 ${fail}건`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
