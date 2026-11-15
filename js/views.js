/* MORE · Écrans Progrès, Historique, Records, Mon corps
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Rendu : Progrès
   ========================================================= */
var filter = "all";
function renderProgress(){
  var map = byMachine(), names = Object.keys(map), prs = prIds(), monthKey = todayISO().slice(0,7);
  var dates = {}; state.entries.forEach(function(e){ dates[e.date] = 1; });
  $("tSessions").textContent = Object.keys(dates).length;
  $("tPR").textContent = state.entries.filter(function(e){ return prs[e.id] && e.date.slice(0,7) === monthKey; }).length;
  var gains = names.map(function(n){ var l = map[n]; return l.length > 1 && pv(l[0]) > 0 ? (pv(l[l.length-1]) / pv(l[0]) - 1) * 100 : null; }).filter(function(x){ return x !== null; });
  var avg = gains.length ? sum(gains) / gains.length : 0;
  $("tGain").textContent = (avg > 0 ? "+" : "") + Math.round(avg) + " %"; $("tGain").classList.toggle("pos", avg > 0);

  var present = {}; names.forEach(function(n){ var g = groupOf(n); if (g) present[g] = 1; });
  if (filter !== "all" && !present[filter]) filter = "all";
  $("filters").innerHTML = '<button type="button" class="pick" data-f="all" aria-pressed="'+(filter==="all")+'">Tout</button>'
    + GROUP_DEFS.filter(function(g){ return present[g.k]; }).map(function(g){ return '<button type="button" class="pick" data-f="'+g.k+'" aria-pressed="'+(filter===g.k)+'">'+g.label+'</button>'; }).join("");

  var shown = names.filter(function(n){ return filter === "all" || groupOf(n) === filter; });
  shown.sort(function(a,b){ var la = map[a][map[a].length-1].date, lb = map[b][map[b].length-1].date; return la < lb ? 1 : la > lb ? -1 : a.localeCompare(b); });
  if (!names.length){ $("machineList").innerHTML = '<div class="glass empty">Aucune série pour l\'instant.<br>Touche + pour ajouter ta première.</div>'; return; }
  var html = "";
  STATUS.forEach(function(G){
    var list = shown.filter(function(n){ return status(map[n]) === G.k; });
    if (!list.length) return;
    html += '<div class="group '+G.cls+'"><div class="group-head"><h2>'+G.title+' · '+list.length+'</h2><span>'+G.hint+'</span></div>';
    html += list.map(function(n){
      var l = map[n], first = l[0], last = l[l.length-1], gd = gdef(groupOf(n));
      var diff = pv(first) > 0 ? Math.round((pv(last) / pv(first) - 1) * 100) : 0;
      var chip = l.length < 2 ? '<span class="chip">1re fois</span>' : diff > 0 ? '<span class="chip up">▲ +' + diff + ' %</span>' : diff < 0 ? '<span class="chip down">▼ ' + diff + ' %</span>' : '<span class="chip">= depuis le début</span>';
      if (prs[last.id]) chip = '<span class="chip pr">PR</span>' + chip;
      var big = bigHtml(last);
      return '<button type="button" class="glass mcard" data-m="'+esc(n)+'"'+(gd ? ' aria-label="'+esc(n)+' ('+gd.label+')"' : '')+'><div class="name">'+esc(n)+'</div>'
        + '<div class="right">'+spark(l, G.col, "sg-"+G.k)+'<div class="w">'+big+'</div></div>'
        + '<div class="meta">'+chip+'<span>'+(isC(last) ? "" : equipLabel(equipOf(n)) + " · ")+ago(last.date)+' · '+l.length+' séance'+(l.length>1?"s":"")+'</span></div></button>';
    }).join("");
    html += '</div>';
  });
  $("machineList").innerHTML = html || '<div class="glass empty">Aucune machine dans ce groupe.</div>';
}
$("filters").addEventListener("click", function(e){ var b = e.target.closest("[data-f]"); if (!b) return; filter = b.getAttribute("data-f"); renderProgress(); });
$("machineList").addEventListener("click", function(e){ var b = e.target.closest("[data-m]"); if (b) openMachine(b.getAttribute("data-m")); });

