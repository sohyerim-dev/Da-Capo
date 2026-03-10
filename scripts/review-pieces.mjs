import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PORT = 3460;

async function fetchAll(table, select, filter) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchData() {
  // 미검수 공연만 조회 (pieces_reviewed = false 또는 null)
  const concerts = await fetchAll(
    "concerts",
    "id, title, poster, synopsis, performers, intro_images, status, tags",
    (q) => q.in("status", ["공연예정", "공연중"]).or("pieces_reviewed.is.null,pieces_reviewed.eq.false").order("title")
  );

  if (concerts.length === 0) return [];

  const concertIds = concerts.map((c) => c.id);

  // 해당 공연의 pieces 전체 조회 (in() 배치 처리)
  let pieces = [];
  const BATCH = 200;
  for (let i = 0; i < concertIds.length; i += BATCH) {
    const batch = concertIds.slice(i, i + BATCH);
    const chunk = await fetchAll(
      "pieces",
      "id, concert_id, title, composer, era, work_type, instruments",
      (q) => q.in("concert_id", batch).order("concert_id")
    );
    pieces = pieces.concat(chunk);
  }

  // concert별로 pieces 그룹핑
  const pieceMap = {};
  for (const p of pieces) {
    if (!pieceMap[p.concert_id]) pieceMap[p.concert_id] = [];
    pieceMap[p.concert_id].push(p);
  }

  return concerts.map((c) => ({
    ...c,
    pieces: pieceMap[c.id] || [],
  }));
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

  // PATCH /api/pieces/:id — 곡 수정
  if (req.method === "PATCH" && url.pathname.startsWith("/api/pieces/")) {
    const id = url.pathname.split("/").pop();
    const body = JSON.parse(await readBody(req));
    const { error } = await supabase.from("pieces").update(body).eq("id", id);
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    }
    return true;
  }

  // DELETE /api/pieces/:id — 곡 삭제
  if (req.method === "DELETE" && url.pathname.startsWith("/api/pieces/")) {
    const id = url.pathname.split("/").pop();
    const { error } = await supabase.from("pieces").delete().eq("id", id);
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    }
    return true;
  }

  // PATCH /api/concerts/:id/reviewed — 검수 완료
  if (req.method === "PATCH" && url.pathname.match(/^\/api\/concerts\/[^/]+\/reviewed$/)) {
    const id = url.pathname.split("/")[3];
    const { error } = await supabase.from("concerts").update({ pieces_reviewed: true }).eq("id", id);
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    }
    return true;
  }

  // POST /api/pieces — 곡 추가
  if (req.method === "POST" && url.pathname === "/api/pieces") {
    const body = JSON.parse(await readBody(req));
    const { data, error } = await supabase.from("pieces").insert(body).select("id").single();
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, id: data.id }));
    }
    return true;
  }

  return false;
}

