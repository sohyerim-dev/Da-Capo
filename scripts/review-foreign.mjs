import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PORT = 3457;

async function fetchConcerts() {
  // pending_foreign_tags가 비어있지 않은 공연 조회
  const { data, error } = await supabase
    .from("concerts")
    .select("id, title, poster, intro_images, synopsis, tags, pending_foreign_tags, performers, status")
    .not("pending_foreign_tags", "eq", "{}")
    .order("title");

  if (error) throw error;
  return (data || []).filter((c) => c.pending_foreign_tags && c.pending_foreign_tags.length > 0);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let buf = "";
    req.on("data", function (chunk) { buf += chunk; });
    req.on("end", function () { resolve(buf); });
    req.on("error", reject);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "PATCH" && url.pathname.startsWith("/api/concerts/")) {
    const id = url.pathname.split("/").pop();
    const body = JSON.parse(await readBody(req));
    const { error } = await supabase.from("concerts").update(body).eq("id", id);
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    }
    return true;
  }
  return false;
}

function clientScript(data) {
  return `
const concerts = ${data};
let counts = { approved: 0, rejected: 0, skipped: 0 };

async function sbUpdate(id, body) {
  const res = await fetch("/api/concerts/" + id, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(function() { return {}; });
    throw new Error("Update failed: " + (err.error || res.status));
  }
}

function updateStats() {
  document.getElementById("cnt-approved").textContent = counts.approved;
  document.getElementById("cnt-rejected").textContent = counts.rejected;
  document.getElementById("cnt-skipped").textContent = counts.skipped;
  const done = counts.approved + counts.rejected + counts.skipped;
  document.getElementById("progress").textContent = done + " / " + concerts.length + "건 처리";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function() { t.classList.remove("show"); }, 2000);
}

function markDone(card, type) {
  const labels = { approved: "승인", rejected: "거부", skipped: "건너뜀" };
  const classes = { approved: "badge-approved", rejected: "badge-rejected", skipped: "badge-skipped" };
  const badge = document.createElement("span");
  badge.className = "status-badge " + classes[type];
  badge.textContent = labels[type];
  card.querySelector(".card-title").appendChild(badge);
  card.classList.add("done");
  counts[type]++;
  updateStats();
}

function renderCard(c) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = c.id;

  const pendingTags = c.pending_foreign_tags || [];

  const tagsHtml = (c.tags || []).map(function(t) {
    return '<span class="tag tag-normal">' + t + '</span>';
  }).join("");

  const pendingHtml = pendingTags.map(function(t) {
    return '<span class="tag tag-pending">' + t + '</span>';
  }).join("");

  const allImages = [c.poster].concat(c.intro_images || []).filter(Boolean);
  const imagesHtml = allImages.map(function(src) {
    return '<img src="' + src + '" alt="" loading="lazy" />';
  }).join("");

  card.innerHTML =
    '<div class="card-images">' + (imagesHtml || '<div class="card-poster--empty">이미지 없음</div>') + '</div>' +
    '<div class="card-body">' +
      '<div class="card-meta">' +
        '<span class="card-status card-status--' + (c.status || '').replace(/ /g, '') + '">' + (c.status || '') + '</span>' +
        '<span class="card-id">' + c.id + '</span>' +
      '</div>' +
      '<div class="card-title">' + (c.title || "") + '</div>' +
      '<div class="card-performers"><span class="card-label">출연진</span> ' + (c.performers || '<span class="empty-label">정보 없음</span>') + '</div>' +
      (c.synopsis ? '<div class="card-synopsis"><span class="card-label">시놉시스</span><div class="card-synopsis-text">' + c.synopsis + '</div></div>' : '') +
      '<div class="card-section"><span class="card-label">현재 태그</span><div class="card-tags">' + (tagsHtml || '<span class="empty-label">없음</span>') + '</div></div>' +
      '<div class="card-section"><span class="card-label">AI 제안 (검수 대기)</span><div class="card-tags">' + pendingHtml + '</div></div>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button class="btn-approve" title="태그에 반영">승인 (태그 추가)</button>' +
      '<button class="btn-reject" title="반영하지 않음">거부 (추가 안 함)</button>' +
      '<button class="btn-skip">건너뜀</button>' +
    '</div>';

  card.querySelectorAll(".card-images img").forEach(function(img) {
    img.addEventListener("click", function() { window.open(img.src, "_blank"); });
  });

  card.querySelector(".btn-approve").addEventListener("click", async function() {
    // pending 태그를 tags에 추가하고 pending 초기화
    const newTags = (c.tags || []).concat(pendingTags);
    await sbUpdate(c.id, { tags: newTags, pending_foreign_tags: [] });
    showToast("태그 반영됨: " + pendingTags.join(", "));
    markDone(card, "approved");
  });

  card.querySelector(".btn-reject").addEventListener("click", async function() {
    // pending만 초기화 (tags 변경 없음)
    await sbUpdate(c.id, { pending_foreign_tags: [] });
    showToast("거부됨 (태그 미반영)");
    markDone(card, "rejected");
  });

  card.querySelector(".btn-skip").addEventListener("click", function() {
    showToast("건너뜀");
    markDone(card, "skipped");
  });

  return card;
}

const list = document.getElementById("list");
if (concerts.length === 0) {
  list.innerHTML = '<div class="empty">검수할 공연이 없습니다.</div>';
} else {
  concerts.forEach(function(c) { list.appendChild(renderCard(c)); });
}
updateStats();
`;
}

