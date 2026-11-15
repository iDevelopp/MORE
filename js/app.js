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
  $("resetForm").hidden = true;
  $("lockBar").hidden = !!CONFIG.demo;
  $("lock").hidden = false; $("createForm").hidden = true; $("restoreForm").hidden = true; $("lockLogin").hidden = false;
  $("restoreAccBtn").hidden = accounts.length >= MAX_ACC;
  if (!accounts.some(function(a){ return a.id === selectedAcc; })) selectedAcc = accounts.length === 1 ? accounts[0].id : null;
  $("lockSub").textContent = accounts.length ? "Choisis ton compte" : "Crée ton compte, ou connecte-toi s'il existe déjà";
  $("accList").innerHTML = accounts.map(function(a){
    var sub = ONLINE && !a.online ? "Carnet local · à lier à ton compte" : isEmail(a.name) ? a.name : "";
    return '<button type="button" class="acc" data-acc="'+a.id+'" aria-pressed="'+(selectedAcc === a.id)+'">'+avatar(a.name)+'<span class="who"><b>'+esc(displayName(a.name))+'</b>'+(sub ? '<small>'+esc(sub)+'</small>' : '')+'</span></button>';
  }).join("");
  $("loginForm").hidden = !selectedAcc;
  $("newAccBtn").hidden = accounts.length >= MAX_ACC;
  $("demoHint").hidden = !CONFIG.demo || !accounts.some(function(a){ return a.name === "Moi"; });
  if (ONLINE){
    $("newAccBtn").hidden = CONFIG.allowSignup === false || accounts.length >= MAX_ACC;
    $("restoreAccBtn").textContent = "Ajouter un compte";
    $("resetApp").textContent = "Retirer tous les comptes de ce téléphone";
    $("lockSub").textContent = "Entre ton mot de passe";
    if (!accounts.length) openRestore(false);
  }
}
var restoreSignup = false, resetToken = null;
/* Mot de passe oublié : Supabase envoie un e-mail ; son lien revient sur MORE avec un jeton après le # */
function sendRecovery(email, out){
  out.className = "err";
  if (!ONLINE){ out.textContent = "Disponible une fois MORE relié à Supabase."; return; }
  if (!isEmail(email)){ out.textContent = "Entre d'abord ton e-mail ci-dessus, puis touche « Mot de passe oublié ? »."; return; }
  out.className = "err muted"; out.textContent = "Envoi de l'e-mail…";
  var back = location.href.split("#")[0].split("?")[0];
  sbReq("/auth/v1/recover?redirect_to=" + encodeURIComponent(back), { method: "POST", anon: true, body: { email: email } }, sbCfg()).then(function(){
    out.className = "err ok"; out.textContent = "E-mail envoyé à " + email + ". Ouvre le lien du dernier e-mail reçu, une seule fois et dans l'heure.";
  }, function(e){
    out.className = "err"; out.textContent = /rate|seconds|too many/i.test(e && e.message || "") ? "Trop de demandes : attends une minute avant de redemander un e-mail." : syncErr(e);
  });
}
function jwtEmail(t){
  try { var p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); while (p.length % 4) p += "="; return String(JSON.parse(atob(p)).email || "").toLowerCase(); } catch(e){ return ""; }
}
/* Retour depuis un e-mail Supabase (récupération, lien magique) ou lien périmé */
function handleAuthHash(){
  var h = location.hash || ""; if (!/access_token=|error_code=|error=/.test(h)) return;
  var q = {}; h.slice(1).split("&").forEach(function(kv){ var i = kv.indexOf("="); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " ")); });
  try { history.replaceState(null, "", location.pathname + location.search); } catch(e){}
  if (!ONLINE) return;
  if (q.access_token && /^[A-Za-z0-9._-]{20,4000}$/.test(q.access_token)){
    resetToken = q.access_token;
    $("lock").hidden = false; $("lockLogin").hidden = true; $("createForm").hidden = true; $("restoreForm").hidden = true; $("resetForm").hidden = false; $("demoHint").hidden = true;
    var em = jwtEmail(resetToken);
    $("lockSub").textContent = "Nouveau mot de passe";
    $("rsIntro").textContent = em ? "Compte " + em + " : choisis ton nouveau mot de passe." : "Choisis ton nouveau mot de passe.";
    $("resetErr").textContent = ""; $("rsPw").focus();
    return;
  }
  openRestore(false);
  $("restoreErr").className = "err";
  $("restoreErr").textContent = q.error_code === "otp_expired"
    ? "Ce lien a expiré ou a déjà servi (chaque nouvelle demande annule la précédente). Entre ton e-mail et touche « Mot de passe oublié ? » pour en recevoir un nouveau."
    : "Le lien reçu par e-mail n'a pas fonctionné (" + safeStr(q.error_description || q.error, 120) + ").";
}
function openRestore(signup){
  restoreSignup = !!signup;
  $("lock").hidden = false; $("lockLogin").hidden = true; $("createForm").hidden = true; $("restoreForm").hidden = false; $("demoHint").hidden = true;
  $("lockSub").textContent = signup ? "Crée ton compte MORE" : ONLINE ? "Connecte-toi avec ton compte MORE" : "Connexion à ton compte en ligne";
  $("rIntro").textContent = signup ? "Ton compte sert sur tous tes appareils. Tes séances sont chiffrées avec ta phrase secrète avant d'être sauvegardées."
    : ONLINE ? "Ton e-mail et ton mot de passe MORE. La phrase secrète n'est demandée qu'une fois par appareil." : "Retrouve ton compte et tes séances sur ce téléphone.";
  $("rHint").textContent = ONLINE ? "Note ta phrase secrète en lieu sûr : sans elle, impossible de relire tes séances sur un nouvel appareil." : "Ce mot de passe servira aussi à déverrouiller MORE sur ce téléphone.";
  $("rUrlF").hidden = SB_PRESET; $("rKeyF").hidden = SB_PRESET; $("rPw2F").hidden = !signup;
  $("restoreErr").className = "err"; $("restoreErr").textContent = "";
  $("restoreBtn").textContent = signup ? "Créer le compte" : "Se connecter";
  $("cancelRestore").hidden = ONLINE && !accounts.length;
  $("resetApp").hidden = ONLINE && !accounts.length;
}
function shakeLock(){ var c = $("lockCard"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
function enterApp(data, skipPull){
  state = normalize(data); fails = 0; drafts = {}; filter = "all"; pushWarned = false;
  $("loginPw").value = "";
  if (reduced) $("lock").hidden = true;
  else { $("lock").classList.add("unlocking"); setTimeout(function(){ $("lock").classList.remove("unlocking"); if (session) $("lock").hidden = true; }, 420); }
  var now = new Date(); calY = now.getFullYear(); calM = now.getMonth();
  $("fDate").value = todayISO(); $("fMachine").value = ""; setType("machine");
  renderAll(); go(state.active ? "workout" : "progress");
  e2eCache = { salt: null, phrase: null, key: null };
  if (!skipPull && state.sync && state.sync.access && state.sync.phrase) sbPull(true).catch(function(e){ toast(syncErr(e).split(".")[0]); });
  if (ONLINE && !accOnline()) setTimeout(function(){ toast("Lie ce carnet à ton compte : Réglages → Synchronisation"); }, 900);
}
function logout(){ session = null; state = normalize(null); stopRest(); closeAll(); renderAll(); showLock(); }
$("accList").addEventListener("click", function(e){
  var b = e.target.closest("[data-acc]"); if (!b) return;
  selectedAcc = b.getAttribute("data-acc"); $("loginErr").textContent = ""; showLock();
  $("loginPw").value = ""; $("loginPw").focus();
});
$("loginForm").addEventListener("submit", function(e){
  e.preventDefault();
  accounts = readAccounts();
  var acc = accounts.find(function(a){ return a.id === selectedAcc; }), pw = $("loginPw").value, btn = $("loginBtn");
  if (!acc || btn.disabled) return;
  if (!pw){ $("loginErr").textContent = "Entre ton mot de passe."; return; }
  var waitMs = (acc.lockUntil || 0) - Date.now();
  if (waitMs > 0){ $("loginErr").textContent = "Trop d'essais. Réessaie dans " + Math.ceil(waitMs / 1000) + " s."; return; }
  btn.disabled = true; btn.textContent = "Vérification…"; $("loginErr").textContent = "";
  function ok(data, key){
    acc.fails = 0; acc.lockUntil = 0; writeAccounts(accounts); session = { id: acc.id, name: acc.name, key: key, salt: acc.salt }; btn.disabled = false; btn.textContent = "Déverrouiller";
    var online = ONLINE && acc.online; enterApp(data, online); if (online) verifyOnline(acc, pw);
  }
  function stop(msg){ btn.disabled = false; btn.textContent = "Déverrouiller"; $("loginErr").textContent = msg; }
  function wrong(){
    acc.fails = (acc.fails || 0) + 1; shakeLock(); $("loginPw").value = "";
    /* au-delà de 5 échecs : 30 s, puis 60 s, 120 s… jusqu'à 15 min, mémorisé même si on recharge la page */
    var wait = acc.fails >= 5 ? Math.min(30000 * Math.pow(2, acc.fails - 5), 900000) : 0;
    acc.lockUntil = wait ? Date.now() + wait : 0; writeAccounts(accounts);
    $("loginErr").textContent = "Mot de passe incorrect." + (acc.online && acc.fails === 1 ? " Si tu l'as changé récemment, tape-le à la main : le trousseau peut proposer l'ancien." : "") + (wait ? " Réessaie dans " + Math.round(wait/1000) + " s." : acc.fails >= 3 ? " Encore " + (5 - acc.fails) + " essai(s) avant un blocage temporaire." : "");
    setTimeout(function(){ btn.disabled = false; btn.textContent = "Déverrouiller"; }, Math.min(wait, 1500));
  }
  if (acc.mode === "hash"){ setTimeout(function(){ if (slowHash(pw, acc.salt) === acc.hash) ok(acc.plain, null); else wrong(); }, 30); return; }
  if (!hasCrypto){ stop("Ce compte est chiffré et ce navigateur ne sait pas l'ouvrir. Ouvre l'app dans Safari ou Chrome."); return; }
  deriveKey(pw, unb64(acc.salt)).then(function(key){
    return decrypt(key, acc).then(function(d){ ok(d, key); });
  }).catch(function(err){
    if (err && err.name && err.name !== "OperationError"){ stop("Erreur technique (" + err.name + "). Essaie « Effacer tous les comptes » ci-dessous."); return; }
    if (!(ONLINE && acc.online)){ wrong(); return; }
    /* le mot de passe a peut-être changé depuis un autre appareil : on demande au serveur */
    sbReq("/auth/v1/token?grant_type=password", { method: "POST", anon: true, body: { email: acc.name, password: pw } }, sbCfg()).then(function(){
      stop(""); openRestore(false); $("rEmail").value = acc.name; $("rPw").value = pw;
      $("restoreErr").className = "err muted"; $("restoreErr").textContent = "Ton mot de passe a changé depuis un autre appareil. Entre ta phrase secrète pour récupérer tes séances.";
      $("rPhrase").focus();
    }, function(){ wrong(); });
  });
});
$("newAccBtn").addEventListener("click", function(){
  if (ONLINE){ openRestore(true); return; }
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
    session = { id: r.acc.id, name: r.acc.name, key: r.key, salt: r.acc.salt }; selectedAcc = r.acc.id;
    btn.disabled = false; btn.textContent = "Créer le compte";
    enterApp(data); toast("Compte créé. Bienvenue " + displayName(name) + " !");
  }).catch(function(){ btn.disabled = false; btn.textContent = "Créer le compte"; $("createErr").textContent = "Impossible de créer le compte sur cet appareil."; });
});
$("lockBtn").addEventListener("click", logout);

