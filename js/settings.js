/* MORE · Réglages
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Réglages
   ========================================================= */
$("settingsBtn").addEventListener("click", function(){
  $("backup").value = JSON.stringify(exportData()); $("backupMsg").textContent = "";
  $("pwMsg").textContent = ""; $("newPw").value = ""; $("newPw2").value = ""; $("syncMsg").textContent = "";
  $("accName").textContent = session ? session.name : ""; paintAvSeg();
  document.querySelectorAll("#warmSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String((b.getAttribute("data-wu") === "1") === state.settings.warmup)); });
  $("accMode").textContent = ONLINE && accOnline() ? "Compte en ligne : ce mot de passe ouvre MORE sur tous tes appareils. Tes séances sont chiffrées avec ta phrase secrète."
    : session && session.key ? "Tes données sont chiffrées sur ce téléphone avec ton mot de passe." : "Ce navigateur ne permet pas le chiffrement : le mot de passe protège l'accès à l'app.";
  $("curPwF").hidden = !(ONLINE && accOnline()); $("curPw").value = "";
  $("switchBtn").textContent = ONLINE ? "Se déconnecter" : "Changer de compte";
  $("delAccBtn").textContent = ONLINE && accOnline() ? "Retirer de ce téléphone" : "Supprimer";
  document.querySelectorAll("#restSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String(+b.getAttribute("data-s") === state.settings.rest)); });
  $("resetBtn").hidden = ONLINE;
  applyTheme(); paintSync(); paintSetRoot(); showSetPage("root", true);
  openOv("settingsOverlay");
});
/* Navigation dans les réglages : accueil → rubrique */
var SET_TITLES = { root: "Réglages", account: "Compte", appearance: "Apparence", warmup: "Échauffement", rest: "Temps de repos", sync: "Synchronisation", share: "Partage du suivi", backup: "Sauvegarde" };
function paintSetRoot(){
  if (session){ $("setAv").innerHTML = avatar(session.name); $("setName").textContent = displayName(session.name); $("setMail").textContent = isEmail(session.name) ? session.name : "Compte, avatar, mot de passe"; }
  var tp = themePref(); $("pvTheme").textContent = { dark: "Sombre", light: "Clair", auto: "Auto" }[tp] || "Sombre";
  $("pvWarm").textContent = state.settings.warmup ? "Tapis" : "Non";
  var r = state.settings.rest; $("pvRest").textContent = !r ? "Off" : r === 90 ? "1 min 30" : r % 60 ? r + " s" : (r / 60) + " min";
  $("pvSync").textContent = state.sync && state.sync.access ? "Connecté" : "Non connecté";
  paintShares();
}
function showSetPage(name, instant){
  document.querySelectorAll("#settingsOverlay .set-page").forEach(function(p){ p.hidden = p.getAttribute("data-sp") !== name; });
  var page = document.querySelector('#settingsOverlay .set-page[data-sp="'+name+'"]');
  $("sTitle").textContent = SET_TITLES[name]; $("setBack").hidden = name === "root";
  if (!instant && !reduced){ page.classList.remove("push", "pop"); void page.offsetWidth; page.classList.add(name === "root" ? "pop" : "push"); }
  var sh = document.querySelector("#settingsOverlay .sheet"); if (sh) sh.scrollTop = 0;
}
document.querySelector('#settingsOverlay .set-page[data-sp="root"]').addEventListener("click", function(e){ var b = e.target.closest("[data-go]"); if (b) showSetPage(b.getAttribute("data-go")); });
$("setBack").addEventListener("click", function(){ paintSetRoot(); showSetPage("root"); });
$("themeSeg").addEventListener("click", function(e){
  var b = e.target.closest("[data-t]"); if (!b) return;
  try { localStorage.setItem("cm-theme", b.getAttribute("data-t")); } catch(err){}
  applyTheme(); renderAll();
});
$("avSeg").addEventListener("click", function(e){
  var b = e.target.closest("[data-av]"); if (!b || !session) return;
  var a = accounts.find(function(x){ return x.id === session.id; }); if (!a) return;
  a.av = b.getAttribute("data-av"); writeAccounts(accounts); paintAvSeg(); renderAll();
});
$("warmSeg").addEventListener("click", function(e){
  var b = e.target.closest("[data-wu]"); if (!b) return;
  state.settings.warmup = b.getAttribute("data-wu") === "1"; save(); renderWorkout();
  document.querySelectorAll("#warmSeg button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
});
$("restSeg").addEventListener("click", function(e){
  var b = e.target.closest("[data-s]"); if (!b) return;
  state.settings.rest = +b.getAttribute("data-s"); save();
  document.querySelectorAll("#restSeg button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
});
$("savePw").addEventListener("click", function(){
  var pw = $("newPw").value, m = $("pwMsg"); m.className = "err";
  if (!session) return;
  if (pw.length < 8){ m.textContent = "Au moins 8 caractères."; return; }
  if (pw !== $("newPw2").value){ m.textContent = "Les deux mots de passe ne sont pas identiques."; return; }
  var okMsg = function(){ $("newPw").value = ""; $("newPw2").value = ""; m.className = "err ok"; m.textContent = "Mot de passe modifié."; };
  if (ONLINE && accOnline()){
    var cur = $("curPw").value, s = state.sync;
    if (!cur){ m.textContent = "Entre ton mot de passe actuel."; return; }
    if (!s || !s.email){ m.textContent = "Compte en ligne introuvable : reconnecte-toi."; return; }
    m.className = "err muted"; m.textContent = "Modification…";
    sbReq("/auth/v1/token?grant_type=password", { method: "POST", anon: true, body: { email: s.email, password: cur } }, sbCfg()).then(function(j){
      s.access = j.access_token; s.refresh = j.refresh_token || s.refresh;
      return sbReq("/auth/v1/user", { method: "PUT", body: { password: pw } });
    }).then(function(){ return rekeyAccount(pw); }).then(function(){
      $("curPw").value = ""; persist(); okMsg(); m.textContent = "Mot de passe modifié, en ligne et sur ce téléphone.";
    }, function(e){ m.className = "err"; m.textContent = /invalid login/i.test(e && e.message || "") ? "Mot de passe actuel incorrect." : syncErr(e); });
    return;
  }
  if (!session.key){
    var ah = accounts.find(function(x){ return x.id === session.id; }); if (!ah) return;
    ah.salt = randSalt(); ah.hash = slowHash(pw, ah.salt); ah.plain = JSON.parse(JSON.stringify(state)); writeAccounts(accounts); okMsg(); return;
  }
  var salt = crypto.getRandomValues(new Uint8Array(16)), sess = session;
  deriveKey(pw, salt).then(function(key){
    return saveQueue.then(function(){ return encrypt(key, state); }).then(function(enc){
      var a = accounts.find(function(x){ return x.id === sess.id; }); if (!a) return;
      a.salt = b64(salt); a.iv = enc.iv; a.data = enc.data; writeAccounts(accounts); sess.key = key; okMsg();
    });
  }).catch(function(){ m.textContent = "Échec, réessaie."; });
});
$("switchBtn").addEventListener("click", function(){ logout(); });
$("delAccBtn").addEventListener("click", function(){
  var online = ONLINE && accOnline();
  armed($("delAccBtn"), online ? "Retirer de ce téléphone" : "Supprimer", "Sûr ? Retouche", function(){
    var id = session && session.id;
    var done = function(){
      accounts = accounts.filter(function(a){ return a.id !== id; }); writeAccounts(accounts);
      selectedAcc = null; logout(); toast(online ? "Retiré de ce téléphone. Tes séances restent en ligne." : "Compte supprimé");
    };
    if (online && state.sync && state.sync.access) sbPush().then(done, done); else done();
  });
});
$("copyBtn").addEventListener("click", function(){ $("backup").value = JSON.stringify(exportData()); copyText($("backup"), $("copyBtn"), "Copier"); });
/* Ajoute une sauvegarde aux données actuelles : séries, programmes, notes, pesées, sans doublons */
function mergeData(d){
  var sig = function(e){ return [e.date, e.machine, e.kind || "", e.weight || 0, (e.reps || []).join("-"), e.dur || 0, e.minutes || 0, e.km || 0].join("|"); };
  var have = {}, added = 0, skipped = 0, routines = 0;
  state.entries.forEach(function(e){ have[sig(e)] = 1; });
  d.entries.forEach(function(e){ var s = sig(e); if (have[s]){ skipped++; return; } have[s] = 1; e.id = uid(); state.entries.push(e); added++; });
  d.routines.forEach(function(r){ if (!state.routines.some(function(x){ return x.name === r.name; })){ r.id = uid(); state.routines.push(r); routines++; } });
  Object.keys(d.meta).forEach(function(k){ if (!state.meta[k]) state.meta[k] = d.meta[k]; });
  Object.keys(d.notes).forEach(function(k){ if (!state.notes[k]) state.notes[k] = d.notes[k]; });
  d.profile.weights.forEach(function(w){ if (!state.profile.weights.some(function(x){ return x.date === w.date; })) state.profile.weights.push(w); });
  if (!state.profile.height && d.profile.height) state.profile.height = d.profile.height;
  return { added: added, skipped: skipped, routines: routines };
}
$("fileBtn").addEventListener("click", function(){ $("backupFile").click(); });
$("backupFile").addEventListener("change", function(){
  var f = this.files && this.files[0], m = $("backupMsg"); if (!f) return;
  if (f.size > 5000000){ m.className = "err"; m.textContent = "Fichier trop gros (5 Mo maximum)."; return; }
  var rd = new FileReader();
  rd.onload = function(){ $("backup").value = String(rd.result || ""); m.className = "err muted"; m.textContent = "Fichier chargé : touche « Importer » pour l'ajouter."; };
  rd.readAsText(f); this.value = "";
});
$("importBtn").addEventListener("click", function(){
  var m = $("backupMsg");
  try {
    if ($("backup").value.length > 5000000) throw 0;
    var raw = JSON.parse($("backup").value), data = Array.isArray(raw) ? { entries: raw } : raw;
    if (!data || !Array.isArray(data.entries)) throw 0;
    var d = normalize(data), r = mergeData(d); save(); renderAll();
    m.className = "err ok"; m.textContent = r.added + " série" + (r.added > 1 ? "s" : "") + " ajoutée" + (r.added > 1 ? "s" : "") + (r.skipped ? " (" + r.skipped + " déjà présente" + (r.skipped > 1 ? "s" : "") + ")" : "") + (r.routines ? ", " + r.routines + " programme" + (r.routines > 1 ? "s" : "") : "") + ".";
  } catch(e){ m.className = "err"; m.textContent = "Ce texte n'est pas une sauvegarde valide."; }
});
$("resetBtn").addEventListener("click", function(){
  armed($("resetBtn"), "Charger les données d'exemple", "Tes données seront remplacées. Touche encore", function(){
    var keep = state.sync; state = normalize({ entries: seed(), routines: seedRoutines() }); state.sync = keep;
    save(); renderAll(); closeAll(); toast("Données d'exemple chargées");
  });
});