function clientScript(data) {
  return `
var concerts = ${data};
var counts = { reviewed: 0, skipped: 0 };

var COMPOSERS = ["코렐리","퍼셀","비발디","텔레만","바흐","헨델","글루크","하이든","모차르트","베토벤","베버","파가니니","로시니","도니제티","벨리니","슈베르트","베를리오즈","멘델스존","슈만","쇼팽","리스트","바그너","베르디","브루흐","브람스","브루크너","보로딘","생상스","프랑크","비제","포레","무소르그스키","차이코프스키","드보르자크","마스네","그리그","림스키코르사코프","엘가","푸치니","말러","슈트라우스","시벨리우스","닐센","드뷔시","스크랴빈","라흐마니노프","라벨","야나체크","레스피기","바르톡","스트라빈스키","프로코피예프","힌데미트","거슈윈","쇼스타코비치","메시앙","번스타인","윤이상","아르보 패르트","진은숙"];
var ERAS = ["바로크","고전","초기 낭만","후기 낭만","근대","현대"];
var WORK_TYPES = ["관현악","교향곡","협주곡","실내악","독주곡","성악곡","합창곡","오페라","발레","음악극","가곡","영화음악"];
var INSTRUMENTS = ["피아노","바이올린","비올라","첼로","플루트","오보에","클라리넷","바순","호른","트럼펫","트롬본","튜바","하프","더블베이스","오르간","클래식 기타","성악","관악","타악","오케스트라"];

function updateStats() {
  document.getElementById("cnt-reviewed").textContent = counts.reviewed;
  document.getElementById("cnt-skipped").textContent = counts.skipped;
  var done = counts.reviewed + counts.skipped;
  document.getElementById("progress").textContent = done + " / " + concerts.length + "건 처리";
}

function showToast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function() { t.classList.remove("show"); }, 2000);
}

function makeSelect(name, options, selected) {
  var html = '<select data-field="' + name + '">';
  html += '<option value="">--</option>';
  for (var i = 0; i < options.length; i++) {
    html += '<option value="' + options[i] + '"' + (options[i] === selected ? ' selected' : '') + '>' + options[i] + '</option>';
  }
  html += '</select>';
  return html;
}

function renderPieceRow(piece) {
  var instStr = (piece.instruments || []).join(", ");
  return '<tr data-piece-id="' + piece.id + '">' +
    '<td><input type="text" value="' + (piece.title || "").replace(/"/g, '&quot;') + '" data-field="title" class="piece-input" /></td>' +
    '<td><input type="text" value="' + (piece.composer || "").replace(/"/g, '&quot;') + '" data-field="composer" class="piece-input" /></td>' +
    '<td>' + makeSelect("era", ERAS, piece.era) + '</td>' +
    '<td>' + makeSelect("work_type", WORK_TYPES, piece.work_type) + '</td>' +
    '<td><input type="text" value="' + instStr + '" data-field="instruments" class="piece-input" placeholder="쉼표 구분" /></td>' +
    '<td><button class="btn-move-up" title="위로">▲</button><button class="btn-move-down" title="아래로">▼</button> <button class="btn-save-piece" title="저장">저장</button> <button class="btn-del-piece" title="삭제">삭제</button></td>' +
    '</tr>';
}

function renderCard(c) {
  var card = document.createElement("div");
  card.className = "card";
  card.dataset.id = c.id;

  var allImages = [c.poster].concat(c.intro_images || []).filter(Boolean);
  var imagesHtml = allImages.map(function(src) {
    return '<img src="' + src + '" alt="" loading="lazy" />';
  }).join("");

  var tagsHtml = (c.tags || []).map(function(t) {
    return '<span class="tag">' + t + '</span>';
  }).join("");

  var piecesHtml = c.pieces.map(renderPieceRow).join("");

  card.innerHTML =
    '<div class="card-images">' + (imagesHtml || '<div class="card-poster--empty">이미지 없음</div>') + '</div>' +
    '<div class="card-body">' +
      '<div class="card-meta">' +
        '<span class="card-status">' + (c.status || '') + '</span>' +
        '<span class="card-id">' + c.id + '</span>' +
      '</div>' +
      '<div class="card-title">' + (c.title || "") + '</div>' +
      '<div class="card-performers"><span class="card-label">출연진</span> ' + (c.performers || '<span class="empty-label">정보 없음</span>') + '</div>' +
      (c.synopsis ? '<div class="card-synopsis"><span class="card-label">시놉시스</span><div class="card-synopsis-text">' + c.synopsis + '</div></div>' : '') +
      '<div class="card-section"><span class="card-label">기존 태그</span><div class="card-tags">' + (tagsHtml || '<span class="empty-label">없음</span>') + '</div></div>' +
      '<div class="card-section">' +
        '<span class="card-label">추출된 곡 (' + c.pieces.length + '개)</span>' +
        '<table class="pieces-table">' +
          '<thead><tr><th>곡 제목</th><th>작곡가</th><th>시대</th><th>형태</th><th>악기</th><th></th></tr></thead>' +
          '<tbody>' + piecesHtml + '</tbody>' +
        '</table>' +
        '<button class="btn-add-piece" data-concert-id="' + c.id + '">+ 곡 추가</button>' +
      '</div>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button class="btn-approve">승인</button>' +
      '<button class="btn-skip">건너뜀</button>' +
    '</div>';

  // 이미지 클릭 → 새탭 (확대 가능)
  card.querySelectorAll(".card-images img").forEach(function(img) {
    img.addEventListener("click", function() {
      var w = window.open("", "_blank");
      if (!w) return;
      w.document.write(
        '<html><head><title>이미지</title><style>' +
        'body{margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;cursor:zoom-in}' +
        'img{max-width:100%;max-height:100vh;object-fit:contain;transition:all .2s}' +
        'body.zoomed{display:block;cursor:zoom-out}' +
        'body.zoomed img{max-width:none;max-height:none;width:auto}' +
        '</style></head><body>' +
        '<img src="' + img.src + '" />' +
        '<scr' + 'ipt>' +
        'var zoomed=false;document.querySelector("img").addEventListener("click",function(){zoomed=!zoomed;document.body.className=zoomed?"zoomed":"";if(!zoomed)window.scrollTo(0,0)});' +
        '</scr' + 'ipt></body></html>'
      );
      w.document.close();
    });
  });

  // 곡 저장
  card.querySelectorAll(".btn-save-piece").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var tr = btn.closest("tr");
      var id = tr.dataset.pieceId;
      var title = tr.querySelector('[data-field="title"]').value;
      var composer = tr.querySelector('[data-field="composer"]').value || null;
      var era = tr.querySelector('[data-field="era"]').value || null;
      var workType = tr.querySelector('[data-field="work_type"]').value || null;
      var instStr = tr.querySelector('[data-field="instruments"]').value;
      var instruments = instStr ? instStr.split(",").map(function(s){return s.trim();}).filter(Boolean) : [];
      var res = await fetch("/api/pieces/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, composer: composer, era: era, work_type: workType, instruments: instruments })
      });
      if (res.ok) showToast("저장됨");
      else showToast("저장 실패");
    });
  });

  // 곡 순서 이동
  card.querySelectorAll(".btn-move-up").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var tr = btn.closest("tr");
      var prev = tr.previousElementSibling;
      if (prev) tr.parentNode.insertBefore(tr, prev);
    });
  });
  card.querySelectorAll(".btn-move-down").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var tr = btn.closest("tr");
      var next = tr.nextElementSibling;
      if (next) tr.parentNode.insertBefore(next, tr);
    });
  });

  // 곡 삭제
  card.querySelectorAll(".btn-del-piece").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var tr = btn.closest("tr");
      var id = tr.dataset.pieceId;
      if (!confirm("이 곡을 삭제하시겠습니까?")) return;
      var res = await fetch("/api/pieces/" + id, { method: "DELETE" });
      if (res.ok) { tr.remove(); showToast("삭제됨"); }
      else showToast("삭제 실패");
    });
  });

  // 곡 추가
  card.querySelector(".btn-add-piece").addEventListener("click", async function() {
    var concertId = this.dataset.concertId;
    var res = await fetch("/api/pieces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concert_id: concertId, title: "", composer: null, era: null, work_type: null, instruments: [] })
    });
    if (!res.ok) { showToast("추가 실패"); return; }
    var data = await res.json();
    var newPiece = { id: data.id, title: "", composer: null, era: null, work_type: null, instruments: [] };
    var tbody = card.querySelector(".pieces-table tbody");
    tbody.insertAdjacentHTML("beforeend", renderPieceRow(newPiece));
    // 새로 추가된 행에 이벤트 바인딩
    var newTr = tbody.lastElementChild;
    newTr.querySelector(".btn-save-piece").addEventListener("click", async function() {
      var tr = newTr;
      var id = tr.dataset.pieceId;
      var title = tr.querySelector('[data-field="title"]').value;
      var composer = tr.querySelector('[data-field="composer"]').value || null;
      var era = tr.querySelector('[data-field="era"]').value || null;
      var workType = tr.querySelector('[data-field="work_type"]').value || null;
      var instStr = tr.querySelector('[data-field="instruments"]').value;
      var instruments = instStr ? instStr.split(",").map(function(s){return s.trim();}).filter(Boolean) : [];
      var r = await fetch("/api/pieces/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, composer: composer, era: era, work_type: workType, instruments: instruments })
      });
      if (r.ok) showToast("저장됨");
      else showToast("저장 실패");
    });
    newTr.querySelector(".btn-del-piece").addEventListener("click", async function() {
      var id = newTr.dataset.pieceId;
      if (!confirm("이 곡을 삭제하시겠습니까?")) return;
      var r = await fetch("/api/pieces/" + id, { method: "DELETE" });
      if (r.ok) { newTr.remove(); showToast("삭제됨"); }
      else showToast("삭제 실패");
    });
    showToast("곡 추가됨");
  });

  // 승인 (수정된 곡 자동 저장 후 검수 완료 처리)
  card.querySelector(".btn-approve").addEventListener("click", async function() {
    // 카드 내 모든 곡 행을 저장
    var rows = card.querySelectorAll(".pieces-table tbody tr");
    var saveErrors = 0;
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var id = tr.dataset.pieceId;
      if (!id) continue;
      var title = tr.querySelector('[data-field="title"]').value;
      var composer = tr.querySelector('[data-field="composer"]').value || null;
      var era = tr.querySelector('[data-field="era"]').value || null;
      var workType = tr.querySelector('[data-field="work_type"]').value || null;
      var instStr = tr.querySelector('[data-field="instruments"]').value;
      var instruments = instStr ? instStr.split(",").map(function(s){return s.trim();}).filter(Boolean) : [];
      var r = await fetch("/api/pieces/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, composer: composer, era: era, work_type: workType, instruments: instruments, sort_order: i })
      });
      if (!r.ok) saveErrors++;
    }
    if (saveErrors > 0) {
      showToast(saveErrors + "개 곡 저장 실패");
      return;
    }
    // 검수 완료 처리
    var res = await fetch("/api/concerts/" + c.id + "/reviewed", { method: "PATCH" });
    if (res.ok) {
      card.classList.add("done");
      counts.reviewed++;
      updateStats();
      showToast("승인 완료 (" + rows.length + "곡 저장)");
    } else {
      showToast("승인 실패");
    }
  });

  // 건너뜀
  card.querySelector(".btn-skip").addEventListener("click", function() {
    card.classList.add("done");
    counts.skipped++;
    updateStats();
    showToast("건너뜀");
  });

  return card;
}

var list = document.getElementById("list");
if (concerts.length === 0) {
  list.innerHTML = '<div class="empty">검수할 공연이 없습니다.</div>';
} else {
  concerts.forEach(function(c) { list.appendChild(renderCard(c)); });
}
updateStats();
`;
}

