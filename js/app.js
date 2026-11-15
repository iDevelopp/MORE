/* MORE · Navigation, animations, verrou et démarrage
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Navigation, rendu global, commun
   ========================================================= */
var titles = { progress: "Ta progression", workout: "Séance", add: "Nouvelle série", records: "Records", history: "Historique" };
function go(view){
  document.querySelectorAll("[data-view]").forEach(function(s){ s.hidden = s.getAttribute("data-view") !== view; });
  document.querySelectorAll("[data-tab]").forEach(function(b){ if (b.getAttribute("data-tab") === view) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
  $("title").textContent = titles[view];
  if (view === "add" && !$("fDate").value) $("fDate").value = todayISO();
  if (view === "history"){ renderHistChart(); }
  window.scrollTo(0,0);
  moveTabInd();
  var sec = document.querySelector('[data-view="'+view+'"]'); stagger(sec);
  if (view === "progress") ["tSessions","tPR","tGain"].forEach(function(id){ countUp($(id)); });
}
document.querySelectorAll("[data-tab]").forEach(function(b){ b.addEventListener("click", function(){ go(b.getAttribute("data-tab")); }); });
function renderAll(){
  var dt = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" }); dt = esc(dt.charAt(0).toUpperCase() + dt.slice(1));
  $("today").className = "eyebrow" + (session ? " with-av" : "");
  $("today").innerHTML = session ? avatar(session.name, "sm") + '<span>' + dt + ' · ' + esc(displayName(session.name)) + '</span>' : dt;
  renderProgress(); renderWorkout(); renderRecords(); renderHistory(); renderHistChart(); renderCal(); renderBody(); renderForm();
  var tabW = document.querySelector('[data-tab="workout"]'); if (tabW) tabW.lastChild.textContent = state.active ? "En cours" : "Séance";
}
function openOv(id){ var o = $(id); o.classList.remove("closing"); o.hidden = false; }
function closeAll(){
  ["machineOverlay","settingsOverlay","bodyOverlay","routineOverlay"].forEach(function(id){
    var o = $(id); if (o.hidden) return;
    if (reduced){ o.hidden = true; return; }
    o.classList.add("closing");
    setTimeout(function(){ if (o.classList.contains("closing")){ o.hidden = true; o.classList.remove("closing"); } }, 260);
  });
}
document.querySelectorAll(".overlay").forEach(function(o){ o.addEventListener("click", function(e){ if (e.target === o || e.target.closest("[data-close]")) closeAll(); }); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeAll(); });
var tt;
function toast(msg){ var el = $("toast"); el.textContent = msg; el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(tt); tt = setTimeout(function(){ el.hidden = true; }, 2600); }

/* =========================================================
   Animations (désactivées si l'utilisateur réduit les animations)
   ========================================================= */
var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
/* Apparition en cascade des blocs d'une vue */
function stagger(view){
  if (reduced || !view) return;
  var els = view.querySelectorAll(".tiles > *, :scope > .glass, :scope > .card, .section-head, .filters, .group-head, .mcard, .day, .prrow, .routine, #addForm > .ff, #activeWrap > .glass");
  var i = 0;
  els.forEach(function(el){
    if (el.offsetParent === null) return;
    el.classList.remove("st"); void el.offsetWidth;
    el.style.setProperty("--i", Math.min(i++, 14)); el.classList.add("st");
  });
}
/* Compteur qui défile jusqu'à la valeur (chiffres clés) */
function countUp(el){
  if (reduced) return;
  var txt = el.textContent, m = txt.match(/-?\d+(?:[.,]\d+)?/); if (!m) return;
  var target = parseFloat(m[0].replace(",", ".")), dec = (m[0].split(/[.,]/)[1] || "").length, t0 = performance.now(), dur = 700;
  function f(now){
    var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = target * e;
    el.textContent = txt.replace(m[0], dec ? v.toFixed(dec).replace(".", ",") : String(Math.round(v)));
    if (p < 1) requestAnimationFrame(f); else el.textContent = txt;
  }
  requestAnimationFrame(f);
}
/* Indicateur liquide sous l'onglet actif */
function moveTabInd(){
  var ind = $("tabInd"), act = document.querySelector('.tab[aria-current="page"]');
  if (!ind) return;
  if (!act || act.classList.contains("plus")){ ind.style.opacity = "0"; return; }
  ind.style.opacity = "1"; ind.style.width = act.offsetWidth + "px"; ind.style.transform = "translateX(" + act.offsetLeft + "px)";
}
window.addEventListener("resize", moveTabInd);
/* Pluie de particules pour un nouveau record */
function celebrate(){
  if (reduced) return;
  var c = document.createElement("canvas"), dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  c.className = "confetti"; c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
  var ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
  var cols = ["#9be22d", "#ffffff", "#e6ffc2", "#c8f27a"], ps = [];
  for (var i = 0; i < 70; i++){ var a = -Math.PI/2 + (Math.random() - .5) * 1.6, sp = 6 + Math.random() * 7;
    ps.push({ x: W/2, y: H * .62, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2 + Math.random() * 3.5, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .3, sq: Math.random() > .5 }); }
  var t0 = performance.now();
  (function f(now){
    var el = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    ps.forEach(function(p){ p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el / 1.4); ctx.fillStyle = p.c; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.sq) ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill(); }
      ctx.restore(); });
    if (el < 1.4) requestAnimationFrame(f); else c.remove();
  })(t0);
}

