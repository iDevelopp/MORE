/* MORE · page de suivi partagé.
   Le lien a la forme suivi.html#<identifiant>.<clé>. La clé (après le #) n'est jamais envoyée au serveur :
   elle sert seulement, ici, à déchiffrer le suivi et à chiffrer les commentaires.
   © Propriétaire – voir LICENSE. */
(function(){
  "use strict";
  var CONFIG = window.MORE_CONFIG || {};
  var REFRESH_MS = 30000;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function base(u){ return String(u || "").trim().replace(/\/(rest|auth)\/v1.*$/i, "").replace(/\/+$/, ""); }
  function b64(buf){ var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s){ var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  function unb64u(s){ s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return unb64(s); }
  function num(v){ var n = +v; return isFinite(n) && n >= 0 ? n : 0; }
  function sum(a){ return (a || []).reduce(function(x, y){ return x + num(y); }, 0); }
  function kg(v){ return (Math.round(num(v) * 10) / 10).toLocaleString("fr-FR"); }
  function fmtDur(s){ s = Math.round(num(s)); if (s < 60) return s + " s"; var m = Math.floor(s / 60), r = s % 60; return m + " min" + (r ? " " + r : ""); }
  function fmtDate(d, o){ return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", o); }
  function since(ts){
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "à l'instant"; if (m < 60) return "il y a " + m + " min";
    var h = Math.round(m / 60); if (h < 24) return "il y a " + h + " h";
    var j = Math.round(h / 24); return j === 1 ? "hier" : "il y a " + j + " jours";
  }
  function fail(title, text){ $("title").textContent = title; $("sub").textContent = text; $("content").innerHTML = ""; $("liveTag").textContent = "Lecture seule"; $("liveTag").className = "tag"; }

  var m = /^#([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(location.hash || "");
  var url = base(CONFIG.supabaseUrl), apikey = CONFIG.supabaseKey;
  var hasCrypto = !!(window.crypto && crypto.subtle && window.TextEncoder);
  if (!m){ fail("Lien incomplet", "Ce lien de suivi est incomplet : demande à la personne de te le renvoyer en entier."); return; }
  if (!url || !apikey){ fail("Suivi indisponible", "Ce site n'est pas encore relié à son serveur."); return; }
  if (!hasCrypto){ fail("Navigateur non compatible", "Ouvre ce lien dans Safari, Chrome ou Firefox (adresse en https)."); return; }

  var shareId = m[1], keyP = crypto.subtle.importKey("raw", unb64u(m[2]), "AES-GCM", false, ["encrypt", "decrypt"]);
  var snap = null, comments = [], lastStamp = "", openForm = null, busy = false;

  function rpc(name, body){
    return fetch(url + "/rest/v1/rpc/" + name, { method: "POST", headers: { "apikey": apikey, "Authorization": "Bearer " + apikey, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function(r){ return r.text().then(function(t){ var j = null; try { j = t ? JSON.parse(t) : null; } catch(e){}
        if (!r.ok) throw new Error((j && (j.message || j.msg)) || ("Erreur " + r.status)); return j; }); });
  }
  function open(blob){
    if (!blob || typeof blob.iv !== "string" || typeof blob.ct !== "string") return Promise.reject(new Error("illisible"));
    return keyP.then(function(k){ return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, k, unb64(blob.ct)); })
      .then(function(pt){ return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function seal(obj){
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return keyP.then(function(k){ return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj))); })
      .then(function(ct){ return { v: 1, alg: "AES-GCM-256", iv: b64(iv), ct: b64(ct) }; });
  }

  /* ---------- mesures (mêmes règles que l'app) ---------- */
  function mode(e){ return e.kind === "cardio" ? "cardio" : e.kind === "sol" ? "sol" : "load"; }
  function pv(e){ var md = mode(e); return md === "cardio" ? num(e.km) || num(e.minutes) : md === "sol" ? (sum(e.reps) || num(e.dur)) : num(e.weight); }
  function unit(e){ var md = mode(e); return md === "cardio" ? (num(e.km) ? "km" : "min") : md === "sol" ? (sum(e.reps) ? "reps" : "s") : "kg"; }
  function pvTxt(e){ var md = mode(e); return md === "cardio" ? (num(e.km) ? kg(e.km) + " km" : num(e.minutes) + " min") : md === "sol" ? (sum(e.reps) ? sum(e.reps) + " reps" : fmtDur(e.dur)) : kg(e.weight) + " kg"; }
  function detail(e){
    var md = mode(e), reps = (e.reps || []).filter(function(r){ return num(r) > 0; });
    if (md === "cardio") return [num(e.minutes) ? num(e.minutes) + " min" : "", num(e.km) ? kg(e.km) + " km" : "", num(e.incline) ? "pente " + kg(e.incline) + " %" : ""].filter(Boolean).join(" · ");
    if (md === "sol") return [reps.length ? reps.join(" · ") + " reps" : "", num(e.dur) ? fmtDur(e.dur) : "", num(e.weight) ? "+ " + kg(e.weight) + " kg" : ""].filter(Boolean).join(" · ");
    return reps.join(" · ") + (reps.length ? " reps" : "");
  }
  var GROUPS = { jambes: "Jambes", dos: "Dos", pecs: "Pectoraux", epaules: "Épaules", bras: "Bras", abdos: "Abdos", cardio: "Cardio", autre: "Autre" };
  var TYPES = { machine: "Machine", halteres: "Haltères", sol: "Tapis de sol", course: "Tapis de course" };

  /* ---------- graphiques et calendrier (mêmes dessins que l'app) ---------- */
  var DAY = 864e5, WD = ["L", "M", "M", "J", "V", "S", "D"];
  var V = { c: "volume", ex: null, y: new Date().getFullYear(), m: new Date().getMonth(), extra: null };
  var cur = { ents: [], byDay: {}, prKeys: {} };
  function tms(d){ return Date.parse(d + "T12:00:00"); }
  function cd(d){ return fmtDate(d, { day: "numeric", month: "short" }); }
  function pad2(n){ return (n < 10 ? "0" : "") + n; }
  function niceStep(r){ if (!(r > 0)) return 1; var e = Math.pow(10, Math.floor(Math.log10(r))), f = r / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
  function shortKg(v){ v = num(v); if (v === 0) return "0"; return v >= 1000 ? (Math.round(v / 100) / 10).toLocaleString("fr-FR") + " t" : Math.round(v) + " kg"; }
  function loadMap(){
    var map = {};
    cur.ents.forEach(function(e){ (map[e.machine] = map[e.machine] || []).push(e); });
    Object.keys(map).forEach(function(n){ map[n].sort(function(a, b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); });
    return map;
  }
  function strengthNames(map){
    return Object.keys(map).filter(function(n){ var l = map[n]; return mode(l[l.length - 1]) === "load"; })
      .sort(function(a, b){ return map[b].length - map[a].length || a.localeCompare(b, "fr"); });
  }
  function empty(msg){ return '<text x="170" y="105" text-anchor="middle">' + esc(msg) + '</text>'; }
  function lineSvg(list, vf){
    var W = 340, H = 210, pl = 40, pr = 18, pt = 22, pb = 28;
    var pts = list.map(function(e){ return { x: tms(e.date), y: vf(e), d: e.date }; });
    var xs = pts.map(function(p){ return p.x; }), ys = pts.map(function(p){ return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x0 === x1){ x0 -= 4 * DAY; x1 += 4 * DAY; }
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var pad = (y1 - y0) * 0.2 || Math.max(1, y1 * 0.12), step = niceStep((y1 - y0 + 2 * pad) / 4);
    y0 = Math.max(0, Math.floor((y0 - pad) / step) * step); y1 = Math.ceil((y1 + pad) / step) * step; if (y1 === y0) y1 = y0 + step;
    function X(v){ return pl + (v - x0) / (x1 - x0) * (W - pl - pr); }
    function Y(v){ return pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb); }
    var g = '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be22d" stop-opacity=".28"/><stop offset="1" stop-color="#9be22d" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5f5f7" stop-opacity=".55"/><stop offset="1" stop-color="#f5f5f7"/></linearGradient></defs>';
    for (var v = y0; v <= y1 + 1e-9; v += step){
      var yy = Y(v).toFixed(1);
      g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke-dasharray="3 4"/><text x="' + (pl - 8) + '" y="' + (+yy + 3.5) + '" text-anchor="end">' + kg(v) + '</text>';
    }
    var xl = [pts[0]], mid = pts[Math.floor((pts.length - 1) / 2)], lastP = pts[pts.length - 1];
    if (pts.length > 2 && X(mid.x) - X(pts[0].x) > 60 && X(lastP.x) - X(mid.x) > 60) xl.push(mid);
    if (pts.length > 1) xl.push(lastP);
    xl.forEach(function(p, i){
      var anchor = pts.length === 1 ? "middle" : (i === 0 ? "start" : (i === xl.length - 1 ? "end" : "middle"));
      g += '<text x="' + X(p.x).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor + '">' + esc(cd(p.d)) + '</text>';
    });
    var c = pts.map(function(p){ return [X(p.x), Y(p.y)]; });
    var d = "M" + c[0][0].toFixed(1) + " " + c[0][1].toFixed(1);
    for (var i = 1; i < c.length; i++){ var mx = (c[i - 1][0] + c[i][0]) / 2; d += " C" + mx.toFixed(1) + " " + c[i - 1][1].toFixed(1) + " " + mx.toFixed(1) + " " + c[i][1].toFixed(1) + " " + c[i][0].toFixed(1) + " " + c[i][1].toFixed(1); }
    if (c.length > 1){
      g += '<path class="fade" d="' + d + ' L' + c[c.length - 1][0].toFixed(1) + ' ' + (H - pb) + ' L' + c[0][0].toFixed(1) + ' ' + (H - pb) + ' Z" fill="url(#cg)"/>';
      g += '<path class="draw" pathLength="1" d="' + d + '" fill="none" stroke="url(#cl)" stroke-width="3" stroke-linecap="round"/>';
    }
    c.forEach(function(q, i){
      var last = i === c.length - 1, changed = i === 0 || last || Math.round(pts[i].y * 10) !== Math.round(pts[i - 1].y * 10);
      g += '<g class="fade">';
      if (last) g += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="10" fill="#9be22d" fill-opacity=".22"/>';
      g += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (last ? 5 : 3.5) + '" fill="' + (last ? "#9be22d" : "#000") + '" stroke="' + (last ? "#9be22d" : "#f5f5f7") + '" stroke-width="2"/>';
      if (changed) g += '<text class="val" x="' + Math.min(Math.max(q[0], pl + 10), W - pr - 6).toFixed(1) + '" y="' + (q[1] - 11).toFixed(1) + '" text-anchor="middle">' + kg(pts[i].y) + '</text>';
      g += '</g>';
    });
    return g;
  }
  function scatterSvg(l){
    var W = 340, H = 210, pl = 40, pr = 18, pt = 18, pb = 34;
    var pts = l.map(function(e, i){ var n = (e.reps || []).filter(function(r){ return num(r) > 0; }).length || 1; return { x: num(e.weight), y: sum(e.reps) / n, d: e.date, i: i }; });
    var xs = pts.map(function(p){ return p.x; }), ys = pts.map(function(p){ return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), span = (x1 - x0) || Math.max(5, x1 * 0.2), xstep = niceStep(span * 1.3 / 4);
    x0 = Math.max(0, Math.floor((x0 - span * 0.15) / xstep) * xstep); x1 = Math.ceil((x1 + span * 0.15) / xstep) * xstep; if (x1 === x0) x1 = x0 + xstep;
    var ymax = Math.ceil(Math.max(15, Math.max.apply(null, ys) + 2) / 5) * 5;
    function X(v){ return pl + (v - x0) / (x1 - x0) * (W - pl - pr); }
    function Y(v){ return pt + (1 - v / ymax) * (H - pt - pb); }
    var g = '<rect class="fade" x="' + pl + '" y="' + Y(12).toFixed(1) + '" width="' + (W - pl - pr) + '" height="' + (Y(8) - Y(12)).toFixed(1) + '" rx="6" fill="#f5f5f7" fill-opacity=".06"/>';
    for (var v = 0; v <= ymax; v += 5){ var yy = Y(v).toFixed(1); g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke-dasharray="3 4"/><text x="' + (pl - 8) + '" y="' + (+yy + 3.5) + '" text-anchor="end">' + v + '</text>'; }
    for (var xv = x0; xv <= x1 + 1e-9; xv += xstep){ g += '<text x="' + X(xv).toFixed(1) + '" y="' + (H - 16) + '" text-anchor="middle">' + kg(xv) + '</text>'; }
    g += '<text x="' + (W - pr) + '" y="' + (H - 2) + '" text-anchor="end">poids (kg) →</text><text x="' + pl + '" y="' + (pt - 6) + '" text-anchor="start">↑ reps par série</text>';
    var seen = {};
    pts.forEach(function(p){ var k = p.x + "|" + Math.round(p.y * 10); var n = seen[k] = (seen[k] || 0) + 1; p.cx = X(p.x) + (n - 1) * 8; p.cy = Y(p.y); });
    if (pts.length > 1) g += '<path class="draw" pathLength="1" d="' + pts.map(function(p, i){ return (i ? "L" : "M") + p.cx.toFixed(1) + " " + p.cy.toFixed(1); }).join(" ") + '" fill="none" stroke="#f5f5f7" stroke-opacity=".3" stroke-width="1.5" stroke-linejoin="round"/>';
    pts.forEach(function(p, i){
      var last = i === pts.length - 1, op = pts.length > 1 ? 0.35 + 0.65 * i / (pts.length - 1) : 1;
      g += '<g class="fade">';
      if (last) g += '<circle cx="' + p.cx.toFixed(1) + '" cy="' + p.cy.toFixed(1) + '" r="12" fill="#9be22d" fill-opacity=".22"/>';
      g += '<circle cx="' + p.cx.toFixed(1) + '" cy="' + p.cy.toFixed(1) + '" r="' + (last ? 6.5 : 5.5) + '" fill="' + (last ? "#9be22d" : "#f5f5f7") + '" fill-opacity="' + (last ? 1 : op.toFixed(2)) + '" stroke="' + (last ? "#9be22d" : "#000") + '" stroke-width="2"/>';
      if (last || i === 0) g += '<text class="val" x="' + Math.min(Math.max(p.cx, pl + 16), W - pr - 16).toFixed(1) + '" y="' + (p.cy - 14).toFixed(1) + '" text-anchor="middle">' + esc(cd(p.d)) + '</text>';
      g += '</g>';
    });
    return g;
  }
  function volumeSvg(){
    var groups = {};
    cur.ents.forEach(function(e){ if (mode(e) === "load") groups[e.date] = (groups[e.date] || 0) + num(e.weight) * sum(e.reps); });
    var days = Object.keys(groups).sort().slice(-12);
    if (!days.length) return { svg: empty("Pas encore de séance"), avg: "" };
    var vals = days.map(function(d){ return groups[d]; }), avg = sum(vals) / vals.length, mx = Math.max.apply(null, vals);
    var W = 340, H = 210, pl = 40, pr = 10, pt = 22, pb = 28;
    var step = niceStep(mx * 1.15 / 4), top = Math.ceil(mx * 1.15 / step) * step;
    function Y(v){ return pt + (1 - v / top) * (H - pt - pb); }
    var slot = (W - pl - pr) / days.length, bw = Math.min(30, slot * 0.62);
    var g = '<defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f5f7" stop-opacity=".9"/><stop offset="1" stop-color="#f5f5f7" stop-opacity=".25"/></linearGradient></defs>';
    for (var v = 0; v <= top + 1e-9; v += step){ var yy = Y(v).toFixed(1); g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke-dasharray="3 4"/><text x="' + (pl - 8) + '" y="' + (+yy + 3.5) + '" text-anchor="end">' + shortKg(v) + '</text>'; }
    days.forEach(function(d, i){
      var cx = pl + slot * i + slot / 2, y = Y(vals[i]), last = i === days.length - 1;
      g += '<rect class="bar" x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (H - pb - y).toFixed(1) + '" rx="7" fill="url(#vb)" opacity="' + (last ? 1 : 0.55) + '"/>';
      g += '<text class="val fade" x="' + cx.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle">' + shortKg(vals[i]) + '</text>';
      if (days.length <= 8 || i % 2 === (days.length - 1) % 2) g += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(cd(d)) + '</text>';
    });
    var ya = Y(avg).toFixed(1);
    g += '<line class="fade" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ya + '" y2="' + ya + '" stroke="#9be22d" stroke-width="1.5" stroke-dasharray="6 4"/>';
    return { svg: g, avg: "moyenne " + shortKg(avg) };
  }
  function paintCharts(){
    if (!$("cvSvg")) return;
    Array.prototype.forEach.call(document.querySelectorAll("#cvSeg button"), function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === V.c)); });
    var svg = $("cvSvg"), wrap = $("cvExWrap");
    if (V.c === "volume"){
      var o = volumeSvg(); wrap.hidden = true; $("cvTitle").textContent = "Volume par séance"; $("cvAvg").textContent = o.avg; svg.innerHTML = o.svg;
      $("cvNote").textContent = "Chaque barre = tout le poids déplacé pendant la séance (poids × répétitions, exercices avec charge). La ligne verte est la moyenne.";
      return;
    }
    var map = loadMap(), names = strengthNames(map);
    wrap.hidden = !names.length;
    if (!names.length){ svg.innerHTML = empty("Pas encore de données"); $("cvAvg").textContent = ""; $("cvNote").textContent = ""; return; }
    if (names.indexOf(V.ex) < 0) V.ex = names[0];
    $("cvEx").innerHTML = names.map(function(n){ return '<option value="' + esc(n) + '"' + (n === V.ex ? " selected" : "") + '>' + esc(n) + ' · ' + map[n].length + ' séance' + (map[n].length > 1 ? "s" : "") + '</option>'; }).join("");
    var l = map[V.ex];
    if (V.c === "weight"){
      var diff = num(l[l.length - 1].weight) - num(l[0].weight);
      $("cvTitle").textContent = "Évolution du poids levé";
      $("cvAvg").textContent = l.length > 1 ? (diff > 0 ? "+" : "") + kg(diff) + " kg depuis le début" : "";
      $("cvNote").textContent = "Chaque point = la charge utilisée à une séance. Une courbe qui monte = ça soulève plus lourd.";
      svg.innerHTML = lineSvg(l, function(e){ return num(e.weight); });
    } else {
      $("cvTitle").textContent = "Répétitions selon le poids";
      $("cvAvg").textContent = l.length + " séance" + (l.length > 1 ? "s" : "");
      $("cvNote").textContent = "Chaque point = une séance : à droite = plus lourd, en haut = plus de répétitions par série. Le point vert est la dernière séance, la bande claire la zone de 8 à 12 reps.";
      svg.innerHTML = scatterSvg(l);
    }
  }
  function paintCal(){
    if (!$("calGrid")) return;
    var first = new Date(V.y, V.m, 1), offset = (first.getDay() + 6) % 7, n = new Date(V.y, V.m + 1, 0).getDate();
    var now = new Date(), today = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()), html = "", count = 0;
    for (var i = 0; i < offset; i++) html += "<span></span>";
    for (var d = 1; d <= n; d++){
      var iso = V.y + "-" + pad2(V.m + 1) + "-" + pad2(d), on = !!cur.byDay[iso];
      if (on) count++;
      var cls = "cal-d" + (on ? " on" : "") + (iso === today ? " today" : "");
      html += on ? '<button type="button" class="' + cls + '" data-day="' + iso + '" aria-label="' + d + ' : séance">' + d + '</button>' : '<span class="' + cls + '">' + d + '</span>';
    }
    var elapsed = (V.y === now.getFullYear() && V.m === now.getMonth()) ? Math.max(7, now.getDate()) : n;
    $("calGrid").innerHTML = html;
    $("calTitle").textContent = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    $("calNote").textContent = count ? count + " séance" + (count > 1 ? "s" : "") + " ce mois-ci · environ " + (Math.round(count / (elapsed / 7) * 10) / 10).toLocaleString("fr-FR") + " par semaine" : "Aucune séance ce mois-ci.";
  }
  function panelsHtml(){
    return '<div class="anim"><div class="card"><div class="seg" id="cvSeg" role="tablist" aria-label="Choisir le graphique">'
      + '<button type="button" data-c="volume" aria-pressed="true">Volume</button><button type="button" data-c="weight" aria-pressed="false">Poids levé</button><button type="button" data-c="reps" aria-pressed="false">Reps / poids</button></div>'
      + '<div class="sh"><h2 id="cvTitle">Volume par séance</h2><span id="cvAvg"></span></div>'
      + '<div id="cvExWrap" class="exwrap" hidden><label for="cvEx">Exercice</label><select class="input" id="cvEx"></select></div>'
      + '<div class="cv"><svg id="cvSvg" viewBox="0 0 340 210" role="img" aria-label="Graphique"></svg></div><p class="cnote" id="cvNote"></p></div>'
      + '<div class="card"><div class="sh cal-h"><button type="button" class="nav" id="calPrev" aria-label="Mois précédent">‹</button><h2 id="calTitle"></h2><button type="button" class="nav" id="calNext" aria-label="Mois suivant">›</button></div>'
      + '<div class="cal-grid cal-wd" aria-hidden="true">' + WD.map(function(w){ return "<span>" + w + "</span>"; }).join("") + '</div><div class="cal-grid" id="calGrid"></div><p class="cnote" id="calNote"></p></div></div>';
  }

  /* ---------- rendu ---------- */
  function chart(points){
    var W = 320, H = 110, pl = 30, pr = 10, pt = 14, pb = 20;
    if (points.length < 2) return "";
    var vals = points.map(function(p){ return p.v; }), mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn){ mx += 1; mn = Math.max(0, mn - 1); }
    var pad = (mx - mn) * 0.15; mn = Math.max(0, mn - pad); mx += pad;
    function X(i){ return pl + i * (W - pl - pr) / (points.length - 1); }
    function Y(v){ return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); }
    var d = points.map(function(p, i){ return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.v).toFixed(1); }).join(" ");
    var area = d + " L" + X(points.length - 1).toFixed(1) + " " + (H - pb) + " L" + pl + " " + (H - pb) + " Z";
    var last = points[points.length - 1], up = last.v >= points[0].v;
    var col = up ? "#9be22d" : "#e8c547";
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution">'
      + '<defs><linearGradient id="g' + points.length + 'x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".25"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>'
      + '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="rgba(255,255,255,.08)"/>'
      + '<text x="' + (pl - 6) + '" y="' + (Y(mx - pad) + 3).toFixed(1) + '" text-anchor="end">' + esc(kg(mx - pad)) + '</text>'
      + '<text x="' + (pl - 6) + '" y="' + (Y(Math.max(0, mn + pad)) + 3).toFixed(1) + '" text-anchor="end">' + esc(kg(mn + pad)) + '</text>'
      + '<text x="' + pl + '" y="' + (H - 5) + '">' + esc(fmtDate(points[0].d, { day: "numeric", month: "short" })) + '</text>'
      + '<text x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(fmtDate(last.d, { day: "numeric", month: "short" })) + '</text>'
      + '<path d="' + area + '" fill="url(#g' + points.length + 'x)"/>'
      + '<path d="' + d + '" fill="none" stroke="#f5f5f7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + X(points.length - 1).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="4.5" fill="' + col + '"/></svg>';
  }
  function render(){
    if (!snap) return;
    var ents = (Array.isArray(snap.entries) ? snap.entries : []).filter(function(e){ return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.machine; });
    var name = String(snap.name || "").slice(0, 40) || "ton ami";
    $("title").textContent = "Le suivi de " + name;
    $("sub").textContent = "Mis à jour " + since(snap.at || Date.now()) + " · se met à jour tout seul";
    document.title = "Suivi de " + name + " · MORE";
    if (!ents.length){ $("content").innerHTML = '<div class="empty">Aucune séance pour l\'instant.</div>'; return; }

    var byDay = {}, byEx = {};
    ents.forEach(function(e){ (byDay[e.date] = byDay[e.date] || []).push(e); (byEx[e.machine] = byEx[e.machine] || []).push(e); });
    var days = Object.keys(byDay).sort().reverse();
    cur.ents = ents; cur.byDay = byDay;
    var monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    /* records : série qui dépasse tout ce qui précède pour l'exercice */
    var prKeys = {}, prMonth = 0;
    Object.keys(byEx).forEach(function(n){
      var l = byEx[n].slice().sort(function(a, b){ return a.date < b.date ? -1 : 1; }), best = -1;
      l.forEach(function(e, i){ var v = pv(e); if (i > 0 && v > best){ prKeys[n + "|" + e.date] = 1; if (e.date >= monthAgo) prMonth++; } if (v > best) best = v; });
    });
    var html = '<div class="tiles anim">'
      + '<div class="tile"><b>' + days.filter(function(d){ return d >= monthAgo; }).length + '</b><small>séances sur 30 jours</small></div>'
      + '<div class="tile"><b class="date">' + esc(fmtDate(days[0], { day: "numeric", month: "short" })) + '</b><small>dernière séance</small></div>'
      + '<div class="tile"><b class="up">' + prMonth + '</b><small>records ce mois</small></div></div>';
    html += panelsHtml();

    var shown = days.slice(0, 6);
    if (V.extra && byDay[V.extra] && shown.indexOf(V.extra) < 0){ shown.push(V.extra); shown.sort().reverse(); }
    html += '<h2>Dernières séances</h2><div class="anim">' + shown.map(function(d){
      var l = byDay[d], note = snap.notes && typeof snap.notes[d] === "string" ? snap.notes[d] : "";
      var cm = comments.filter(function(c){ return c.date === d; });
      return '<div class="day" id="d-' + d + '"><div class="day-head"><b>' + esc(fmtDate(d, { weekday: "long", day: "numeric", month: "long" })) + '</b><span>' + l.length + ' exercice' + (l.length > 1 ? "s" : "") + '</span></div>'
        + l.map(function(e){ return '<div class="line"><span class="n">' + esc(e.machine) + (prKeys[e.machine + "|" + d] ? '<span class="pr">PR</span>' : '') + '</span><span class="v">' + esc(pvTxt(e)) + '</span><span class="d">' + esc(detail(e)) + '</span></div>'; }).join("")
        + (note ? '<div class="note">' + esc(note.slice(0, 1000)) + '</div>' : '')
        + cm.map(function(c){ return '<div class="cmt"><div class="cmt-head"><b>' + esc(c.name) + '</b><span>' + esc(since(c.at)) + '</span></div><p>' + esc(c.text) + '</p></div>'; }).join("")
        + (openForm === d
          ? '<div class="cform"><input class="input" id="cName" maxlength="40" placeholder="Ton prénom (ex. Coach)" value="' + esc(localName()) + '"><textarea class="input" id="cText" maxlength="1000" placeholder="Ton commentaire sur cette séance"></textarea><p class="msg" id="cMsg"></p><div class="row"><button type="button" class="btn" data-send="' + d + '">Envoyer</button><button type="button" class="btn ghost" data-cancel>Annuler</button></div></div>'
          : '<button type="button" class="cbtn" data-comment="' + d + '">Commenter cette séance</button>')
        + '</div>';
    }).join("") + '</div>';

    var exNames = Object.keys(byEx).sort(function(a, b){
      var la = byEx[a].reduce(function(x, e){ return e.date > x ? e.date : x; }, ""), lb = byEx[b].reduce(function(x, e){ return e.date > x ? e.date : x; }, "");
      return la < lb ? 1 : la > lb ? -1 : a.localeCompare(b, "fr");
    });
    html += '<h2>Progression</h2><div class="anim">' + exNames.map(function(n){
      var l = byEx[n].slice().sort(function(a, b){ return a.date < b.date ? -1 : 1; }), last = l[l.length - 1], first = l[0];
      var pts = l.map(function(e){ return { d: e.date, v: pv(e) }; }), best = Math.max.apply(null, pts.map(function(p){ return p.v; }));
      var gain = pv(first) > 0 && l.length > 1 ? Math.round((pv(last) - pv(first)) / pv(first) * 100) : null;
      var meta = snap.meta && snap.meta[n] || {};
      var sub = [TYPES[meta.equip] || "", GROUPS[meta.group] || "", l.length + " séance" + (l.length > 1 ? "s" : "")].filter(Boolean).join(" · ");
      return '<div class="ex"><div class="ex-head"><div><b>' + esc(n) + '</b><small>' + esc(sub) + '</small></div>'
        + '<div class="ex-val">' + esc(kg(pv(last))) + '<small>' + esc(unit(last)) + '</small>'
        + '<em class="' + (gain > 0 ? "up" : "") + '">' + (gain !== null ? (gain > 0 ? "▲ +" : gain < 0 ? "▼ " : "= ") + gain + " %" : "1re séance") + ' · record ' + esc(kg(best)) + '</em></div></div>'
        + chart(pts) + '</div>';
    }).join("") + '</div>';

    if (Array.isArray(snap.weights) && snap.weights.length){
      var w = snap.weights.filter(function(x){ return x && /^\d{4}-\d{2}-\d{2}$/.test(x.date || ""); }).sort(function(a, b){ return a.date < b.date ? -1 : 1; });
      if (w.length) html += '<h2>Poids corporel</h2><div class="ex"><div class="ex-head"><div><b>Poids</b><small>' + w.length + ' pesée' + (w.length > 1 ? "s" : "") + '</small></div><div class="ex-val">' + esc(kg(w[w.length - 1].weight)) + '<small>kg</small></div></div>' + chart(w.map(function(x){ return { d: x.date, v: num(x.weight) }; })) + '</div>';
    }
    var keepText = openForm && $("cText") ? $("cText").value : null;
    $("content").innerHTML = html;
    paintCharts(); paintCal();
    if (openForm && keepText !== null && $("cText")) $("cText").value = keepText;
  }
  function localName(){ try { return localStorage.getItem("more-suivi-nom") || ""; } catch(e){ return ""; } }

  /* ---------- chargement et mise à jour ---------- */
  function load(first){
    if (busy) return; busy = true;
    rpc("lire_partage", { p_id: shareId }).then(function(rows){
      busy = false;
      if (!rows || !rows.length){ snap = null; fail("Lien désactivé", "Ce lien de suivi n'est plus actif. Demande un nouveau lien à la personne qui te l'a envoyé."); return; }
      var row = rows[0], stamp = String(row.updated_at) + "|" + (Array.isArray(row.commentaires) ? row.commentaires.length : 0);
      if (stamp === lastStamp && !first) return;
      lastStamp = stamp;
      return open(row.data).then(function(s){
        snap = s;
        var list = Array.isArray(row.commentaires) ? row.commentaires : [];
        return Promise.all(list.map(function(c){ return open(c.data).then(function(o){
          var t = String(o && o.text || "").trim().slice(0, 1000); if (!t) return null;
          return { name: String(o.name || "Anonyme").slice(0, 40), text: t, date: o.date, at: Date.parse(c.at) || Date.now() };
        }, function(){ return null; }); }));
      }).then(function(cs){
        if (!cs) return;
        comments = cs.filter(Boolean); $("liveTag").textContent = "En direct"; $("liveTag").className = "tag live"; render();
      }, function(){ fail("Lien invalide", "Impossible de lire ce suivi : le lien est peut-être incomplet ou a été remplacé."); });
    }, function(e){
      busy = false;
      if (first) fail("Suivi indisponible", "Le serveur ne répond pas pour l'instant (" + e.message + "). La page réessaiera toute seule.");
      $("liveTag").textContent = "Hors ligne"; $("liveTag").className = "tag";
    });
  }

  document.addEventListener("click", function(e){
    var b;
    if ((b = e.target.closest("#cvSeg [data-c]"))){ V.c = b.getAttribute("data-c"); paintCharts(); var w = $("cvSvg").parentNode; w.classList.remove("swap"); void w.offsetWidth; w.classList.add("swap"); return; }
    if (e.target.closest("#calPrev")){ V.m--; if (V.m < 0){ V.m = 11; V.y--; } paintCal(); return; }
    if (e.target.closest("#calNext")){ V.m++; if (V.m > 11){ V.m = 0; V.y++; } paintCal(); return; }
    if ((b = e.target.closest("[data-day]"))){
      var d0 = b.getAttribute("data-day");
      if (!$("d-" + d0)){ V.extra = d0; render(); }
      var card = $("d-" + d0); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if ((b = e.target.closest("[data-comment]"))){ openForm = b.getAttribute("data-comment"); render(); var t = $("cText"); if (t) t.focus(); return; }
    if (e.target.closest("[data-cancel]")){ openForm = null; render(); return; }
    if ((b = e.target.closest("[data-send]"))){
      var d = b.getAttribute("data-send"), name = ($("cName").value || "").trim().slice(0, 40), text = ($("cText").value || "").trim().slice(0, 1000), msg = $("cMsg");
      if (!name){ msg.className = "msg err"; msg.textContent = "Indique ton prénom."; return; }
      if (!text){ msg.className = "msg err"; msg.textContent = "Écris ton commentaire."; return; }
      try { localStorage.setItem("more-suivi-nom", name); } catch(err){}
      b.disabled = true; msg.className = "msg"; msg.textContent = "Envoi…";
      seal({ v: 1, name: name, text: text, date: d }).then(function(blob){ return rpc("commenter_partage", { p_id: shareId, p_data: blob }); }).then(function(){
        comments.push({ name: name, text: text, date: d, at: Date.now() }); openForm = null; lastStamp = ""; render(); load(false);
      }, function(err){ b.disabled = false; msg.className = "msg err"; msg.textContent = "Envoi impossible : " + err.message; });
    }
  });

  document.addEventListener("change", function(e){ if (e.target && e.target.id === "cvEx"){ V.ex = e.target.value; paintCharts(); } });
  window.addEventListener("hashchange", function(){ location.reload(); });
  load(true);
  setInterval(function(){ if (!document.hidden && !openForm) load(false); }, REFRESH_MS);
  document.addEventListener("visibilitychange", function(){ if (!document.hidden && !openForm) load(false); });
})();
