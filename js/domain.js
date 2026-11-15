/* MORE · Exercices, groupes musculaires, mesures, records
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Domaine : machines, groupes, mesures
   ========================================================= */
var GROUP_DEFS = [
  { k: "jambes", label: "Jambes", col: "#4cc9f0" },
  { k: "dos", label: "Dos", col: "#9be22d" },
  { k: "pecs", label: "Pecs", col: "#ff8a3d" },
  { k: "epaules", label: "Épaules", col: "#ffd23f" },
  { k: "bras", label: "Bras", col: "#c77dff" },
  { k: "abdos", label: "Abdos", col: "#f72585" },
  { k: "cardio", label: "Cardio", col: "#2ee6c5" },
  { k: "autre", label: "Autre", col: "#888888" }
];
var GROUP_WORDS = [
  ["cardio", ["tapis de course","course a pied","running","velo","bike","rameur","elliptique","cardio","treadmill","marche rapide"]],
  ["abdos", ["abdo","crunch","gainage","core","planche","plank","releve"]],
  ["jambes", ["leg","jambe","adduct","abduct","squat","mollet","calf","cuisse","fess","glute","hip"]],
  ["epaules", ["shoulder","epaule","deltoid","elevation"]],
  ["bras", ["curl","bras","biceps","triceps","arm","dips","marteau","hammer"]],
  ["pecs", ["pec","chest","developpe","bench","butterfly","fly","pompe","push"]],
  ["dos", ["traction","pull","row","back","dos","tirage","lat","lombaire"]]
];
function gdef(k){ return GROUP_DEFS.find(function(g){ return g.k === k; }) || null; }
function guessGroup(name){
  var p = plain(name);
  for (var i = 0; i < GROUP_WORDS.length; i++) if (GROUP_WORDS[i][1].some(function(w){ return p.indexOf(w) >= 0; })) return GROUP_WORDS[i][0];
  return null;
}
function groupOf(name){ var m = state.meta[name]; return (m && m.group) || guessGroup(name) || "autre"; }
function isC(e){ return e.kind === "cardio"; }
function speedOf(e){ return e.minutes > 0 ? e.km / (e.minutes / 60) : 0; }
/* Mode d'une séance : cardio (tapis de course), sol (tapis de sol : séries + durée), load (machine ou haltères) */
function modeOf(e){ return isC(e) ? "cardio" : e.kind === "sol" ? "sol" : "load"; }
function fmtDur(s){ s = Math.round(s || 0); if (s < 60) return s + " s"; var m = Math.floor(s / 60), r = s % 60; return m + " min" + (r ? " " + pad2(r) : ""); }
function pv(e){ var m = modeOf(e); return m === "cardio" ? e.km : m === "sol" ? (sum(e.reps) || e.dur || 0) : e.weight; }
function pvTxt(e){ var m = modeOf(e); return m === "cardio" ? kg(e.km) + " km" : m === "sol" ? (sum(e.reps) ? sum(e.reps) + " reps" : fmtDur(e.dur)) : kg(e.weight) + " kg"; }
function bigHtml(e){ var m = modeOf(e); return m === "cardio" ? kg(e.km) + '<small>km</small>' : m === "sol" ? (sum(e.reps) ? sum(e.reps) + '<small>reps</small>' : fmtDur(e.dur)) : kg(e.weight) + '<small>kg</small>'; }
function detailTxt(e){
  var m = modeOf(e);
  if (m === "cardio") return Math.round(e.minutes) + " min" + (e.incline ? " · " + kg(e.incline) + " %" : "");
  if (m === "sol") return [sum(e.reps) ? e.reps.join(" · ") : "", e.dur ? fmtDur(e.dur) : "", e.weight > 0 ? kg(e.weight) + " kg" : ""].filter(Boolean).join(" · ");
  return e.reps.join(" · ");
}
var EQUIP_WORDS = [
  ["halteres", ["haltere","dumbbell","kettlebell","halter"]],
  ["sol", ["pompe","push","gainage","planche","plank","crunch","burpee","tapis de sol","au sol","poids du corps","superman","mountain","pont","releve de jambes","russian","chaise","etirement","yoga"]]
];
function guessEquip(n){ var p = plain(n); for (var i = 0; i < EQUIP_WORDS.length; i++) if (EQUIP_WORDS[i][1].some(function(w){ return p.indexOf(w) >= 0; })) return EQUIP_WORDS[i][0]; return "machine"; }
/* Type d'un exercice : machine, halteres, sol ou course */
function typeOf(name){
  var l = byMachine()[name], m = state.meta[name];
  if (l && l.length && isC(l[l.length-1])) return "course";
  if (m && m.equip) return m.equip;
  if (l && l.length && l[l.length-1].kind === "sol") return "sol";
  if (guessGroup(name) === "cardio") return "course";
  return guessEquip(name);
}
function equipOf(n){ return typeOf(n); }
function equipLabel(k){ return typeLabel(k); }
function byMachine(){
  var map = {};
  state.entries.forEach(function(e){ (map[e.machine] = map[e.machine] || []).push(e); });
  Object.keys(map).forEach(function(k){ map[k].sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); });
  return map;
}
function machineIsCardio(name){
  var l = byMachine()[name];
  if (l && l.length) return isC(l[l.length-1]);
  return groupOf(name) === "cardio";
}
function allMachineNames(){
  var set = {}; Object.keys(byMachine()).forEach(function(n){ set[n] = 1; });
  state.routines.forEach(function(r){ r.machines.forEach(function(n){ set[n] = 1; }); });
  return Object.keys(set).sort(function(a,b){ return a.localeCompare(b, "fr"); });
}
function canonical(name){
  var n = name.trim().replace(/\s+/g, " ");
  var found = allMachineNames().find(function(k){ return k.toLowerCase() === n.toLowerCase(); });
  return found || (n.charAt(0).toUpperCase() + n.slice(1));
}
var METRICS = {
  weight: { label: "Charge", f: function(e){ return e.weight; }, unit: "kg", note: "Charge : le poids mis sur la machine à chaque séance (kg)." },
  volume: { label: "Volume", f: function(e){ return e.weight * sum(e.reps); }, unit: "kg", note: "Volume : poids × toutes tes répétitions de la séance." },
  orm: { label: "1RM estimé", f: function(e){ var n = e.reps.filter(function(r){ return r > 0; }).length || 1; return e.weight * (1 + sum(e.reps)/n/30); }, unit: "kg", note: "1RM estimé : le poids max que tu pourrais soulever une seule fois." },
  km: { label: "Distance", f: function(e){ return e.km; }, unit: "km", note: "Distance parcourue sur le tapis (km)." },
  minutes: { label: "Durée", f: function(e){ return e.minutes; }, unit: "min", note: "Temps passé sur le tapis (minutes)." },
  speed: { label: "Vitesse", f: speedOf, unit: "km/h", note: "Vitesse moyenne = distance ÷ durée (km/h)." },
  reps: { label: "Répétitions", f: function(e){ return sum(e.reps); }, unit: "reps", note: "Total des répétitions des 3 séries." },
  dur: { label: "Durée", f: function(e){ return e.dur || 0; }, unit: "s", note: "Durée de l'exercice, en secondes." },
  poids: { label: "Poids", f: function(e){ return e.weight; }, unit: "kg", note: "Poids ajouté, en kg." }
};
var OLD_DAYS = 14;
var STATUS = [
  { k: "up", cls: "g-up", title: "En progrès", hint: "en hausse", col: "#9be22d" },
  { k: "flat", cls: "g-flat", title: "Stable", hint: "même charge, tente plus lourd", col: "#e8c547" },
  { k: "old", cls: "g-old", title: "À reprendre", hint: "pas faite depuis " + OLD_DAYS + " j ou plus", col: "#ff6b6b" }
];
function status(l){
  var last = l[l.length-1];
  if ((t(todayISO()) - t(last.date)) / DAY >= OLD_DAYS) return "old";
  if (l.length > 1 && pv(last) > pv(l[l.length-2])) return "up";
  return "flat";
}
function suggest(l){
  if (!l || !l.length || isC(l[l.length-1])) return null;
  var last = l[l.length-1], prev = l[l.length-2], minR = Math.min.apply(null, last.reps), md = modeOf(last);
  if (md === "sol") return sum(last.reps)
    ? { w: null, up: true, label: "+2 reps", why: "Vise " + (minR + 2) + " répétitions par série la prochaine fois." }
    : { w: null, up: true, label: "+10 s", why: "Tiens " + fmtDur((last.dur || 0) + 10) + " la prochaine fois." };
  var step = last.weight >= 100 ? 5 : equipOf(last.machine) === "halteres" ? 2 : 2.5;
  if (minR >= 12) return { w: last.weight + step, up: true, label: kg(last.weight + step) + " kg", why: "Tu as tenu 3 × " + minR + " à " + kg(last.weight) + " kg : passe à " + kg(last.weight + step) + " kg." };
  if (prev && modeOf(prev) === "load" && prev.weight === last.weight && minR >= 10 && Math.min.apply(null, prev.reps) >= 10) return { w: last.weight + step, up: true, label: kg(last.weight + step) + " kg", why: "Deux séances solides à " + kg(last.weight) + " kg : tente " + kg(last.weight + step) + " kg." };
  return { w: last.weight, up: false, label: kg(last.weight) + " kg", why: "Reste à " + kg(last.weight) + " kg et vise 3 × 12 avant d'augmenter." };
}
/* Records : ids des séances qui battaient le record de la machine à ce moment-là */
function prIds(){
  var ids = {}, map = byMachine();
  Object.keys(map).forEach(function(n){
    var best = null;
    map[n].forEach(function(e){ var v = pv(e); if (best !== null && v > best) ids[e.id] = 1; if (best === null || v > best) best = v; });
  });
  return ids;
}
function bestOf(l){ return l.reduce(function(b, e){ return !b || pv(e) > pv(b) ? e : b; }, null); }
