import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PORT = 3456;

async function fetchConcerts() {
  const { data, error } = await supabase
    .from("concerts")
    .select("id, title, poster, intro_images, tags, ai_keywords, performers, synopsis, status")
    .eq("need_review", true)
    .in("status", ["공연예정", "공연중"])
    .order("title");

  if (error) throw error;
  return data;
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
let counts = { approved: 0, edited: 0, skipped: 0 };

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
  document.getElementById("cnt-edited").textContent = counts.edited;
  document.getElementById("cnt-skipped").textContent = counts.skipped;
  const done = counts.approved + counts.edited + counts.skipped;
  document.getElementById("progress").textContent = done + " / " + concerts.length + "건 처리";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function() { t.classList.remove("show"); }, 2000);
}

function markDone(card, type) {
  const labels = { approved: "승인됨", edited: "수정됨", skipped: "건너뜀" };
  const classes = { approved: "badge-approved", edited: "badge-edited", skipped: "badge-skipped" };
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

  const allImages = [c.poster].concat(c.intro_images || []).filter(Boolean);
  const imagesHtml = allImages.map(function(src) {
    return '<img src="' + src + '" alt="" loading="lazy" />';
  }).join("");

  const tagsHtml = (c.tags || []).map(function(t) {
    return '<span class="tag tag-taxonomy">' + t + '</span>';
  }).join("") || "<span class='empty-label'>없음</span>";

  const kwHtml = (c.ai_keywords || []).map(function(k) {
    return '<span class="tag tag-keyword">' + k + '</span>';
  }).join("") || "<span class='empty-label'>없음</span>";

  card.innerHTML =
    '<div class="card-images">' + imagesHtml + '</div>' +
    '<div class="card-body">' +
      '<div class="card-id">' + c.id + '</div>' +
      '<div class="card-title">' + (c.title || "") + '</div>' +
      (c.performers ? '<div class="card-performers">' + c.performers + '</div>' : "") +
      (c.synopsis ? '<div class="card-section"><div class="card-label">시놉시스</div><div class="card-synopsis">' + c.synopsis + '</div></div>' : "") +
      '<div class="card-section"><div class="card-label">태그</div><div class="tags">' + tagsHtml + '</div></div>' +
      '<div class="card-section"><div class="card-label">키워드</div><div class="tags">' + kwHtml + '</div></div>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button class="btn-approve">✓ 승인</button>' +
      '<button class="btn-edit">✎ 수정</button>' +
      '<button class="btn-skip">건너뜀</button>' +
    '</div>' +
    '<div class="edit-area">' +
      '<label>태그 (쉼표 구분)</label>' +
      '<input class="input-tags" type="text" value="' + (c.tags || []).join(", ") + '" />' +
      '<label>키워드 (쉼표 구분)</label>' +
      '<input class="input-kws" type="text" value="' + (c.ai_keywords || []).join(", ") + '" />' +
      '<button class="btn-save">저장</button>' +
    '</div>';

  card.querySelectorAll(".card-images img").forEach(function(img) {
    img.addEventListener("click", function() {
      window.open(img.src, "_blank");
    });
  });

  card.querySelector(".btn-approve").addEventListener("click", async function() {
    await sbUpdate(c.id, { need_review: false });
    showToast("승인됨");
    markDone(card, "approved");
  });

  card.querySelector(".btn-skip").addEventListener("click", function() {
    showToast("건너뜀");
    markDone(card, "skipped");
  });

  card.querySelector(".btn-edit").addEventListener("click", function() {
    card.querySelector(".edit-area").classList.toggle("open");
  });

  card.querySelector(".btn-save").addEventListener("click", async function() {
    const newTags = card.querySelector(".input-tags").value.split(",").map(function(t) { return t.trim(); }).filter(Boolean);
    const newKws = card.querySelector(".input-kws").value.split(",").map(function(k) { return k.trim(); }).filter(Boolean);
    await sbUpdate(c.id, { tags: newTags, ai_keywords: newKws, need_review: false });
    showToast("수정 저장됨");
    markDone(card, "edited");
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
    .dot-edited { background: #3b82f6; }
    .dot-skipped { background: #a1a1aa; }
    main { max-width: 900px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #fff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; transition: opacity 0.3s; }
    .card.done { opacity: 0.35; pointer-events: none; }
    .card-images { display: flex; gap: 6px; overflow-x: auto; padding: 12px; background: #f9f9f9; border-bottom: 1px solid #f0f0f0; }
    .card-images img { height: 140px; width: auto; border-radius: 6px; flex-shrink: 0; object-fit: cover; cursor: pointer; }
    .card-body { padding: 16px; }
    .card-id { font-size: 10px; color: #a1a1aa; font-family: monospace; margin-bottom: 4px; }
    .card-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .card-performers { font-size: 12px; color: #71717a; margin-bottom: 12px; }
    .card-section { margin-bottom: 10px; }
    .card-label { font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
    .tag-taxonomy { background: #eff6ff; color: #2563eb; }
    .tag-keyword { background: #f0fdf4; color: #16a34a; }
    .card-synopsis { font-size: 12px; color: #52525b; line-height: 1.6; white-space: pre-line; }
    .empty-label { font-size: 12px; color: #a1a1aa; }
    .card-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f4f4f5; }
    button { cursor: pointer; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; padding: 6px 14px; transition: background 0.15s; }
    .btn-approve { background: #22c55e; color: #fff; }
    .btn-approve:hover { background: #16a34a; }
    .btn-edit { background: #3b82f6; color: #fff; }
    .btn-edit:hover { background: #2563eb; }
    .btn-skip { background: #f4f4f5; color: #71717a; }
    .btn-skip:hover { background: #e4e4e7; }
    .status-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
    .badge-approved { background: #dcfce7; color: #16a34a; }
    .badge-edited { background: #dbeafe; color: #2563eb; }
    .badge-skipped { background: #f4f4f5; color: #71717a; }
    .edit-area { padding: 12px 16px; border-top: 1px solid #f4f4f5; display: none; flex-direction: column; gap: 8px; }
    .edit-area.open { display: flex; }
    .edit-area label { font-size: 12px; font-weight: 600; color: #71717a; }
    .edit-area input { width: 100%; border: 1px solid #e4e4e7; border-radius: 6px; padding: 6px 10px; font-size: 13px; font-family: inherit; }
    .edit-area input:focus { outline: none; border-color: #3b82f6; }
    .btn-save { background: #111; color: #fff; align-self: flex-start; }
    .btn-save:hover { background: #333; }
    .empty { text-align: center; padding: 80px 0; color: #a1a1aa; font-size: 15px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 13px; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 100; }
    .toast.show { opacity: 1; }
  `;

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="ko">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    "  <title>태깅 검수</title>\n" +
    "  <style>" + css + "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    "<header>\n" +
    "  <h1>태깅 검수</h1>\n" +
    '  <div id="stats">' +
    '    <span class="stat"><span class="stat-dot dot-approved"></span><span id="cnt-approved">0</span> 승인</span>' +
    '    <span class="stat"><span class="stat-dot dot-edited"></span><span id="cnt-edited">0</span> 수정</span>' +
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
  console.log("공연 데이터 로딩 중...");
  const concerts = await fetchConcerts();
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
