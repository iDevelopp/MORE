/* MORE · Minuteur de repos, programmes, séance en cours
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Minuteur de repos
   ========================================================= */
var timerEnd = 0, timerTotal = 0, timerInt = null, audioCtx = null, timerHide = null;
function startRest(sec){
  sec = sec === undefined ? state.settings.rest : sec;
  if (!sec) return;
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); } catch(e){}
  clearTimeout(timerHide);
  timerTotal = sec; timerEnd = Date.now() + sec * 1000;
  $("timer").classList.remove("end"); $("timerLbl").textContent = "Repos"; $("timer").hidden = false;
  clearInterval(timerInt); timerInt = setInterval(tick, 250); tick();
}
function tick(){
  var rem = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  $("timerTxt").textContent = Math.floor(rem/60) + ":" + pad2(rem % 60);
  $("ringArc").setAttribute("stroke-dashoffset", String(100 * (1 - rem / timerTotal)));
  if (rem <= 0){
    clearInterval(timerInt); timerInt = null;
    $("timer").classList.add("end"); $("timerLbl").textContent = "C'est reparti !";
    buzz([200,100,200]); beep();
    timerHide = setTimeout(stopRest, 5000);
  }
}
function beep(){
  try {
    if (!audioCtx) return;
    [0, 0.25].forEach(function(dt){
      var o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + dt;
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.start(t0); o.stop(t0 + 0.22);
    });
  } catch(e){}
}
function stopRest(){ clearInterval(timerInt); timerInt = null; $("timer").hidden = true; }
$("timerPlus").addEventListener("click", function(){
  if (!timerInt){ startRest(15); return; }
  timerEnd += 15000; timerTotal += 15; tick();
});
$("timerStop").addEventListener("click", stopRest);

/* =========================================================
   Programmes et séance en cours
   ========================================================= */