function generateHtml(concerts) {
  const data = JSON.stringify(concerts).replace(/<\//g, "<\\/");
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f4f5; color: #111; }
    header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e4e4e7; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    header h1 { font-size: 16px; font-weight: 700; flex-shrink: 0; }
    #progress { font-size: 13px; color: #71717a; flex-shrink: 0; }
    #stats { font-size: 13px; display: flex; gap: 16px; }
    .stat { display: flex; align-items: center; gap: 4px; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-approved { background: #22c55e; }
    .dot-rejected { background: #ef4444; }
    .dot-skipped { background: #a1a1aa; }
    main { max-width: 900px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #fff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; transition: opacity 0.3s; }
    .card.done { opacity: 0.25; pointer-events: none; }
    .card-images { display: flex; gap: 6px; overflow-x: auto; padding: 12px; background: #f9f9f9; border-bottom: 1px solid #f0f0f0; }
    .card-images img { height: 160px; width: auto; border-radius: 6px; flex-shrink: 0; object-fit: cover; cursor: pointer; }
    .card-poster--empty { font-size: 11px; color: #a1a1aa; padding: 40px 0; text-align: center; }
    .card-body { padding: 14px 16px; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .card-id { font-size: 10px; color: #a1a1aa; font-family: monospace; }
    .card-status { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: #f0fdf4; color: #16a34a; }
    .card-status--공연완료 { background: #f4f4f5; color: #71717a; }
    .card-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .card-label { font-size: 11px; font-weight: 600; color: #a1a1aa; margin-right: 4px; }
    .card-performers { font-size: 12px; color: #52525b; margin-bottom: 8px; line-height: 1.5; }
    .card-synopsis { margin-bottom: 10px; }
    .card-synopsis-text { font-size: 12px; color: #52525b; line-height: 1.6; white-space: pre-line; max-height: 120px; overflow-y: auto; margin-top: 4px; }
    .card-section { margin-bottom: 8px; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
    .tag-normal { background: #f4f4f5; color: #52525b; }
    .tag-pending { background: #fff7ed; color: #ea580c; font-weight: 700; border: 1px solid #fdba74; }
    .empty-label { font-size: 12px; color: #a1a1aa; }
    .card-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f4f4f5; }
    button { cursor: pointer; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; transition: background 0.15s; white-space: nowrap; }
    .btn-approve { background: #22c55e; color: #fff; }
    .btn-approve:hover { background: #16a34a; }
    .btn-reject { background: #ef4444; color: #fff; }
    .btn-reject:hover { background: #dc2626; }
    .btn-skip { background: #f4f4f5; color: #71717a; }
    .btn-skip:hover { background: #e4e4e7; }
    .status-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
    .badge-approved { background: #dcfce7; color: #16a34a; }
    .badge-rejected { background: #fef2f2; color: #dc2626; }
    .badge-skipped { background: #f4f4f5; color: #71717a; }
    .empty { text-align: center; padding: 80px 0; color: #a1a1aa; font-size: 15px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 13px; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 100; }
    .toast.show { opacity: 1; }
  `;

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="ko">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    "  <title>해외 태그 검수</title>\n" +
    "  <style>" + css + "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    "<header>\n" +
    '  <h1>해외 연주자/단체 태그 검수</h1>\n' +
    '  <div id="stats">' +
    '    <span class="stat"><span class="stat-dot dot-approved"></span><span id="cnt-approved">0</span> 승인</span>' +
    '    <span class="stat"><span class="stat-dot dot-rejected"></span><span id="cnt-rejected">0</span> 거부</span>' +
    '    <span class="stat"><span class="stat-dot dot-skipped"></span><span id="cnt-skipped">0</span> 건너뜀</span>' +
    "  </div>\n" +
    '  <div id="progress"></div>\n' +
    "</header>\n" +
    '<main id="list"></main>\n' +
    '<div class="toast" id="toast"></div>\n' +
    "<script>" +
    clientScript(data) +
    "</script>\n" +
    "</body>\n" +
    "</html>"
  );
}

async function main() {
  console.log("해외 태그 검수 대기 공연 로딩 중...");
  const concerts = await fetchConcerts();
  console.log(`✓ ${concerts.length}건 로드됨`);
  const html = generateHtml(concerts);

  const server = createServer(async function (req, res) {
    try {
      const handled = await handleApi(req, res);
      if (handled) return;

      if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end("Internal server error");
    }
  });

  server.listen(PORT, function () {
    console.log("✓ 검수 서버 시작 (" + concerts.length + "건)");
    console.log("  http://localhost:" + PORT);
  });
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
