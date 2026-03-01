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

const SYSTEM_PROMPT = `공연 정보에서 구체적인 공연 날짜 목록을 추출해주세요.

추출 규칙:
1. "YYYY년 M월 D일" 형식으로 날짜를 추출합니다.
2. 날짜에 연도가 명시되지 않은 경우, 반드시 제공된 공연 기간(시작일~종료일)의 연도를 기준으로 추론하세요.
3. 시간 정보가 있으면 날짜 뒤에 "HH:MM" 형태로 함께 추출합니다.
   예) "2026년 1월 5일 19:30"
4. 날짜 정보를 전혀 찾을 수 없으면 dates를 null로 반환합니다.
5. 날짜 범위("1월 5일~10일")는 개별 날짜로 풀지 말고 그대로 반환합니다.
6. 반드시 JSON 형식으로만 응답하세요.
   형식: {"dates": ["2026년 1월 5일 19:30", "2026년 1월 10일 15:00"]}
   또는: {"dates": null}`;

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const resized = await sharp(Buffer.from(buffer))
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return null;
  }
}

function buildTextContent(concert) {
  return `공연 ID: ${concert.id}
제목: ${concert.title}
공연 기간: ${concert.start_date} ~ ${concert.end_date}

공연 설명:
${(concert.synopsis || "").slice(0, 1500)}`;
}

async function extractFromText(concert) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildTextContent(concert) }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return parsed.dates ?? null;
  } catch {
    return null;
  }
}

async function extractFromImages(concert) {
  const imageUrls = (concert.intro_images ?? []).slice(0, 3);
  if (imageUrls.length === 0) return null;

  const imgDataList = (
    await Promise.all(imageUrls.map(fetchImageAsBase64))
  ).filter(Boolean);

  if (imgDataList.length === 0) return null;

  const imageBlocks = imgDataList.map((img) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType,
      data: img.base64,
    },
  }));

  const response = await anthropic.messages.create({
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
            text: `공연 ID: ${concert.id}
제목: ${concert.title}
공연 기간: ${concert.start_date} ~ ${concert.end_date}

위 이미지(${imgDataList.length}장)는 이 공연의 소개 이미지입니다. 이미지에서 구체적인 공연 날짜를 찾아주세요.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return parsed.dates ?? null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("스케줄 추출 시작...");

  const { data: allConcerts, error } = await supabase
    .from("concerts")
    .select("id, title, start_date, end_date, synopsis, intro_images")
    .eq("schedule_extracted", false);

  if (error) throw error;

  const concerts = allConcerts.filter((c) => c.start_date !== c.end_date);
  console.log(
    `전체 schedule=null: ${allConcerts.length}건 → 여러날 공연: ${concerts.length}건`
  );

  const hasSynopsis = concerts.filter((c) => c.synopsis?.trim());
  const noSynopsis = concerts.filter((c) => !c.synopsis?.trim());
  console.log(
    `시놉시스 있음: ${hasSynopsis.length}건 | 없음: ${noSynopsis.length}건`
  );

  let extracted = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < concerts.length; i++) {
    const concert = concerts[i];
    if (i === 0 || (i + 1) % 20 === 0) {
      console.log(`처리 중: ${i + 1} / ${concerts.length}`);
    }

    try {
      let dates = null;

      // 1. 시놉시스에서 먼저 시도
      if (concert.synopsis?.trim()) {
        dates = await extractFromText(concert);
      }

      // 2. 시놉시스에서 못 찾았으면 이미지에서 시도
      if (!dates && concert.intro_images?.length > 0) {
        dates = await extractFromImages(concert);
      }

      if (dates && dates.length > 0) {
        const schedule = dates.join("\n");
        const { error: updateError } = await supabase
          .from("concerts")
          .update({ schedule, schedule_extracted: true })
          .eq("id", concert.id);

        if (updateError) throw updateError;
        console.log(`  ✓ ${concert.title}: ${dates.length}개 날짜`);
        extracted++;
      } else {
        // 날짜 없어도 추출 시도 완료 표시
        await supabase
          .from("concerts")
          .update({ schedule_extracted: true })
          .eq("id", concert.id);
        notFound++;
      }
    } catch (e) {
      console.error(`  ✗ 실패 ${concert.id}:`, e.message);
      failed++;
    }

    await sleep(200);
  }

  console.log(
    `\n완료: 추출 성공 ${extracted}건, 날짜 없음 ${notFound}건, 실패 ${failed}건`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