/* =========================================================
   Rendu : Historique, volume, calendrier, notes
   ========================================================= */
var editingNote = null;
function renderHistory(){
  var groups = {}, prs = prIds();
  state.entries.forEach(function(e){ (groups[e.date] = groups[e.date] || []).push(e); });
  var days = Object.keys(groups).sort().reverse();
  if (!days.length){ $("historyList").innerHTML = '<div class="glass empty">L\'historique est vide.</div>'; return; }
  $("historyList").innerHTML = days.map(function(d){
    var l = groups[d], note = state.notes[d];
    var noteHtml = editingNote === d
      ? '<textarea class="input" id="noteInput" style="margin-top:8px" placeholder="Fatigué, douleur épaule, super forme…">'+esc(note || "")+'</textarea><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-note-save="'+d+'">Enregistrer la note</button><button type="button" class="btn ghost sm" data-note-cancel>Annuler</button></div>'
      : (note ? '<div class="note">'+esc(note)+'</div>' : '') + '<button type="button" class="note-btn" data-note="'+d+'">'+(note ? "Modifier la note" : "+ Ajouter une note")+'</button>';
    return '<div class="glass day" id="d-'+d+'" style="scroll-margin-top:16px"><div class="day-head"><b>'+esc(fmtDate(d,{weekday:"long",day:"numeric",month:"long"}))+'</b><span>'+l.length+' machine'+(l.length>1?"s":"")+'</span></div>'
      + l.map(function(e){ return '<div class="line"><span>'+esc(e.machine)+(prs[e.id] ? ' <span class="chip pr">PR</span>' : '')+'</span><span class="kg">'+pvTxt(e)+'</span><span class="rp">'+detailTxt(e)+'</span></div>'; }).join("")
      + noteHtml + '</div>';
  }).join("");
  if (editingNote){ var ni = $("noteInput"); if (ni) ni.focus(); }
}
$("historyList").addEventListener("click", function(e){
  var b;
  if ((b = e.target.closest("[data-note]"))){ editingNote = b.getAttribute("data-note"); renderHistory(); return; }
  if (e.target.closest("[data-note-cancel]")){ editingNote = null; renderHistory(); return; }
  if ((b = e.target.closest("[data-note-save]"))){
    var d = b.getAttribute("data-note-save"), v = ($("noteInput").value || "").trim();
    if (v) state.notes[d] = v; else delete state.notes[d];
    editingNote = null; save(); renderHistory(); toast("Note enregistrée");
  }
});
function shortKg(v){ if (v === 0) return "0"; return v >= 1000 ? (Math.round(v/100)/10).toLocaleString("fr-FR") + " t" : Math.round(v) + " kg"; }
function renderVolume(){
  var svg = $("volChart"), groups = {};
  state.entries.forEach(function(e){ if (modeOf(e) === "load") groups[e.date] = (groups[e.date] || 0) + e.weight * sum(e.reps); });
  var days = Object.keys(groups).sort().slice(-12);
  if (!days.length){ svg.innerHTML = '<text x="170" y="100" text-anchor="middle">Pas encore de séance</text>'; $("volAvg").textContent = ""; return; }
  var vals = days.map(function(d){ return groups[d]; }), avg = sum(vals) / vals.length, mx = Math.max.apply(null, vals);
  $("volAvg").textContent = "moyenne " + shortKg(avg);
  var W = 340, H = 200, pl = 40, pr = 10, pt = 22, pb = 28;
  var step = niceStep(mx * 1.15 / 4), top = Math.ceil(mx * 1.15 / step) * step;
  function Y(v){ return pt + (1 - v/top) * (H - pt - pb); }
  var slot = (W - pl - pr) / days.length, bw = Math.min(30, slot * 0.62);
  var g = '<defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:.9"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:.25"/></linearGradient></defs>';
  for (var v = 0; v <= top + 1e-9; v += step){
    var yy = Y(v).toFixed(1);
    g += '<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke-dasharray="3 4"/>';
    g += '<text x="'+(pl-8)+'" y="'+(+yy+3.5)+'" text-anchor="end">'+shortKg(v)+'</text>';
  }
  days.forEach(function(d, i){
    var cx = pl + slot*i + slot/2, y = Y(vals[i]), last = i === days.length-1;
    g += '<rect class="bar" style="animation-delay:'+(i*40)+'ms" x="'+(cx-bw/2).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-pb-y).toFixed(1)+'" rx="7" fill="url(#vb)" opacity="'+(last?1:.55)+'"/>';
    g += '<text class="val fade" x="'+cx.toFixed(1)+'" y="'+(y-6).toFixed(1)+'" text-anchor="middle">'+shortKg(vals[i])+'</text>';
    if (days.length <= 8 || i % 2 === (days.length-1) % 2) g += '<text x="'+cx.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(fmtDate(d))+'</text>';
  });
  var ya = Y(avg).toFixed(1);
  g += '<line class="fade" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ya+'" y2="'+ya+'" style="stroke:var(--accent)" stroke-width="1.5" stroke-dasharray="6 4"/>';
  svg.innerHTML = g;
}
/* Graphique de l'historique : un seul affiché à la fois */
var histChart = "volume", histMachine = null;
function strengthMachines(){
  var map = byMachine();
  return Object.keys(map).filter(function(n){ return modeOf(map[n][map[n].length-1]) === "load"; })
    .sort(function(a,b){ return map[b].length - map[a].length || a.localeCompare(b, "fr"); });
}
function renderHistChart(){
  document.querySelectorAll("#chartSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === histChart)); });
  var svg = $("volChart");
  if (histChart === "volume"){
    $("chartMachineWrap").hidden = true; $("chartTitle").textContent = "Volume par séance";
    $("chartNote").textContent = "Chaque barre = tout le poids déplacé pendant la séance (poids × répétitions, exercices avec charge). La ligne orange est ta moyenne.";
    renderVolume(); return;
  }
  var map = byMachine(), names = strengthMachines();
  $("chartMachineWrap").hidden = !names.length;
  if (!names.length){ svg.innerHTML = '<text x="170" y="105" text-anchor="middle">Pas encore de données</text>'; $("volAvg").textContent = ""; $("chartNote").textContent = ""; return; }
  if (names.indexOf(histMachine) < 0) histMachine = names[0];
  $("chartMachine").innerHTML = names.map(function(n){ return '<option value="'+esc(n)+'"'+(n === histMachine ? " selected" : "")+'>'+esc(n)+' · '+map[n].length+' séance'+(map[n].length>1?"s":"")+'</option>'; }).join("");
  var l = map[histMachine];
  if (histChart === "weight"){
    var diff = l[l.length-1].weight - l[0].weight;
    $("chartTitle").textContent = "Évolution du poids levé";
    $("volAvg").textContent = l.length > 1 ? (diff > 0 ? "+" : "") + kg(diff) + " kg depuis le début" : "";
    $("chartNote").textContent = "Chaque point = la charge utilisée à une séance. Une courbe qui monte = tu soulèves plus lourd.";
    drawChart(svg, l, function(e){ return e.weight; });
  } else {
    $("chartTitle").textContent = "Répétitions selon le poids";
    $("volAvg").textContent = l.length + " séance" + (l.length>1?"s":"");
    $("chartNote").textContent = "Chaque point = une séance : à droite = plus lourd, en haut = plus de répétitions par série. Le point blanc est ta dernière séance, la bande verte la zone de 8 à 12 reps.";
    drawScatter(svg, l);
  }
}
function drawScatter(svg, l){
  var W = 340, H = 210, pl = 40, pr = 18, pt = 18, pb = 34;
  var pts = l.map(function(e, i){ var n = e.reps.filter(function(r){ return r > 0; }).length || 1; return { x: e.weight, y: sum(e.reps) / n, d: e.date, i: i }; });
  var xs = pts.map(function(p){ return p.x; }), ys = pts.map(function(p){ return p.y; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), span = (x1 - x0) || Math.max(5, x1 * 0.2), xstep = niceStep(span * 1.3 / 4);
  x0 = Math.max(0, Math.floor((x0 - span * 0.15) / xstep) * xstep); x1 = Math.ceil((x1 + span * 0.15) / xstep) * xstep; if (x1 === x0) x1 = x0 + xstep;
  var ymax = Math.ceil(Math.max(15, Math.max.apply(null, ys) + 2) / 5) * 5;
  function X(v){ return pl + (v - x0) / (x1 - x0) * (W - pl - pr); }
  function Y(v){ return pt + (1 - v / ymax) * (H - pt - pb); }
  var g = '<rect class="fade" x="'+pl+'" y="'+Y(12).toFixed(1)+'" width="'+(W-pl-pr)+'" height="'+(Y(8)-Y(12)).toFixed(1)+'" rx="6" style="fill:var(--chart);fill-opacity:.06"/>';
  for (var v = 0; v <= ymax; v += 5){ var yy = Y(v).toFixed(1); g += '<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke-dasharray="3 4"/><text x="'+(pl-8)+'" y="'+(+yy+3.5)+'" text-anchor="end">'+v+'</text>'; }
  for (var xv = x0; xv <= x1 + 1e-9; xv += xstep){ g += '<text x="'+X(xv).toFixed(1)+'" y="'+(H-16)+'" text-anchor="middle">'+kg(xv)+'</text>'; }
  g += '<text x="'+(W-pr)+'" y="'+(H-2)+'" text-anchor="end">poids (kg) →</text><text x="'+pl+'" y="'+(pt-6)+'" text-anchor="start">↑ reps par série</text>';
  var seen = {};
  pts.forEach(function(p){ var k = p.x + "|" + Math.round(p.y * 10); var n = seen[k] = (seen[k] || 0) + 1; p.cx = X(p.x) + (n - 1) * 8; p.cy = Y(p.y); });
  if (pts.length > 1) g += '<path class="draw" pathLength="1" d="'+pts.map(function(p, i){ return (i ? "L" : "M") + p.cx.toFixed(1) + " " + p.cy.toFixed(1); }).join(" ")+'" fill="none" style="stroke:rgba(var(--w),.3)" stroke-width="1.5" stroke-linejoin="round"/>';
  pts.forEach(function(p, i){
    var last = i === pts.length - 1, op = pts.length > 1 ? 0.35 + 0.65 * i / (pts.length - 1) : 1;
    g += '<g class="fade">';
    if (last) g += '<circle cx="'+p.cx.toFixed(1)+'" cy="'+p.cy.toFixed(1)+'" r="12" style="fill:var(--accent);fill-opacity:.22"/>';
    g += '<circle cx="'+p.cx.toFixed(1)+'" cy="'+p.cy.toFixed(1)+'" r="'+(last ? 6.5 : 5.5)+'" style="fill:'+(last ? "var(--accent)" : "var(--chart)")+';fill-opacity:'+(last ? 1 : op.toFixed(2))+';stroke:'+(last ? "var(--accent)" : "var(--ink)")+'" stroke-width="2"/>';
    if (last || i === 0) g += '<text class="val" x="'+Math.min(Math.max(p.cx, pl+16), W-pr-16).toFixed(1)+'" y="'+(p.cy - 14).toFixed(1)+'" text-anchor="middle">'+esc(fmtDate(p.d))+'</text>';
    g += '</g>';
  });
  svg.innerHTML = g;
}
$("chartSeg").addEventListener("click", function(e){
  var b = e.target.closest("[data-c]"); if (!b) return; histChart = b.getAttribute("data-c"); renderHistChart();
  var w = $("volChart").parentNode; w.classList.remove("swap"); void w.offsetWidth; w.classList.add("swap");
});
$("chartMachine").addEventListener("change", function(){ histMachine = $("chartMachine").value; renderHistChart(); });

var calY = new Date().getFullYear(), calM = new Date().getMonth();
function renderCal(){
  var days = {}; state.entries.forEach(function(e){ days[e.date] = 1; });
  var first = new Date(calY, calM, 1), offset = (first.getDay() + 6) % 7, n = new Date(calY, calM + 1, 0).getDate();
  var today = todayISO(), html = "", count = 0;
  for (var i = 0; i < offset; i++) html += "<span></span>";
  for (var d = 1; d <= n; d++){
    var iso = calY + "-" + pad2(calM + 1) + "-" + pad2(d), on = !!days[iso];
    if (on) count++;
    var cls = "cal-d" + (on ? " on" : "") + (iso === today ? " today" : "");
    html += on ? '<button type="button" class="'+cls+'" data-day="'+iso+'" aria-label="'+d+' : séance">'+d+'</button>' : '<span class="'+cls+'">'+d+'</span>';
  }
  var now = new Date(), elapsed = (calY === now.getFullYear() && calM === now.getMonth()) ? Math.max(7, now.getDate()) : n;
  $("calGrid").innerHTML = html;
  $("calTitle").textContent = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  $("calNote").textContent = count ? count + " séance" + (count > 1 ? "s" : "") + " ce mois-ci · environ " + (Math.round(count / (elapsed / 7) * 10) / 10).toLocaleString("fr-FR") + " par semaine" : "Aucune séance ce mois-ci.";
}
function calWave(dir){
  if (reduced) return;
  var cells = $("calGrid").children;
  for (var i = 0; i < cells.length; i++){ cells[i].style.setProperty("--i", i % 7 + Math.floor(i / 7)); cells[i].style.setProperty("--dx", dir * 10 + "px"); cells[i].classList.add("cw"); }
}
$("calPrev").addEventListener("click", function(){ calM--; if (calM < 0){ calM = 11; calY--; } renderCal(); calWave(-1); });
$("calNext").addEventListener("click", function(){ calM++; if (calM > 11){ calM = 0; calY++; } renderCal(); calWave(1); });
$("calGrid").addEventListener("click", function(e){
  var b = e.target.closest("[data-day]"); if (!b) return;
  var card = document.getElementById("d-" + b.getAttribute("data-day"));
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* =========================================================
   Rendu : Records
   ========================================================= */
var TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';
function renderRecords(){
  var map = byMachine(), names = Object.keys(map);
  if (!names.length){ $("recordList").innerHTML = '<div class="glass empty">Tes records apparaîtront ici.</div>'; return; }
  var rows = names.map(function(n){ var b = bestOf(map[n]); return { n: n, b: b, l: map[n] }; });
  rows.sort(function(a,b){ return a.b.date < b.b.date ? 1 : a.b.date > b.b.date ? -1 : a.n.localeCompare(b.n); });
  $("recordList").innerHTML = rows.map(function(r){
    var b = r.b, sub;
    if (isC(b)){ var bs = r.l.reduce(function(m, e){ return Math.max(m, speedOf(e)); }, 0); sub = Math.round(b.minutes) + " min · vitesse max " + kg(bs) + " km/h"; }
    else if (modeOf(b) === "load") { sub = b.reps.join(" · ") + " reps · 1RM ≈ " + kg(Math.round(METRICS.orm.f(b))) + " kg"; }
    else { sub = detailTxt(b); }
    return '<button type="button" class="glass prrow" data-m="'+esc(r.n)+'" style="text-align:left;width:100%"><span class="trophy">'+TROPHY+'</span>'
      + '<span><b>'+esc(r.n)+'</b><br><span class="muted small">'+esc(fmtDate(b.date,{day:"numeric",month:"long"}))+' · '+sub+'</span></span>'
      + '<span class="val">'+bigHtml(b)+'</span></button>';
  }).join("");
}
$("recordList").addEventListener("click", function(e){ var b = e.target.closest("[data-m]"); if (b) openMachine(b.getAttribute("data-m")); });

/* =========================================================
   Mon corps
   ========================================================= */
function sortedWeights(){ return state.profile.weights.slice().sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
function renderBody(){
  var w = sortedWeights(), last = w[w.length-1], h = state.profile.height;
  var imc = last && h ? last.weight / Math.pow(h/100, 2) : null, diff = w.length > 1 ? last.weight - w[0].weight : null;
  $("bodyStats").innerHTML =
      '<div class="stat"><div class="v">'+(last ? kg(last.weight) : "–")+'</div><div class="l">poids (kg)</div></div>'
    + '<div class="stat"><div class="v">'+(h ? h : "–")+'</div><div class="l">taille (cm)</div></div>'
    + '<div class="stat"><div class="v">'+(imc ? kg(imc) : "–")+'</div><div class="l">IMC</div></div>';
  $("bodyNote").textContent = !last && !h ? "Ajoute ton poids et ta taille pour suivre ton évolution."
    : diff !== null ? (diff > 0 ? "+" : "") + kg(diff) + " kg depuis le " + fmtDate(w[0].date, {day:"numeric", month:"long"}) + " · pesé " + ago(last.date)
    : last ? "Pesé " + ago(last.date) + ". Pèse-toi régulièrement pour voir ta courbe." : "Ajoute ton poids pour calculer ton IMC.";
}
function openBody(){
  $("bHeight").value = state.profile.height || "";
  var w = sortedWeights(); $("bWeight").value = w.length ? w[w.length-1].weight : "";
  $("bDate").value = todayISO(); $("bodyErr").textContent = "";
  paintBodyHist(); openOv("bodyOverlay");
}
function paintBodyHist(){
  var w = sortedWeights();
  if (!w.length){ $("bodyHist").innerHTML = ""; return; }
  var html = '<h2 style="margin-bottom:10px">Évolution du poids</h2>';
  if (w.length > 1) html += '<div class="chart-wrap" style="margin-bottom:10px"><svg class="chart" id="bChart" viewBox="0 0 340 210" role="img" aria-label="Courbe du poids"></svg></div>';
  html += w.slice().reverse().map(function(x){
    return '<div class="entry" style="grid-template-columns:1fr auto 40px"><span class="d">'+esc(fmtDate(x.date,{weekday:"short",day:"numeric",month:"short"}))+'</span><b>'+kg(x.weight)+' kg</b><button type="button" class="del" data-bdel="'+x.id+'" aria-label="Supprimer cette pesée">✕</button></div>';
  }).join("");
  $("bodyHist").innerHTML = html;
  if (w.length > 1) drawChart($("bChart"), w, function(x){ return x.weight; });
}
$("bodyBtn").addEventListener("click", openBody);
$("bodyForm").addEventListener("submit", function(e){
  e.preventDefault();
  var hv = $("bHeight").value.trim(), wv = String($("bWeight").value).trim(), d = $("bDate").value || todayISO();
  var h = hv ? parseInt(hv, 10) : null, wt = wv ? num(wv) : null;
  if (hv && !(h >= 100 && h <= 250)){ $("bodyErr").textContent = "Indique ta taille en centimètres (ex. 178)."; return; }
  if (wv && !(wt >= 30 && wt <= 300)){ $("bodyErr").textContent = "Indique ton poids en kg (ex. 74,5)."; return; }
  if (!hv && !wv){ $("bodyErr").textContent = "Remplis au moins ta taille ou ton poids."; return; }
  $("bodyErr").textContent = "";
  if (h) state.profile.height = h;
  if (wt !== null){
    var same = state.profile.weights.find(function(x){ return x.date === d; });
    if (same) same.weight = wt; else state.profile.weights.push({ id: uid(), date: d, weight: wt });
  }
  save(); renderBody(); paintBodyHist(); toast("Profil mis à jour"); buzz();
});
$("bodyHist").addEventListener("click", function(e){
  var b = e.target.closest("[data-bdel]"); if (!b) return;
  if (!b.classList.contains("armed")){ b.classList.add("armed"); b.textContent = "Supprimer"; return; }
  var id = b.getAttribute("data-bdel");
  state.profile.weights = state.profile.weights.filter(function(x){ return x.id !== id; });
  save(); renderBody(); paintBodyHist();
});