function generateHtml(concerts) {
  var data = JSON.stringify(concerts).replace(/<\//g, "<\\/");
  var css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f4f5; color: #111; }
    header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e4e4e7; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    header h1 { font-size: 16px; font-weight: 700; flex-shrink: 0; }
    #progress { font-size: 13px; color: #71717a; flex-shrink: 0; }
    #stats { font-size: 13px; display: flex; gap: 16px; }
    .stat { display: flex; align-items: center; gap: 4px; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-reviewed { background: #22c55e; }
    .dot-skipped { background: #a1a1aa; }
    main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #fff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; transition: opacity 0.3s; }
    .card.done { opacity: 0.15; pointer-events: none; }
    .card-images { display: flex; gap: 6px; overflow-x: auto; padding: 12px; background: #f9f9f9; border-bottom: 1px solid #f0f0f0; }
    .card-images img { height: 160px; width: auto; border-radius: 6px; flex-shrink: 0; object-fit: cover; cursor: pointer; }
    .card-poster--empty { font-size: 11px; color: #a1a1aa; padding: 40px 0; text-align: center; }
    .card-body { padding: 14px 16px; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .card-id { font-size: 10px; color: #a1a1aa; font-family: monospace; }
    .card-status { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: #f0fdf4; color: #16a34a; }
    .card-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .card-label { font-size: 11px; font-weight: 600; color: #a1a1aa; margin-right: 4px; }
    .card-performers { font-size: 12px; color: #52525b; margin-bottom: 8px; line-height: 1.5; }
    .card-synopsis { margin-bottom: 10px; }
    .card-synopsis-text { font-size: 12px; color: #52525b; line-height: 1.6; white-space: pre-line; max-height: 120px; overflow-y: auto; margin-top: 4px; }
    .card-section { margin-bottom: 8px; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; background: #f4f4f5; color: #52525b; }
    .empty-label { font-size: 12px; color: #a1a1aa; }
    .pieces-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
    .pieces-table th { text-align: left; padding: 4px 6px; background: #f9fafb; border-bottom: 1px solid #e4e4e7; font-weight: 600; color: #71717a; font-size: 11px; }
    .pieces-table td { padding: 4px 6px; border-bottom: 1px solid #f4f4f5; vertical-align: middle; }
    .piece-input { width: 100%; border: 1px solid #e4e4e7; border-radius: 4px; padding: 3px 6px; font-size: 12px; }
    .pieces-table select { border: 1px solid #e4e4e7; border-radius: 4px; padding: 3px 4px; font-size: 11px; max-width: 120px; }
    .btn-move-up, .btn-move-down { background: #f4f4f5; color: #52525b; border: 1px solid #e4e4e7; border-radius: 3px; padding: 1px 5px; font-size: 10px; cursor: pointer; margin-right: 2px; }
    .btn-move-up:hover, .btn-move-down:hover { background: #e4e4e7; }
    .btn-save-piece { background: #22c55e; color: #fff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; }
    .btn-save-piece:hover { background: #16a34a; }
    .btn-del-piece { background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; }
    .btn-del-piece:hover { background: #dc2626; }
    .btn-add-piece { margin-top: 6px; background: #f4f4f5; color: #52525b; border: 1px solid #e4e4e7; border-radius: 6px; padding: 4px 12px; font-size: 12px; cursor: pointer; }
    .btn-add-piece:hover { background: #e4e4e7; }
    .card-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f4f4f5; }
    button { cursor: pointer; }
    .btn-approve { background: #22c55e; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; }
    .btn-approve:hover { background: #16a34a; }
    .btn-skip { background: #f4f4f5; color: #71717a; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; }
    .btn-skip:hover { background: #e4e4e7; }
    .empty { text-align: center; padding: 80px 0; color: #a1a1aa; font-size: 15px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 13px; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 100; }
    .toast.show { opacity: 1; }
  `;

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="ko">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    "  <title>곡(pieces) 검수</title>\n" +
    "  <style>" + css + "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    "<header>\n" +
    '  <h1>곡(pieces) 추출 검수</h1>\n' +
    '  <div id="stats">' +
    '    <span class="stat"><span class="stat-dot dot-reviewed"></span><span id="cnt-reviewed">0</span> 검수</span>' +
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
  console.log("곡 검수 데이터 로딩 중...");
  var concerts = await fetchData();
  console.log("✓ " + concerts.length + "건 로드됨 (총 곡: " + concerts.reduce(function(sum, c) { return sum + c.pieces.length; }, 0) + "개)");
  var html = generateHtml(concerts);

  var server = createServer(async function (req, res) {
    try {
      var handled = await handleApi(req, res);
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
    console.log("✓ 곡 검수 서버 시작 (" + concerts.length + "건)");
    console.log("  http://localhost:" + PORT);
  });
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