/* Se connecter avec un compte en ligne existant : récupère et déchiffre les séances, puis crée le compte local */
$("restoreAccBtn").addEventListener("click", function(){ openRestore(false); $("rEmail").focus(); });
$("cancelRestore").addEventListener("click", showLock);
$("restoreForm").addEventListener("submit", function(e){
  e.preventDefault();
  var btn = $("restoreBtn"), err = $("restoreErr"); if (btn.disabled) return;
  err.className = "err";
  var cfg = { url: SB_PRESET ? sbBase(CONFIG.supabaseUrl) : sbBase($("rUrl").value), key: SB_PRESET ? CONFIG.supabaseKey : $("rKey").value.trim() };
  var email = $("rEmail").value.trim().toLowerCase(), pw = $("rPw").value, phrase = $("rPhrase").value;
  if (!hasCrypto){ err.textContent = "Ce navigateur ne permet pas le chiffrement : ouvre MORE dans Safari via son adresse https."; return; }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url) || cfg.key.length < 20){ err.textContent = "Adresse du projet ou clé publique invalide."; return; }
  if (!isEmail(email) || pw.length < 8){ err.textContent = "E-mail valide et mot de passe de 8 caractères minimum."; return; }
  if (restoreSignup && pw !== $("rPw2").value){ err.textContent = "Les deux mots de passe ne sont pas identiques."; return; }
  if (phrase.length < 12){ err.textContent = "Entre ta phrase secrète (12 caractères minimum)."; return; }
  var existing = accounts.find(function(a){ return a.name.toLowerCase() === email; });
  if (existing && !ONLINE){ err.textContent = "Ce compte est déjà sur ce téléphone : touche-le dans la liste pour te connecter."; return; }
  if (!existing && accounts.length >= MAX_ACC){ err.textContent = "3 comptes maximum sur ce téléphone."; return; }
  var label = restoreSignup ? "Créer le compte" : "Se connecter";
  btn.disabled = true; btn.textContent = "Connexion…"; err.className = "err muted"; err.textContent = restoreSignup ? "Création du compte…" : "Connexion…";
  var tmp = null;
  sbReq(restoreSignup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password", { method: "POST", anon: true, body: { email: email, password: pw } }, cfg).then(function(j){
    if (restoreSignup && j && !j.access_token) throw new Error("CONFIRM");
    if (!j || !j.access_token || !j.user || !/^[0-9a-f-]{36}$/i.test(j.user.id || "")) throw new Error("Réponse inattendue du serveur");
    tmp = { url: cfg.url, key: cfg.key, email: email, access: j.access_token, refresh: j.refresh_token, uid: j.user.id, last: 0, phrase: phrase, salt: null };
    err.textContent = "Déchiffrement de tes séances…";
    return sbFetchRow(tmp);
  }).then(function(row){
    return row ? e2eOpen(row.data, phrase) : { data: null };
  }).then(function(res){
    var d = normalize(res.data); if (res.salt) tmp.salt = res.salt;
    d.sync = tmp; d.sync.last = Date.now(); d.updatedAt = d.updatedAt || Date.now();
    if (existing){ accounts = accounts.filter(function(a){ return a.id !== existing.id; }); writeAccounts(accounts); }
    return createAccount(email, pw, JSON.parse(JSON.stringify(d))).then(function(r){
      r.acc.online = true; writeAccounts(accounts);
      session = { id: r.acc.id, name: r.acc.name, key: r.key, salt: r.acc.salt }; selectedAcc = r.acc.id;
      btn.disabled = false; btn.textContent = label; $("rPw").value = ""; $("rPw2").value = ""; $("rPhrase").value = ""; err.textContent = "";
      enterApp(d); toast(d.entries.length ? "Bon retour " + displayName(email) + " : tes séances sont là" : "Connecté. Aucune séance en ligne pour l'instant.");
    });
  }).catch(function(e2){ btn.disabled = false; btn.textContent = label; err.className = (e2 && e2.message === "CONFIRM") ? "err ok" : "err"; err.textContent = syncErr(e2); });
});
window.addEventListener("storage", function(e){
  if (e.key !== ACC_KEY) return;
  accounts = readAccounts();
  var a = session && accounts.find(function(x){ return x.id === session.id; });
  if (session && session.salt && (!a || a.salt !== session.salt)){ logout(); toast("Ton mot de passe a changé dans une autre fenêtre : reconnecte-toi"); }
  else if (!session) showLock();
});
document.querySelectorAll("[data-forgot]").forEach(function(b){
  b.addEventListener("click", function(){
    var inRestore = !$("restoreForm").hidden, acc = accounts.find(function(a){ return a.id === selectedAcc; });
    var email = inRestore ? $("rEmail").value.trim().toLowerCase() : (acc && isEmail(acc.name) ? acc.name : "");
    sendRecovery(email, inRestore ? $("restoreErr") : $("loginErr"));
  });
});
$("cancelReset").addEventListener("click", function(){ resetToken = null; $("resetForm").hidden = true; showLock(); });
$("resetForm").addEventListener("submit", function(e){
  e.preventDefault();
  var pw = $("rsPw").value, err = $("resetErr"), btn = $("rsBtn"); err.className = "err";
  if (btn.disabled || !resetToken) return;
  if (pw.length < 8){ err.textContent = "Au moins 8 caractères."; return; }
  if (pw !== $("rsPw2").value){ err.textContent = "Les deux mots de passe ne sont pas identiques."; return; }
  btn.disabled = true; err.className = "err muted"; err.textContent = "Enregistrement…";
  var cfg = sbCfg(), email = jwtEmail(resetToken);
  sbReq("/auth/v1/user", { method: "PUT", body: { password: pw } }, { url: cfg.url, key: cfg.key, access: resetToken }).then(function(){
    btn.disabled = false; resetToken = null; $("rsPw").value = ""; $("rsPw2").value = ""; $("resetForm").hidden = true;
    openRestore(false); if (email) $("rEmail").value = email;
    $("restoreErr").className = "err ok"; $("restoreErr").textContent = "Mot de passe changé. Connecte-toi avec le nouveau et ta phrase secrète : tes séances vont revenir.";
    $(email ? "rPw" : "rEmail").focus();
  }, function(e2){
    btn.disabled = false; err.className = "err";
    err.textContent = /expired|invalid|jwt/i.test(e2 && e2.message || "") ? "Ce lien a expiré : redemande un e-mail avec « Mot de passe oublié ? »." : syncErr(e2);
  });
});
var hiddenAt = 0;
document.addEventListener("visibilitychange", function(){
  if (document.hidden){ hiddenAt = Date.now(); if (session) flushPush(); return; }
  if (session && hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000){ logout(); toast("Verrouillé après 5 min d'absence"); return; }
  if (session && hiddenAt && Date.now() - hiddenAt > 30 * 1000 && state.sync && state.sync.access && state.sync.phrase) sbPull(true).then(fetchComments).catch(function(){});
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
ensureDemo().then(function(){ showLock(); handleAuthHash(); }, function(e){ showLock(); $("lockSub").textContent = "Le compte démo n'a pas pu être créé (" + (e && (e.name || e.message) || e) + ")."; });
setTimeout(function(){ $("splash").classList.add("out"); }, 650);
