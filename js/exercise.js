/* MORE · Fiche d'un exercice
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Fiche machine (+ renommer / fusionner)
   ========================================================= */
var current = null, currentMetric = "weight";
function openMachine(name){
  var l = byMachine()[name]; if (!l){ closeAll(); return; }
  var prevCurrent = current; current = name;
  var cardio = isC(l[l.length-1]), first = l[0], last = l[l.length-1], best = bestOf(l);
  $("mTitle").textContent = name;
  $("mSub").textContent = l.length + " séance" + (l.length>1?"s":"") + " depuis le " + fmtDate(first.date, {day:"numeric", month:"long"});
  var g = groupOf(name);
  $("mGroup").innerHTML = '<option value="">Aucun</option>' + GROUP_DEFS.map(function(d){ return '<option value="'+d.k+'"'+(g===d.k ? " selected" : "")+'>'+d.label+'</option>'; }).join("");
  var gd0 = gdef(g); $("mSub").textContent = (gd0 ? gd0.label + " · " : "") + $("mSub").textContent;
  var s = suggest(l);
  $("mSuggest").innerHTML = s ? '<div class="suggest"><div><span class="muted">Prochaine séance</span><br><b>'+esc(s.label)+'</b></div><div class="muted">'+esc(s.why)+'</div></div>' : "";
  if (!cardio) $("mSub").textContent = equipLabel(equipOf(name)) + " · " + $("mSub").textContent;
  var md = modeOf(last), unit = md === "sol" ? (sum(last.reps) ? "reps" : "s") : "kg";
  if (cardio){
    var tot = sum(l.map(function(e){ return e.km; })), bs = Math.max.apply(null, l.map(speedOf));
    $("mStats").innerHTML = stat(kg(tot), "km au total") + stat(kg(best.km), "record (km)") + stat(kg(bs), "vitesse max") + stat(l.length, "séances");
  } else {
    var diff = pv(first) > 0 ? Math.round((pv(last)/pv(first) - 1)*100) : 0;
    $("mStats").innerHTML = stat(kg(pv(first)), "départ ("+unit+")") + stat(kg(pv(last)), "actuel ("+unit+")") + stat(kg(pv(best)), "record ("+unit+")")
      + '<div class="stat"><div class="v" style="color:'+(diff>0?"var(--good)":diff<0?"var(--bad)":"var(--text)")+'">'+(diff>0?"+":"")+diff+'%</div><div class="l">évolution</div></div>';
  }
  var keys = cardio ? ["km","minutes","speed"] : md === "sol" ? ["reps","dur","poids"].filter(function(k){ return l.some(function(e){ return METRICS[k].f(e) > 0; }); }) : ["weight","volume","orm"];
  if (!keys.length) keys = ["reps"];
  if (prevCurrent !== name || keys.indexOf(currentMetric) < 0) currentMetric = keys[0];
  $("metricSeg").innerHTML = keys.map(function(k){ return '<button type="button" data-m="'+k+'" aria-pressed="'+(k===currentMetric)+'">'+METRICS[k].label+'</button>'; }).join("");
  $("explainBox").hidden = md !== "load"; $("metricSeg").hidden = keys.length < 2;
  paintMetric();
  var prs = prIds();
  $("mEntries").innerHTML = l.slice().reverse().map(function(e){
    return '<div class="entry"><span class="d">'+esc(fmtDate(e.date,{weekday:"short",day:"numeric",month:"short"}))+(prs[e.id] ? ' <span class="chip pr">PR</span>' : '')+'</span><b style="font-variant-numeric:tabular-nums">'+pvTxt(e)+'</b>'
      + '<span class="muted small" style="font-variant-numeric:tabular-nums">'+detailTxt(e)+'</span>'
      + '<button type="button" class="del" data-del="'+e.id+'" aria-label="Supprimer cette séance">✕</button></div>';
  }).join("");
  $("mRename").hidden = true;
  openOv("machineOverlay");
}
function stat(v, l){ return '<div class="stat"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>'; }
function paintMetric(){
  var l = byMachine()[current]; if (!l) return;
  document.querySelectorAll("#metricSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-m") === currentMetric)); });
  drawChart($("mChart"), l, METRICS[currentMetric].f);
  $("metricNote").textContent = METRICS[currentMetric].note;
}
$("metricSeg").addEventListener("click", function(e){ var b = e.target.closest("[data-m]"); if (!b) return; currentMetric = b.getAttribute("data-m"); paintMetric(); });
$("mGroup").addEventListener("change", function(){
  if (!current) return;
  state.meta[current] = state.meta[current] || {}; state.meta[current].group = $("mGroup").value || null;
  save(); renderProgress(); toast("Groupe mis à jour");
});
$("mEntries").addEventListener("click", function(e){
  var b = e.target.closest("[data-del]"); if (!b) return;
  if (!b.classList.contains("armed")){ b.classList.add("armed"); b.textContent = "Supprimer"; setTimeout(function(){ if (b.isConnected){ b.classList.remove("armed"); b.textContent = "✕"; } }, 2500); return; }
  var id = b.getAttribute("data-del");
  state.entries = state.entries.filter(function(x){ return x.id !== id; });
  save(); renderAll(); toast("Séance supprimée");
  if (byMachine()[current]) openMachine(current); else closeAll();
});
$("mAdd").addEventListener("click", function(){
  var name = current; closeAll(); go("add"); $("fMachine").value = name; setType(typeOf(name));
  lastFilled = null; fillFromLast(); $("fDate").value = todayISO();
  var s = suggest(byMachine()[name]); if (s && s.up && s.w !== null) $("fWeight").value = s.w;
});
$("mRenameBtn").addEventListener("click", function(){ $("mRename").hidden = !$("mRename").hidden; $("mNewName").value = current; $("mRenameErr").textContent = ""; $("mRenameOk").textContent = "Valider le nom"; delete $("mRenameOk").dataset.armed; $("mNewName").focus(); });
$("mRenameOk").addEventListener("click", function(){
  var raw = $("mNewName").value.trim(), btn = $("mRenameOk");
  if (!raw){ $("mRenameErr").textContent = "Écris un nom."; return; }
  var target = canonical(raw), old = current;
  if (target === old){ $("mRename").hidden = true; return; }
  var merging = allMachineNames().indexOf(target) >= 0;
  function doIt(){
    state.entries.forEach(function(e){ if (e.machine === old) e.machine = target; });
    if (!merging && state.meta[old]) state.meta[target] = state.meta[old];
    delete state.meta[old];
    state.routines.forEach(function(r){ r.machines = r.machines.map(function(m){ return m === old ? target : m; }).filter(function(m, i, a){ return a.indexOf(m) === i; }); });
    if (state.active && state.active.done && state.active.done[old]){ state.active.done[target] = state.active.done[old]; delete state.active.done[old]; }
    save(); renderAll(); openMachine(target); toast(merging ? "Machines fusionnées" : "Machine renommée");
  }
  if (merging) armed(btn, "Valider le nom", "Fusionner avec « " + target + " » ? Touche encore", doIt); else doIt();
});
