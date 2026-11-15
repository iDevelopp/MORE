/* MORE · Données de départ et validation des données entrantes
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Données de départ
   ========================================================= */
function seed(){
  var s = [
    ["2026-10-02", [["Abdos",40],["Pectoraux",40],["Shoulder press",20],["Jambes – extérieur",50],["Leg extension",30],["Jambes – intérieur",60],["Upper back",30],["Arm curl",15],["Leg press",100]]],
    ["2026-10-07", [["Vertical traction",40]]],
    ["2026-10-11", [["Pectoraux",40],["Pectoral machine",30,15],["Lower back",40],["Jambes – intérieur",60],["Vertical traction",45],["Pull down",40]]],
    ["2026-10-16", [["Lower back",45,15],["Abdos",45,15],["Jambes – intérieur",60,15],["Jambes – extérieur",50,15],["Leg extension",40,15],["Leg press",120,15],["Vertical traction",45,15],["Pull down",40,15],["Upper back",30,15],["Pectoral machine",35,15]]],
    ["2026-10-22", [["Pectoraux",45],["Vertical traction",50,12],["Pull down",40],["Lower back",40]]],
    ["2026-10-28", [["Pectoraux",50],["Upper back",30],["Abdos",45]]],
    ["2026-11-04", [["Abdos",45],["Leg press",130],["Leg extension",50],["Jambes – intérieur",60],["Vertical traction",50]]],
    ["2026-11-12", [["Pectoraux",50],["Pull down",45],["Leg press",130]]]
  ];
  var out = [];
  s.forEach(function(sess){ sess[1].forEach(function(e){ var r = e[2] || 12; out.push({ id: uid(), date: sess[0], machine: e[0], weight: e[1], reps: [r,r,r] }); }); });
  return out;
}
function seedRoutines(){
  return [
    { id: uid(), name: "Haut du corps", machines: ["Pectoraux","Pectoral machine","Pull down","Vertical traction","Upper back","Lower back","Abdos"] },
    { id: uid(), name: "Bas du corps", machines: ["Leg press","Leg extension","Jambes – intérieur","Jambes – extérieur","Abdos"] }
  ];
}
/* --- Sécurité : tout ce qui vient d'une sauvegarde, du serveur ou du stockage est validé ici --- */
var RE_ID = /^[a-z0-9]{4,40}$/i, RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
function safeId(v){ return typeof v === "string" && RE_ID.test(v) ? v : uid(); }
function safeDate(v){ return typeof v === "string" && RE_DATE.test(v) ? v : null; }
function safeStr(v, max){ return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max || 60); }
function safeNum(v, max){ var n = +v; return isFinite(n) && n >= 0 ? Math.min(n, max || 100000) : 0; }
var GROUP_KEYS = ["jambes","dos","pecs","epaules","bras","abdos","cardio","autre"], TYPE_KEYS = ["machine","halteres","sol","course"];
function normalize(d){
  d = d && typeof d === "object" ? d : {};
  var prof = d.profile && typeof d.profile === "object" ? d.profile : {};
  var st = d.settings && typeof d.settings === "object" ? d.settings : {};
  return {
    entries: Array.isArray(d.entries) ? d.entries.slice(0, 20000).map(cleanEntry).filter(Boolean) : [],
    profile: { height: prof.height ? Math.min(250, safeNum(prof.height)) || null : null,
      weights: Array.isArray(prof.weights) ? prof.weights.slice(0, 5000).filter(function(x){ return x && safeDate(x.date) && +x.weight > 0; }).map(function(x){ return { id: safeId(x.id), date: x.date, weight: safeNum(x.weight, 400) }; }) : [] },
    meta: cleanMeta(d.meta),
    routines: Array.isArray(d.routines) ? d.routines.slice(0, 50).filter(function(r){ return r && r.name && Array.isArray(r.machines); }).map(function(r){
      var o = { id: safeId(r.id), name: safeStr(r.name, 30), machines: r.machines.slice(0, 40).map(function(m){ return safeStr(m); }).filter(Boolean) };
      if (r.warm === false) o.warm = false;
      var g = cleanGoals(r.goals); if (Object.keys(g).length) o.goals = g;
      return o; }) : [],
    notes: cleanNotes(d.notes),
    shares: cleanShares(d.shares),
    active: d.active && typeof d.active.rid === "string" && safeDate(d.active.date) ? { rid: safeId(d.active.rid), date: d.active.date, done: cleanDone(d.active.done) } : null,
    settings: { rest: [0,60,90,120].indexOf(+st.rest) >= 0 ? +st.rest : 90, warmup: st.warmup !== false, seen: safeNum(st.seen, 1e13) },
    sync: d.sync && typeof d.sync.url === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(d.sync.url) ? {
      url: d.sync.url, key: safeStr(d.sync.key, 400), email: safeStr(d.sync.email, 120), access: d.sync.access ? String(d.sync.access) : null,
      refresh: d.sync.refresh ? String(d.sync.refresh) : null, uid: /^[0-9a-f-]{36}$/i.test(d.sync.uid || "") ? d.sync.uid : null, last: safeNum(d.sync.last, 1e13),
      phrase: typeof d.sync.phrase === "string" ? d.sync.phrase.slice(0, 200) : null, salt: /^[A-Za-z0-9+\/=]{16,64}$/.test(d.sync.salt || "") ? d.sync.salt : null } : null,
    updatedAt: safeNum(d.updatedAt, 1e13)
  };
}
function cleanEntry(e){
  if (!e || typeof e !== "object") return null;
  var date = safeDate(e.date), machine = safeStr(e.machine);
  if (!date || !machine) return null;
  if (e.kind === "cardio") return { id: safeId(e.id), date: date, machine: machine, kind: "cardio", minutes: safeNum(e.minutes, 1440), km: safeNum(e.km, 500), incline: safeNum(e.incline, 40) };
  var reps = Array.isArray(e.reps) ? e.reps.slice(0,3).map(function(r){ return Math.round(safeNum(r, 10000)); }) : [0,0,0];
  while (reps.length < 3) reps.push(0);
  if (e.kind === "sol" || e.timed) return { id: safeId(e.id), date: date, machine: machine, kind: "sol", weight: safeNum(e.weight, 500), reps: e.timed ? [0,0,0] : reps, dur: e.timed ? sum(reps) : Math.round(safeNum(e.dur, 86400)) };
  return { id: safeId(e.id), date: date, machine: machine, weight: safeNum(e.weight, 1000), reps: reps };
}
function cleanMeta(m){
  var out = {}; if (!m || typeof m !== "object") return out;
  Object.keys(m).slice(0, 500).forEach(function(k){
    var v = m[k], name = safeStr(k); if (!name || !v || typeof v !== "object") return;
    var o = {}; if (GROUP_KEYS.indexOf(v.group) >= 0) o.group = v.group; if (TYPE_KEYS.indexOf(v.equip) >= 0) o.equip = v.equip;
    out[name] = o;
  });
  return out;
}
function cleanGoals(g){
  var out = {}; if (!g || typeof g !== "object") return out;
  Object.keys(g).slice(0, 40).forEach(function(k){
    var v = g[k], n = safeStr(k); if (!n || !v || typeof v !== "object") return;
    var o = { t: safeStr(v.t, 30) };
    if (Array.isArray(v.r)) o.r = v.r.slice(0, 3).map(function(x){ return Math.round(safeNum(x, 1000)); });
    if (v.d) o.d = Math.round(safeNum(v.d, 3600));
    if (v.m) o.m = safeNum(v.m, 600);
    out[n] = o;
  });
  return out;
}
/* Programmes prêts à l'emploi : type et groupe de chaque exercice, objectif affiché et valeurs pré-remplies */
var TEMPLATES = [
  { key: "domicile", name: "Séance à domicile", desc: "25 à 30 min sans matériel, 3 fois par semaine avec un jour de repos entre deux.", warm: false, ex: [
    ["Échauffement", "sol", "autre", { t: "5 min", r: [0,0,0], d: 300 }],
    ["Pompes classiques", "sol", "pecs", { t: "3 × 12", r: [12,12,12] }],
    ["Pompes inclinées", "sol", "pecs", { t: "2 × 12", r: [12,12,0] }],
    ["Gainage latéral", "sol", "abdos", { t: "3 × 30 s par côté", r: [0,0,0], d: 30 }],
    ["Mountain climbers", "sol", "abdos", { t: "3 × 30 s", r: [0,0,0], d: 30 }],
    ["Squats", "sol", "jambes", { t: "3 × 15", r: [15,15,15] }],
    ["Marche rapide ou vélo", "course", "cardio", { t: "5 à 10 min", m: 8 }]
  ] }
];
function addTemplate(key){
  var t = TEMPLATES.find(function(x){ return x.key === key; }); if (!t) return null;
  var goals = {};
  t.ex.forEach(function(e){
    var m = state.meta[e[0]] = state.meta[e[0]] || {};
    if (!m.equip) m.equip = e[1]; if (!m.group) m.group = e[2];
    goals[e[0]] = e[3];
  });
  var r = { id: uid(), name: t.name, machines: t.ex.map(function(e){ return e[0]; }), goals: goals };
  if (t.warm === false) r.warm = false;
  state.routines.push(r); return r;
}
/* Liens de suivi : identifiant public (22 caractères) et clé de chiffrement propre au lien (43 caractères) */
function cleanShares(s){
  if (!Array.isArray(s)) return [];
  return s.slice(0, 10).filter(function(x){ return x && /^[A-Za-z0-9_-]{22}$/.test(x.id || "") && /^[A-Za-z0-9_-]{43}$/.test(x.key || ""); }).map(function(x){
    return { id: x.id, key: x.key, label: safeStr(x.label, 30) || "Suivi", notes: x.notes === true, weight: x.weight === true, created: safeNum(x.created, 1e13) };
  });
}
function cleanNotes(n){
  var out = {}; if (!n || typeof n !== "object") return out;
  Object.keys(n).forEach(function(k){ if (safeDate(k) && typeof n[k] === "string") out[k] = n[k].slice(0, 1000); });
  return out;
}
function cleanDone(dn){
  var out = {}; if (!dn || typeof dn !== "object") return out;
  Object.keys(dn).slice(0, 60).forEach(function(k){ var n = safeStr(k); if (n && typeof dn[k] === "string" && RE_ID.test(dn[k])) out[n] = dn[k]; });
  return out;
}
function exportData(){ return { entries: state.entries, profile: state.profile, meta: state.meta, routines: state.routines, notes: state.notes, shares: state.shares, settings: state.settings, updatedAt: state.updatedAt }; }
