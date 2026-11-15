/* MORE · Formulaire d'ajout d'une série
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Ajout d'une série (formulaire)
   ========================================================= */
var TYPES = [
  { k: "machine", label: "Machine", desc: "Poids + 3 séries" },
  { k: "halteres", label: "Haltères", desc: "Poids par haltère + 3 séries" },
  { k: "sol", label: "Tapis de sol", desc: "3 séries + durée, poids facultatif" },
  { k: "course", label: "Tapis de course", desc: "Durée, distance, pente" }
];
var ftype = "machine", lastFilled = null, newGroup = null;
function existingKey(){ var v = $("fMachine").value.trim().toLowerCase(); if (!v) return null; return allMachineNames().find(function(k){ return k.toLowerCase() === v; }) || null; }
function setType(k){
  ftype = k;
  $("typePick").innerHTML = TYPES.map(function(t){ return '<button type="button" class="type" role="radio" data-type="'+t.k+'" aria-checked="'+(t.k === k)+'"><b>'+t.label+'</b><span>'+t.desc+'</span></button>'; }).join("");
  var course = k === "course", sol = k === "sol";
  $("weightWrap").hidden = course; $("repsWrap").hidden = course; $("durWrap").hidden = !sol; $("cardioFields").hidden = !course;
  $("weightWrap").style.order = sol ? 8 : 4;
  $("fWeightLbl").textContent = k === "halteres" ? "Poids par haltère (kg)" : sol ? "Poids (facultatif, kg)" : "Poids (kg)";
  $("fWeight").placeholder = sol ? "Aucun" : "";
  if (course && !$("fMachine").value.trim()) $("fMachine").value = "Tapis de course";
  if (!course && $("fMachine").value.trim() === "Tapis de course") $("fMachine").value = "";
  renderForm();
}
$("typePick").addEventListener("click", function(e){
  var b = e.target.closest("[data-type]"); if (!b) return;
  var k = b.getAttribute("data-type"); if (k === ftype) return;
  var key = existingKey(); if (key && typeOf(key) !== k){ $("fMachine").value = ""; lastFilled = null; }
  if (k === "sol") $("fWeight").value = ""; else if (!(num($("fWeight").value) > 0)) $("fWeight").value = 20;
  newGroup = null; setType(k);
});
function renderForm(){
  var names = allMachineNames(), map = byMachine();
  $("machinesDL").innerHTML = names.concat(names.indexOf("Tapis de course") < 0 ? ["Tapis de course"] : []).map(function(n){ return '<option value="'+esc(n)+'">'; }).join("");
  var recent = Object.keys(map).filter(function(n){ return typeOf(n) === ftype; })
    .sort(function(a,b){ var la = map[a][map[a].length-1].date, lb = map[b][map[b].length-1].date; return la < lb ? 1 : -1; }).slice(0,6);
  $("recentChips").innerHTML = recent.map(function(n){ return '<button type="button" class="pick" data-name="'+esc(n)+'">'+esc(n)+'</button>'; }).join("");
  updateHint();
}
function updateSpeed(){
  var m = num($("fMin").value), k = num($("fKm").value);
  $("fSpeed").textContent = m > 0 && k > 0 ? kg(k / (m/60)) + " km/h" : "–";
}
["fMin","fKm"].forEach(function(id){ $(id).addEventListener("input", updateSpeed); });
function typeLabel(k){ var x = TYPES.find(function(t){ return t.k === k; }); return x ? x.label : ""; }
function updateHint(){
  var v = $("fMachine").value.trim(), key = existingKey(), map = byMachine();
  document.querySelectorAll("#recentChips .pick").forEach(function(b){ b.setAttribute("aria-pressed", String(!!key && b.getAttribute("data-name") === key)); });
  $("suggestChip").innerHTML = "";
  if (!key){
    $("lastHint").textContent = v ? "Nouvel exercice · " + typeLabel(ftype) : "";
    $("groupPick").hidden = !v || ftype === "course";
    if (v && ftype !== "course"){
      var guess = guessGroup(v), sel = newGroup || (guess !== "cardio" ? guess : null);
      $("groupChips").innerHTML = GROUP_DEFS.filter(function(g){ return g.k !== "cardio"; }).map(function(g){ return '<button type="button" class="pick" data-ng="'+g.k+'" aria-pressed="'+(sel === g.k)+'">'+g.label+'</button>'; }).join("");
      $("groupHint").textContent = newGroup ? "" : (sel ? "Deviné d'après le nom : vérifie avant d'enregistrer." : "Choisis le groupe de cet exercice.");
    }
    return null;
  }
  $("groupPick").hidden = true;
  var l = map[key];
  if (!l){ $("lastHint").textContent = typeLabel(typeOf(key)) + " · pas encore de séance"; return null; }
  var last = l[l.length-1];
  $("lastHint").textContent = typeLabel(typeOf(key)) + " · dernière fois (" + fmtDate(last.date) + ") : " + detailTxt(last) + (modeOf(last) === "load" ? " à " + kg(last.weight) + " kg" : "");
  var s = suggest(l);
  if (s && s.up) $("suggestChip").innerHTML = s.w !== null ? '<button type="button" class="pick" id="useSuggest" data-w="'+s.w+'" style="margin-top:4px">Suggestion : '+kg(s.w)+' kg · utiliser</button>' : '<p class="hint" style="margin:4px 0 0">Objectif : '+esc(s.why)+'</p>';
  return last;
}
function fillFromLast(){
  var cur = $("fMachine").value.trim().toLowerCase();
  if (cur === lastFilled) return; lastFilled = cur;
  var key = existingKey();
  if (key && typeOf(key) !== ftype) setType(typeOf(key));
  var last = updateHint(); if (!last) return;
  var md = modeOf(last);
  if (md === "cardio"){ $("fMin").value = last.minutes || ""; $("fKm").value = last.km || ""; $("fInc").value = last.incline || ""; updateSpeed(); return; }
  $("fR1").value = last.reps[0] || ""; $("fR2").value = last.reps[1] || ""; $("fR3").value = last.reps[2] || "";
  if (md === "sol"){ $("fWeight").value = last.weight > 0 ? last.weight : ""; $("fDurMin").value = last.dur ? Math.floor(last.dur / 60) || "" : ""; $("fDurSec").value = last.dur ? last.dur % 60 || "" : ""; }
  else $("fWeight").value = last.weight;
}
$("fMachine").addEventListener("input", function(){ newGroup = null; updateHint(); });
$("fMachine").addEventListener("change", fillFromLast);
$("groupChips").addEventListener("click", function(e){ var b = e.target.closest("[data-ng]"); if (!b) return; newGroup = b.getAttribute("data-ng"); updateHint(); });
$("recentChips").addEventListener("click", function(e){ var b = e.target.closest("[data-name]"); if (!b) return; $("fMachine").value = b.getAttribute("data-name"); fillFromLast(); });
$("suggestChip").addEventListener("click", function(e){ var b = e.target.closest("#useSuggest"); if (b){ $("fWeight").value = b.getAttribute("data-w"); toast("Poids suggéré appliqué"); } });
document.querySelectorAll("[data-w].step").forEach(function(b){
  b.addEventListener("click", function(){ var v = num($("fWeight").value) || 0; $("fWeight").value = Math.max(0, Math.round((v + parseFloat(b.getAttribute("data-w"))) * 10) / 10); });
});
$("repPresets").addEventListener("click", function(e){ var b = e.target.closest("[data-r]"); if (!b) return; var r = b.getAttribute("data-r"); $("fR1").value = r; $("fR2").value = r; $("fR3").value = r; });
$("addForm").addEventListener("submit", function(e){
  e.preventDefault();
  var name = $("fMachine").value.trim(), date = $("fDate").value, err = $("formErr"), entry;
  if (!name){ err.textContent = "Écris le nom de l'exercice."; $("fMachine").focus(); return; }
  if (!date){ err.textContent = "Choisis la date de la séance."; return; }
  var key = existingKey(), m = key || canonical(name);
  if (ftype === "course"){
    var mi = num($("fMin").value), km = num($("fKm").value), inc = num($("fInc").value);
    if (!(mi > 0)){ err.textContent = "Indique la durée en minutes."; $("fMin").focus(); return; }
    entry = { id: uid(), date: date, machine: m, kind: "cardio", minutes: mi, km: km > 0 ? km : 0, incline: inc > 0 ? inc : 0 };
  } else {
    var reps = [$("fR1").value, $("fR2").value, $("fR3").value].map(function(x){ return Math.max(0, parseInt(x,10) || 0); });
    var w = num($("fWeight").value);
    if (ftype === "sol"){
      var dur = (parseInt($("fDurMin").value, 10) || 0) * 60 + (parseInt($("fDurSec").value, 10) || 0);
      if (!sum(reps) && !dur){ err.textContent = "Indique tes répétitions ou une durée."; $("fR1").focus(); return; }
      entry = { id: uid(), date: date, machine: m, kind: "sol", weight: w > 0 ? w : 0, reps: reps, dur: dur };
    } else {
      if (!(w >= 0)){ err.textContent = "Indique le poids en kg (ex. 42,5)."; $("fWeight").focus(); return; }
      if (!sum(reps)){ err.textContent = "Indique au moins une répétition."; $("fR1").focus(); return; }
      entry = { id: uid(), date: date, machine: m, weight: w, reps: reps };
    }
  }
  if (!key){
    var grp = ftype === "course" ? "cardio" : (newGroup || (guessGroup(m) !== "cardio" ? guessGroup(m) : null));
    if (!grp){ err.textContent = "Choisis le groupe musculaire de ce nouvel exercice."; return; }
    state.meta[m] = { group: grp, equip: ftype };
  }
  err.textContent = ""; newGroup = null;
  addEntry(entry, true);
  $("fMachine").value = ftype === "course" ? "Tapis de course" : ""; lastFilled = null; updateHint();
  go("progress"); openMachine(entry.machine);
});
function addEntry(entry, rest){
  var prevList = byMachine()[entry.machine] || [];
  var prevBest = prevList.length ? Math.max.apply(null, prevList.map(pv)) : null;
  state.entries.push(entry); save(); renderAll(); buzz(20);
  if (prevBest !== null && pv(entry) > prevBest){ toast("Nouveau record sur " + entry.machine + " : " + pvTxt(entry) + " !"); buzz([30,60,30]); celebrate(); }
  else toast(entry.machine + " : " + pvTxt(entry) + " enregistré");
  if (rest && !isC(entry)) startRest();
}
