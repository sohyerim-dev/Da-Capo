/** HTTP URL을 HTTPS로 변환 (KOPIS 포스터 등 Mixed Content 방지) */
export function toHttps(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(/^http:\/\//, "https://");
}
