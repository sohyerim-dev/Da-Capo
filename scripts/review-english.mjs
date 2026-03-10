import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PORT = 3459;

const HAS_EN = /[a-zA-Z]/;

async function fetchConcerts() {
  const { data, error } = await supabase
    .from("concerts")
    .select("id, title, poster, intro_images, synopsis, tags, ai_keywords, performers, status")
    .in("status", ["공연예정", "공연중"])
    .not("tags", "is", null)
    .order("title");

  if (error) throw error;

  return (data || []).filter(function (c) {
    var tags = c.tags || [];
    var kws = c.ai_keywords || [];
    return tags.concat(kws).some(function (t) { return HAS_EN.test(t); });
  });
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
let counts = { edited: 0, skipped: 0 };

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
  document.getElementById("cnt-edited").textContent = counts.edited;
  document.getElementById("cnt-skipped").textContent = counts.skipped;
  const done = counts.edited + counts.skipped;
  document.getElementById("progress").textContent = done + " / " + concerts.length + "건 처리";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function() { t.classList.remove("show"); }, 2000);
}

function markDone(card, type) {
  const labels = { edited: "수정됨", skipped: "건너뜀" };
  const classes = { edited: "badge-edited", skipped: "badge-skipped" };
  var oldBadge = card.querySelector(".status-badge");
  if (oldBadge) oldBadge.remove();

  const badge = document.createElement("span");
  badge.className = "status-badge " + classes[type];
  badge.textContent = labels[type];
  card.querySelector(".card-title").appendChild(badge);
  card.classList.add("done");
  counts[type]++;
  updateStats();
}

const HAS_EN = /[a-zA-Z]/;