var drafts = {};
var WARMUP = "Tapis de course";
/* Liste réelle d'une séance : le tapis passe en premier si l'échauffement est activé */
function sessionList(r){
  if (!state.settings.warmup || r.warm === false) return r.machines.slice();
  return [WARMUP].concat(r.machines.filter(function(m){ return m !== WARMUP; }));
}
function lastOf(name){ var l = byMachine()[name]; return l ? l[l.length-1] : null; }
function renderWorkout(){
  var a = state.active, r = a && state.routines.find(function(x){ return x.id === a.rid; });
  if (a && !r){ state.active = null; a = null; }
  if (!a){
    $("activeWrap").innerHTML = "";
  } else {
    var list = sessionList(r), done = a.done || {}, nDone = list.filter(function(m){ return done[m]; }).length;
    var rows = list.map(function(m, idx){
      var wu = state.settings.warmup && idx === 0 && m === WARMUP ? '<span class="wu">Échauffement</span>' : '';
      var cardio = machineIsCardio(m), entry = done[m] && state.entries.find(function(e){ return e.id === done[m]; });
      if (entry) return '<div class="wk done'+(justDone === m ? " just" : "")+'"><div><div class="wk-name">'+esc(m)+wu+'</div><div class="wk-sub">'+pvTxt(entry)+' · '+detailTxt(entry)+'</div></div><button type="button" class="check" data-undo="'+esc(m)+'" aria-label="Annuler '+esc(m)+'">'+CHECK+'</button></div>';
      var last = lastOf(m), d = drafts[m] || {}, s = suggest(byMachine()[m]), g = (r.goals || {})[m] || null;
      var sub = last ? "Dernière fois : " + pvTxt(last) + " · " + detailTxt(last) : "Première fois";
      if (g && g.t) sub += " · objectif " + g.t;
      if (s && s.up) sub += " · objectif " + s.label;
      var f;
      if (cardio){
        f = '<div class="wk-fields cardio">'
          + inp(m,"minutes", d.minutes !== undefined ? d.minutes : (last && isC(last) ? last.minutes : (g && g.m ? g.m : "")), "min")
          + inp(m,"km", d.km !== undefined ? d.km : (last && isC(last) ? last.km : ""), "km")
          + inp(m,"incline", d.incline !== undefined ? d.incline : (last && isC(last) ? last.incline : ""), "pente %") + '</div>';
      } else {
        var tp = typeOf(m), rp = last && !isC(last) ? last.reps : (g && g.r ? g.r : [12,12,12]);
        if (tp === "sol"){
          f = '<div class="wk-fields sol">' + [0,1,2].map(function(i){ return inp(m, "r"+i, d["r"+i] !== undefined ? d["r"+i] : (rp[i] || ""), "série "+(i+1)); }).join("")
            + inp(m, "dur", d.dur !== undefined ? d.dur : (last && last.kind === "sol" && last.dur ? last.dur : (g && g.d ? g.d : "")), "durée (s)") + '</div>';
        } else {
          var w = d.weight !== undefined ? d.weight : (s && s.w !== null ? s.w : (last ? last.weight : ""));
          f = '<div class="wk-fields">' + inp(m,"weight", w, tp === "halteres" ? "kg / haltère" : "kg")
            + [0,1,2].map(function(i){ return inp(m, "r"+i, d["r"+i] !== undefined ? d["r"+i] : rp[i], "série "+(i+1)); }).join("") + '</div>';
        }
      }
      return '<div class="wk"><div><div class="wk-name">'+esc(m)+wu+'</div><div class="wk-sub">'+esc(sub)+'</div></div><button type="button" class="check" data-do="'+esc(m)+'" aria-label="Valider '+esc(m)+'">'+CHECK+'</button>'+f+'</div>';
    }).join("");
    $("activeWrap").innerHTML = '<div class="glass card"><div class="section-head" style="padding:0;margin-bottom:12px"><h2>'+esc(r.name)+'</h2><span>'+nDone+' / '+list.length+' faites</span></div>'
      + '<div class="stack">'+rows+'</div>'
      + '<div class="field" style="margin-top:16px"><label for="wkNote">Note de séance (facultatif)</label><textarea class="input" id="wkNote" placeholder="Fatigué, douleur épaule, super forme…">'+esc(state.notes[a.date] || "")+'</textarea></div>'
      + '<div class="row" style="margin-top:12px"><button type="button" class="btn" id="wkFinish">Terminer la séance</button></div>'
      + '<button type="button" class="btn ghost sm" id="wkRest" style="margin-top:10px">Lancer un repos maintenant</button>'
      + '<button type="button" class="btn ghost sm" id="wkQuit" style="margin-top:10px">Abandonner (les séries validées restent)</button></div>';
  }
  $("routineWrap").innerHTML = (a ? '<div class="section-head"><h2>Mes programmes</h2></div>' : '<p class="muted small" style="margin:0 4px">Choisis un programme pour démarrer : les poids de la dernière fois (ou suggérés) sont déjà remplis, tu n\'as plus qu\'à valider chaque machine.</p>')
    + (state.routines.length ? state.routines.map(function(r){
      return '<div class="glass routine"><div class="section-head" style="padding:0"><h2>'+esc(r.name)+'</h2><span>'+sessionList(r).length+' exercices</span></div>'
        + '<div class="mlist">'+sessionList(r).map(esc).join(" · ")+'</div>'
        + '<div class="row">'+(a ? '' : '<button type="button" class="btn sm" data-start="'+r.id+'">Démarrer</button>')+'<button type="button" class="btn ghost sm" data-edit="'+r.id+'">Modifier</button></div></div>';
    }).join("") : '<div class="glass empty">Aucun programme pour l\'instant.</div>')
    + (function(){
      var free = TEMPLATES.filter(function(t){ return !state.routines.some(function(r){ return r.name === t.name; }); });
      if (!free.length || a) return "";
      return '<div class="section-head" style="margin-top:8px"><h2>Programmes prêts</h2></div>' + free.map(function(t){
        return '<div class="glass routine"><div class="section-head" style="padding:0"><h2>'+esc(t.name)+'</h2><span>'+t.ex.length+' exercices</span></div>'
          + '<p class="muted small" style="margin:0">'+esc(t.desc)+'</p>'
          + '<div class="mlist">'+t.ex.map(function(e){ return esc(e[0]) + ' <span class="muted">'+esc(e[3].t)+'</span>'; }).join(" · ")+'</div>'
          + '<div class="row"><button type="button" class="btn ghost sm" data-tpl="'+t.key+'">Ajouter à mes programmes</button></div></div>';
      }).join("");
    })();
}
var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var justDone = null;
function inp(m, k, v, cap){ return '<div><input class="input" data-dm="'+esc(m)+'" data-dk="'+k+'" type="number" inputmode="decimal" value="'+esc(v === undefined || v === null ? "" : v)+'" aria-label="'+esc(m)+' '+cap+'"><div class="cap">'+cap+'</div></div>'; }
$("activeWrap").addEventListener("input", function(e){
  var i = e.target.closest("[data-dm]"); if (!i) return;
  var m = i.getAttribute("data-dm"); drafts[m] = drafts[m] || {}; drafts[m][i.getAttribute("data-dk")] = i.value;
  if (e.target.id === "wkNote") return;
});
$("activeWrap").addEventListener("click", function(e){
  var b, a = state.active;
  if ((b = e.target.closest("[data-do]"))){
    var m = b.getAttribute("data-do"), row = b.closest(".wk"), v = {};
    row.querySelectorAll("[data-dk]").forEach(function(x){ v[x.getAttribute("data-dk")] = x.value; });
    var entry;
    if (machineIsCardio(m)){
      var mi = num(v.minutes); if (!(mi > 0)){ toast("Indique la durée pour " + m); return; }
      entry = { id: uid(), date: a.date, machine: m, kind: "cardio", minutes: mi, km: num(v.km) > 0 ? num(v.km) : 0, incline: num(v.incline) > 0 ? num(v.incline) : 0 };
    } else {
      var reps = [v.r0, v.r1, v.r2].map(function(x){ return Math.max(0, parseInt(x,10) || 0); });
      if (typeOf(m) === "sol"){
        var dur = Math.max(0, parseInt(v.dur, 10) || 0), lw = lastOf(m);
        if (!sum(reps) && !dur){ toast("Indique tes répétitions ou une durée pour " + m); return; }
        entry = { id: uid(), date: a.date, machine: m, kind: "sol", weight: lw && lw.kind === "sol" ? lw.weight : 0, reps: reps, dur: dur };
      } else {
        var w = num(v.weight);
        if (!(w >= 0) || !sum(reps)){ toast("Indique le poids et les séries pour " + m); return; }
        entry = { id: uid(), date: a.date, machine: m, weight: w, reps: reps };
      }
    }
    a.done = a.done || {}; a.done[m] = entry.id; delete drafts[m]; justDone = m; setTimeout(function(){ justDone = null; }, 900);
    addEntry(entry, true);
    return;
  }
  if ((b = e.target.closest("[data-undo]"))){
    var mu = b.getAttribute("data-undo"), id = a.done[mu];
    state.entries = state.entries.filter(function(x){ return x.id !== id; }); delete a.done[mu];
    save(); renderAll(); toast("Série retirée"); return;
  }
  if (e.target.closest("#wkRest")){ startRest(state.settings.rest || 90); return; }
  if (e.target.closest("#wkFinish")){
    var note = ($("wkNote").value || "").trim(), n = Object.keys(a.done || {}).length;
    if (note) state.notes[a.date] = note;
    state.active = null; drafts = {}; save(); renderAll(); stopRest();
    toast(n ? "Séance terminée : " + n + " exercice" + (n>1?"s":"") + ", bravo !" : "Séance terminée"); buzz([30,50,30]);
    go("history"); return;
  }
  if ((b = e.target.closest("#wkQuit"))){ armed(b, "Abandonner (les séries validées restent)", "Sûr ? Touche encore", function(){ state.active = null; drafts = {}; save(); renderAll(); }); }
});
$("routineWrap").addEventListener("click", function(e){
  var b;
  if ((b = e.target.closest("[data-start]"))){
    state.active = { rid: b.getAttribute("data-start"), date: todayISO(), done: {} }; drafts = {};
    save(); renderWorkout(); window.scrollTo(0,0); toast("C'est parti !"); buzz(); return;
  }
  if ((b = e.target.closest("[data-edit]"))) openRoutine(b.getAttribute("data-edit"));
  if ((b = e.target.closest("[data-tpl]"))){ var nr = addTemplate(b.getAttribute("data-tpl")); if (nr){ save(); renderAll(); toast("« " + nr.name + " » ajouté à tes programmes"); } }
});
$("newRoutineBtn").addEventListener("click", function(){ openRoutine(null); });
var rDraft = null;
function openRoutine(id){
  var r = id && state.routines.find(function(x){ return x.id === id; });
  rDraft = r ? { id: r.id, name: r.name, machines: r.machines.slice() } : { id: null, name: "", machines: [] };
  $("rTitle").textContent = r ? "Modifier le programme" : "Nouveau programme";
  $("rName").value = rDraft.name; $("rErr").textContent = ""; $("rNew").value = "";
  $("rDelete").hidden = !r; $("rWarmNote").hidden = !state.settings.warmup; $("rDelete").textContent = "Supprimer ce programme"; delete $("rDelete").dataset.armed;
  paintPicks(); openOv("routineOverlay");
}
function paintPicks(){
  var names = allMachineNames(); if (names.indexOf("Tapis de course") < 0) names.push("Tapis de course");
  rDraft.machines.forEach(function(m){ if (names.indexOf(m) < 0) names.push(m); });
  $("rPicks").innerHTML = names.map(function(n){
    var i = rDraft.machines.indexOf(n), g = gdef(groupOf(n));
    return '<button type="button" class="pick" data-p="'+esc(n)+'" aria-pressed="'+(i >= 0)+'">'+(i >= 0 ? '<b>'+(i+1)+'.</b> ' : '')+esc(n)+'</button>';
  }).join("");
}
$("rPicks").addEventListener("click", function(e){
  var b = e.target.closest("[data-p]"); if (!b) return;
  var n = b.getAttribute("data-p"), i = rDraft.machines.indexOf(n);
  if (i >= 0) rDraft.machines.splice(i, 1); else rDraft.machines.push(n);
  paintPicks();
});
$("rNewBtn").addEventListener("click", function(){
  var v = $("rNew").value.trim(); if (!v) return;
  var n = canonical(v); if (rDraft.machines.indexOf(n) < 0) rDraft.machines.push(n);
  $("rNew").value = ""; paintPicks();
});
$("rNew").addEventListener("keydown", function(e){ if (e.key === "Enter"){ e.preventDefault(); $("rNewBtn").click(); } });
$("rSave").addEventListener("click", function(){
  var name = $("rName").value.trim();
  if (!name){ $("rErr").textContent = "Donne un nom au programme."; return; }
  if (!rDraft.machines.length){ $("rErr").textContent = "Choisis au moins une machine."; return; }
  if (rDraft.id){ var r = state.routines.find(function(x){ return x.id === rDraft.id; }); r.name = name; r.machines = rDraft.machines.slice(); }
  else state.routines.push({ id: uid(), name: name, machines: rDraft.machines.slice() });
  save(); closeAll(); renderWorkout(); toast("Programme enregistré");
});
$("rDelete").addEventListener("click", function(){
  armed($("rDelete"), "Supprimer ce programme", "Sûr ? Touche encore", function(){
    state.routines = state.routines.filter(function(x){ return x.id !== rDraft.id; });
    if (state.active && state.active.rid === rDraft.id) state.active = null;
    save(); closeAll(); renderWorkout(); toast("Programme supprimé");
  });
});