/* =========================================================
   Verrou / comptes
   ========================================================= */
var AV_COLORS = [["#6b6e75","#121315"],["#5f6b52","#101310"],["#56656e","#0e1214"],["#6a6272","#131116"],["#726a58","#15130f"],["#7a7a7a","#111111"]];
function isEmail(n){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(n); }
function displayName(n){
  if (!isEmail(n)) return n;
  return n.split("@")[0].split(/[._\-+]+/).filter(Boolean).map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ") || n;
}
function initials(n){
  var words = displayName(n).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase() + (words[0].charAt(1) || "").toLowerCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
var AV_ICONS = {
  arm: '<svg class="av-ic" viewBox="0 0 64 64" aria-hidden="true"><path fill="#fff" d="M7 57 L7 45 C7 35 14 29.5 22 29.5 C27.5 22.5 36 23.5 39 30 L36.5 22.5 C31 22.5 26.5 19 27 13.5 C27.5 8.5 32 6 36.5 6.8 L45 8.6 C49 9.5 50.6 12.8 50 16.4 L53.5 40 C55 50.5 49 57 40.5 57 Z"/><path fill="none" style="stroke:var(--a2)" stroke-width="2.4" stroke-linecap="round" d="M31.5 14.5 L38 15.8 M39 30 C37.5 34 34 36.5 30 37"/></svg>',
  person: '<svg class="av-ic" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="22" r="10.5" fill="#fff"/><path fill="#fff" d="M12 56 C12 44 20.5 37 32 37 C43.5 37 52 44 52 56 Z"/></svg>'
};
function accKind(n){ var a = accounts.find(function(x){ return x.name === n; }); return (a && a.av) || "arm"; }
function avatar(n, cls, kind){
  var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  var c = AV_COLORS[h % AV_COLORS.length], k = kind || accKind(n);
  return '<span class="avatar'+(cls ? " " + cls : "")+'" style="--a1:'+c[0]+';--a2:'+c[1]+';--rot:'+(h % 360)+'deg">'+(AV_ICONS[k] || esc(initials(n)))+'</span>';
}
function paintAvSeg(){
  if (!session) return;
  var k = accKind(session.name);
  $("avSeg").innerHTML = ["arm","person","initials"].map(function(v){
    return '<button type="button" data-av="'+v+'" aria-pressed="'+(v === k)+'">'+avatar(session.name, "sm", v)+'<span>'+({arm:"Bras", person:"Silhouette", initials:"Initiales"})[v]+'</span></button>';
  }).join("");
}
function showLock(){
  $("lock").hidden = false; $("createForm").hidden = true; $("lockLogin").hidden = false;
  if (!accounts.some(function(a){ return a.id === selectedAcc; })) selectedAcc = accounts.length === 1 ? accounts[0].id : null;
  $("lockSub").textContent = accounts.length ? "Choisis ton compte" : "Crée ton premier compte";
  $("accList").innerHTML = accounts.map(function(a){
    return '<button type="button" class="acc" data-acc="'+a.id+'" aria-pressed="'+(selectedAcc === a.id)+'">'+avatar(a.name)+'<span class="who"><b>'+esc(displayName(a.name))+'</b>'+(isEmail(a.name) ? '<small>'+esc(a.name)+'</small>' : '')+'</span></button>';
  }).join("");
  $("loginForm").hidden = !selectedAcc;
  $("newAccBtn").hidden = accounts.length >= MAX_ACC;
  $("demoHint").hidden = !CONFIG.demo || !accounts.some(function(a){ return a.name === "Moi"; });
}
function shakeLock(){ var c = $("lockCard"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
function enterApp(data){
  state = normalize(data); fails = 0; drafts = {}; filter = "all"; pushWarned = false;
  $("loginPw").value = "";
  if (reduced) $("lock").hidden = true;
  else { $("lock").classList.add("unlocking"); setTimeout(function(){ $("lock").hidden = true; $("lock").classList.remove("unlocking"); }, 420); }
  var now = new Date(); calY = now.getFullYear(); calM = now.getMonth();
  $("fDate").value = todayISO(); $("fMachine").value = ""; setType("machine");
  renderAll(); go(state.active ? "workout" : "progress");
  e2eCache = { salt: null, phrase: null, key: null };
  if (state.sync && state.sync.access && state.sync.phrase) sbPull(true).catch(function(e){ toast(syncErr(e).split(".")[0]); });
}
function logout(){ session = null; state = normalize(null); stopRest(); closeAll(); renderAll(); showLock(); }
$("accList").addEventListener("click", function(e){
  var b = e.target.closest("[data-acc]"); if (!b) return;
  selectedAcc = b.getAttribute("data-acc"); $("loginErr").textContent = ""; showLock();
  $("loginPw").value = ""; $("loginPw").focus();
});
$("loginForm").addEventListener("submit", function(e){
  e.preventDefault();
  var acc = accounts.find(function(a){ return a.id === selectedAcc; }), pw = $("loginPw").value, btn = $("loginBtn");
  if (!acc || btn.disabled) return;
  if (!pw){ $("loginErr").textContent = "Entre ton mot de passe."; return; }
  var waitMs = (acc.lockUntil || 0) - Date.now();
  if (waitMs > 0){ $("loginErr").textContent = "Trop d'essais. Réessaie dans " + Math.ceil(waitMs / 1000) + " s."; return; }
  btn.disabled = true; btn.textContent = "Vérification…"; $("loginErr").textContent = "";
  function ok(data, key){ acc.fails = 0; acc.lockUntil = 0; writeAccounts(accounts); session = { id: acc.id, name: acc.name, key: key }; btn.disabled = false; btn.textContent = "Déverrouiller"; enterApp(data); }
  function stop(msg){ btn.disabled = false; btn.textContent = "Déverrouiller"; $("loginErr").textContent = msg; }
  function wrong(){
    acc.fails = (acc.fails || 0) + 1; shakeLock(); $("loginPw").value = "";
    /* au-delà de 5 échecs : 30 s, puis 60 s, 120 s… jusqu'à 15 min, mémorisé même si on recharge la page */
    var wait = acc.fails >= 5 ? Math.min(30000 * Math.pow(2, acc.fails - 5), 900000) : 0;
    acc.lockUntil = wait ? Date.now() + wait : 0; writeAccounts(accounts);
    $("loginErr").textContent = "Mot de passe incorrect." + (wait ? " Réessaie dans " + Math.round(wait/1000) + " s." : acc.fails >= 3 ? " Encore " + (5 - acc.fails) + " essai(s) avant un blocage temporaire." : "");
    setTimeout(function(){ btn.disabled = false; btn.textContent = "Déverrouiller"; }, Math.min(wait, 1500));
  }
  if (acc.mode === "hash"){ setTimeout(function(){ if (slowHash(pw, acc.salt) === acc.hash) ok(acc.plain, null); else wrong(); }, 30); return; }
  if (!hasCrypto){ stop("Ce compte est chiffré et ce navigateur ne sait pas l'ouvrir. Ouvre l'app dans Safari ou Chrome."); return; }
  deriveKey(pw, unb64(acc.salt)).then(function(key){
    return decrypt(key, acc).then(function(d){ ok(d, key); });
  }).catch(function(err){
    if (err && err.name && err.name !== "OperationError") stop("Erreur technique (" + err.name + "). Essaie « Effacer tous les comptes » ci-dessous.");
    else wrong();
  });
});
$("newAccBtn").addEventListener("click", function(){
  $("lockLogin").hidden = true; $("createForm").hidden = false; $("demoHint").hidden = true;
  $("lockSub").textContent = "Nouveau compte (" + (accounts.length + 1) + " sur " + MAX_ACC + ")";
  $("cName").value = ""; $("cPw").value = ""; $("cPw2").value = ""; $("createErr").textContent = ""; $("cName").focus();
  $("cSeedWrap").hidden = accounts.length > 0; $("cSeed").checked = accounts.length === 0;
});
$("cancelCreate").addEventListener("click", showLock);
$("createForm").addEventListener("submit", function(e){
  e.preventDefault();
  var name = $("cName").value.trim(), pw = $("cPw").value, btn = $("createBtn");
  if (btn.disabled) return;
  if (!name){ $("createErr").textContent = "Indique ton e-mail ou un pseudo."; return; }
  if (name.indexOf("@") >= 0 && !isEmail(name)){ $("createErr").textContent = "Cette adresse e-mail n'a pas l'air complète (ex. prenom@icloud.com)."; return; }
  if (accounts.some(function(a){ return a.name.toLowerCase() === name.toLowerCase(); })){ $("createErr").textContent = "Ce nom est déjà pris sur ce téléphone."; return; }
  if (pw.length < 8){ $("createErr").textContent = "Choisis un mot de passe d'au moins 8 caractères."; return; }
  if (pw !== $("cPw2").value){ $("createErr").textContent = "Les deux mots de passe ne sont pas identiques."; return; }
  if (accounts.length >= MAX_ACC){ $("createErr").textContent = "3 comptes maximum sur ce téléphone."; return; }
  btn.disabled = true; btn.textContent = "Création…";
  var data = $("cSeed").checked ? normalize({ entries: seed(), routines: seedRoutines() }) : normalize(null);
  createAccount(name, pw, data).then(function(r){
    session = { id: r.acc.id, name: r.acc.name, key: r.key }; selectedAcc = r.acc.id;
    btn.disabled = false; btn.textContent = "Créer le compte";
    enterApp(data); toast("Compte créé. Bienvenue " + displayName(name) + " !");
  }).catch(function(){ btn.disabled = false; btn.textContent = "Créer le compte"; $("createErr").textContent = "Impossible de créer le compte sur cet appareil."; });
});
$("lockBtn").addEventListener("click", logout);
var hiddenAt = 0;
document.addEventListener("visibilitychange", function(){
  if (document.hidden){ hiddenAt = Date.now(); return; }
  if (session && hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000){ logout(); toast("Verrouillé après 5 min d'absence"); }
});
$("resetApp").addEventListener("click", function(){
  armed($("resetApp"), "Effacer tous les comptes de ce téléphone", "Touche encore : tout sera effacé", function(){
    accounts = []; writeAccounts(accounts); selectedAcc = null; fails = 0;
    try { localStorage.removeItem(OLD_KEY); } catch(e){}
    ensureDemo().then(function(){ showLock(); toast("Maquette réinitialisée : Moi / 1234"); });
  });
});

/* Les formulaires sont bloqués dans certains cadres (ex. aperçu Claude) : on déclenche nous-mêmes l'envoi */
document.querySelectorAll("form").forEach(function(f){
  var fire = function(){ f.dispatchEvent(new Event("submit", { cancelable: true })); };
  f.querySelectorAll('button[type="submit"]').forEach(function(b){ b.type = "button"; b.addEventListener("click", fire); });
  f.addEventListener("keydown", function(e){ if (e.key === "Enter" && e.target.tagName === "INPUT"){ e.preventDefault(); fire(); } });
});

/* Démarrage */
$("fDate").value = todayISO();
renderAll();
showLock();
ensureDemo().then(showLock, function(e){ showLock(); $("lockSub").textContent = "Le compte démo n'a pas pu être créé (" + (e && (e.name || e.message) || e) + ")."; });
setTimeout(function(){ $("splash").classList.add("out"); }, 650);