function renderCard(c) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = c.id;

  const tags = c.tags || [];
  const kws = c.ai_keywords || [];
  const enTags = tags.filter(function(t) { return HAS_EN.test(t); });
  const enKws = kws.filter(function(t) { return HAS_EN.test(t); });
  const normalTags = tags.filter(function(t) { return !HAS_EN.test(t); });
  const normalKws = kws.filter(function(t) { return !HAS_EN.test(t); });

  var tagsHtml = normalTags.map(function(t) {
    return '<span class="tag tag-normal">' + t + '</span>';
  }).join("") + enTags.map(function(t) {
    return '<span class="tag tag-en">' + t + '</span>';
  }).join("");

  var kwsHtml = normalKws.map(function(t) {
    return '<span class="tag tag-normal">' + t + '</span>';
  }).join("") + enKws.map(function(t) {
    return '<span class="tag tag-en">' + t + '</span>';
  }).join("");

  const allImages = [c.poster].concat(c.intro_images || []).filter(Boolean);
  const imagesHtml = allImages.map(function(src) {
    return '<img src="' + src + '" alt="" loading="lazy" />';
  }).join("");

  card.innerHTML =
    '<div class="card-images">' + (imagesHtml || '<div class="card-poster--empty">이미지 없음</div>') + '</div>' +
    '<div class="card-body">' +
      '<div class="card-meta"><span class="card-id">' + c.id + '</span></div>' +
      '<div class="card-title">' + (c.title || "") + '</div>' +
      '<div class="card-performers"><span class="card-label">출연진</span> ' + (c.performers || '<span class="empty-label">정보 없음</span>') + '</div>' +
      '<div class="card-section"><span class="card-label">태그</span><div class="card-tags">' + (tagsHtml || '<span class="empty-label">없음</span>') + '</div></div>' +
      '<div class="card-section"><span class="card-label">키워드</span><div class="card-tags">' + (kwsHtml || '<span class="empty-label">없음</span>') + '</div></div>' +
      '<div class="edit-area">' +
        '<div class="edit-group">' +
          '<label>태그 (쉼표 구분)</label>' +
          '<textarea class="input-tags" rows="3">' + tags.join(", ") + '</textarea>' +
        '</div>' +
        '<div class="edit-group">' +
          '<label>키워드 (쉼표 구분)</label>' +
          '<textarea class="input-kws" rows="3">' + kws.join(", ") + '</textarea>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button class="btn-save">저장</button>' +
      '<button class="btn-skip">건너뜀</button>' +
    '</div>';

  card.querySelectorAll(".card-images img").forEach(function(img) {
    img.addEventListener("click", function() {
      var w = window.open("", "_blank");
      w.document.write(
        '<html><head><style>' +
        'body{margin:0;background:#000;overflow:auto;cursor:zoom-in}' +
        '.fit{display:flex;justify-content:center;align-items:center;min-height:100vh}' +
        '.fit img{max-width:100%;max-height:100vh;object-fit:contain}' +
        '.full img{max-width:none;max-height:none;cursor:zoom-out}' +
        '.grab{cursor:grabbing!important}' +
        '</style></head><body>' +
        '<div class="wrap fit"><img src="' + img.src + '"></div>' +
        '<scr' + 'ipt>' +
        'var wrap=document.querySelector(".wrap"),im=document.querySelector("img"),zoomed=false,space=false,dragging=false,sx,sy,sl,st;' +
        'im.addEventListener("click",function(){if(dragging)return;zoomed=!zoomed;if(zoomed){wrap.className="wrap full";document.body.style.cursor="zoom-out"}else{wrap.className="wrap fit";document.body.style.cursor="zoom-in";window.scrollTo(0,0)}});' +
        'document.addEventListener("keydown",function(e){if(e.code==="Space"){e.preventDefault();space=true;document.body.style.cursor="grab"}});' +
        'document.addEventListener("keyup",function(e){if(e.code==="Space"){space=false;dragging=false;document.body.style.cursor=zoomed?"zoom-out":"zoom-in";document.body.classList.remove("grab")}});' +
        'document.addEventListener("mousedown",function(e){if(space){dragging=true;sx=e.clientX;sy=e.clientY;sl=window.scrollX;st=window.scrollY;document.body.classList.add("grab");e.preventDefault()}});' +
        'document.addEventListener("mousemove",function(e){if(dragging){window.scrollTo(sl-(e.clientX-sx),st-(e.clientY-sy))}});' +
        'document.addEventListener("mouseup",function(){if(dragging){dragging=false;document.body.classList.remove("grab");document.body.style.cursor=space?"grab":zoomed?"zoom-out":"zoom-in"}});' +
        '</scr' + 'ipt></body></html>'
      );
    });
  });

  card.querySelector(".btn-save").addEventListener("click", async function() {
    var newTags = card.querySelector(".input-tags").value.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
    var newKws = card.querySelector(".input-kws").value.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
    try {
      await sbUpdate(c.id, {
        tags: newTags.length > 0 ? newTags : null,
        ai_keywords: newKws.length > 0 ? newKws : null
      });
      showToast("저장됨");
      markDone(card, "edited");
    } catch (e) {
      showToast("오류: " + e.message);
    }
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
    .dot-edited { background: #3b82f6; }
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
    .card-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .card-label { font-size: 11px; font-weight: 600; color: #a1a1aa; margin-right: 4px; }
    .card-performers { font-size: 12px; color: #52525b; margin-bottom: 8px; line-height: 1.5; }
    .card-section { margin-bottom: 8px; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
    .tag-normal { background: #f4f4f5; color: #52525b; }
    .tag-en { background: #fff7ed; color: #ea580c; font-weight: 700; border: 1px solid #fdba74; }
    .empty-label { font-size: 12px; color: #a1a1aa; }
    .edit-area { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .edit-group label { font-size: 11px; font-weight: 600; color: #71717a; display: block; margin-bottom: 4px; }
    .edit-group textarea { width: 100%; border: 1px solid #e4e4e7; border-radius: 6px; padding: 8px 10px; font-size: 12px; font-family: inherit; resize: vertical; line-height: 1.6; }
    .edit-group textarea:focus { outline: none; border-color: #3b82f6; }
    .card-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f4f4f5; }
    button { cursor: pointer; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; transition: background 0.15s; white-space: nowrap; }
    .btn-save { background: #3b82f6; color: #fff; }
    .btn-save:hover { background: #2563eb; }
    .btn-skip { background: #f4f4f5; color: #71717a; }
    .btn-skip:hover { background: #e4e4e7; }
    .status-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
    .badge-edited { background: #dbeafe; color: #2563eb; }
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
    "  <title>영어 태그 검수</title>\n" +
    "  <style>" + css + "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    "<header>\n" +
    '  <h1>영어 태그/키워드 검수</h1>\n' +
    '  <div id="stats">' +
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
  console.log("영어 태그 검수 공연 로딩 중...");
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
