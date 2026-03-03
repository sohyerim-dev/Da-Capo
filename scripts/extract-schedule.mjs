import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

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

// 이미지 + 텍스트 동시 전달 (가장 정확)
async function extractFromImagesAndText(concert) {
  const imageUrls = (concert.intro_images ?? []).slice(0, 3);
  const imageBlocks = imageUrls.map((url) => ({
    type: "image_url",
    image_url: { url, detail: "high" },
  }));

  const textBlock = {
    type: "text",
    text: `공연 ID: ${concert.id}
제목: ${concert.title}
공연 기간: ${concert.start_date} ~ ${concert.end_date}
${concert.synopsis?.trim() ? `\n공연 설명:\n${concert.synopsis.slice(0, 1500)}` : ""}

위 이미지(${imageUrls.length}장)와 텍스트 정보를 모두 참고해서 구체적인 공연 날짜를 찾아주세요.`,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: [...imageBlocks, textBlock] },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.dates ?? null;
  } catch {
    return null;
  }
}

// 텍스트만 (이미지 없을 때)
async function extractFromTextOnly(concert) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `공연 ID: ${concert.id}
제목: ${concert.title}
공연 기간: ${concert.start_date} ~ ${concert.end_date}

공연 설명:
${(concert.synopsis || "").slice(0, 1500)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
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
    .eq("schedule_extracted", false)
    .in("status", ["공연예정", "공연중"]);

  if (error) throw error;

  const concerts = allConcerts.filter((c) => c.start_date !== c.end_date);
  console.log(
    `전체 미처리: ${allConcerts.length}건 → 여러날 공연: ${concerts.length}건`
  );

  const withImages = concerts.filter((c) => c.intro_images?.length > 0);
  const textOnly = concerts.filter(
    (c) => !c.intro_images?.length && c.synopsis?.trim()
  );
  console.log(
    `이미지+텍스트: ${withImages.length}건 | 텍스트만: ${textOnly.length}건`
  );

  let extracted = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < concerts.length; i++) {
    const concert = concerts[i];
    if (i === 0 || (i + 1) % 10 === 0) {
      console.log(`처리 중: ${i + 1} / ${concerts.length}`);
    }

    try {
      let dates = null;

      if (concert.intro_images?.length > 0) {
        // 이미지 + 텍스트 동시 전달
        dates = await extractFromImagesAndText(concert);
      } else if (concert.synopsis?.trim()) {
        // 이미지 없으면 텍스트만
        dates = await extractFromTextOnly(concert);
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
        // 날짜 찾지 못한 경우 — 검수 없이 바로 완료 처리
        await supabase
          .from("concerts")
          .update({ schedule_extracted: true, schedule_reviewed: true })
          .eq("id", concert.id);
        notFound++;
      }
    } catch (e) {
      console.error(`  ✗ 실패 ${concert.id}:`, e.message);
      failed++;
    }

    await sleep(300);
  }

  console.log(
    `\n완료: 추출 성공 ${extracted}건 (검수 필요), 날짜 없음 ${notFound}건, 실패 ${failed}건`
  );
  if (extracted > 0) {
    console.log(`\n검수 시작: node --env-file=.env scripts/schedule-viewer.mjs`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
