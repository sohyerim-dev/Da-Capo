/**
 * 공연 목록 필터용 기준 날짜를 dot 형식(YYYY.MM.DD)으로 반환.
 * 19시(오후 7시) 이후면 내일 날짜를 반환하여 오늘 공연을 숨긴다.
 */
export function getCutoffDot(): string {
  const now = new Date();
  if (now.getHours() >= 19) {
    now.setDate(now.getDate() + 1);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}
