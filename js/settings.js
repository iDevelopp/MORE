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
  $("accMode").textContent = session && session.key ? "Tes données sont chiffrées sur ce téléphone avec ton mot de passe." : "Ce navigateur ne permet pas le chiffrement : le mot de passe protège l'accès à l'app.";
  document.querySelectorAll("#restSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String(+b.getAttribute("data-s") === state.settings.rest)); });
  applyTheme(); paintSync(); paintSetRoot(); showSetPage("root", true);
  openOv("settingsOverlay");
});
/* Navigation dans les réglages : accueil → rubrique */
var SET_TITLES = { root: "Réglages", account: "Compte", appearance: "Apparence", warmup: "Échauffement", rest: "Temps de repos", sync: "Synchronisation", backup: "Sauvegarde" };
function paintSetRoot(){
  if (session){ $("setAv").innerHTML = avatar(session.name); $("setName").textContent = displayName(session.name); $("setMail").textContent = isEmail(session.name) ? session.name : "Compte, avatar, mot de passe"; }
  var tp = themePref(); $("pvTheme").textContent = { dark: "Sombre", light: "Clair", auto: "Auto" }[tp] || "Sombre";
  $("pvWarm").textContent = state.settings.warmup ? "Tapis" : "Non";
  var r = state.settings.rest; $("pvRest").textContent = !r ? "Off" : r === 90 ? "1 min 30" : r % 60 ? r + " s" : (r / 60) + " min";
  $("pvSync").textContent = state.sync && state.sync.access ? "Connecté" : "Non connecté";
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
  armed($("delAccBtn"), "Supprimer", "Sûr ? Retouche", function(){
    var id = session && session.id;
    accounts = accounts.filter(function(a){ return a.id !== id; }); writeAccounts(accounts);
    selectedAcc = null; logout(); toast("Compte supprimé");
  });
});
$("copyBtn").addEventListener("click", function(){ $("backup").value = JSON.stringify(exportData()); copyText($("backup"), $("copyBtn"), "Copier"); });
$("importBtn").addEventListener("click", function(){
  var m = $("backupMsg");
  try {
    if ($("backup").value.length > 5000000) throw 0;
    var raw = JSON.parse($("backup").value), data = Array.isArray(raw) ? { entries: raw } : raw;
    if (!data || !Array.isArray(data.entries)) throw 0;
    var keep = { sync: state.sync }, d = normalize(data); d.sync = keep.sync; state = d; save(); renderAll();
    m.className = "err ok"; m.textContent = state.entries.length + " séances importées.";
  } catch(e){ m.className = "err"; m.textContent = "Ce texte n'est pas une sauvegarde valide."; }
});
$("resetBtn").addEventListener("click", function(){
  armed($("resetBtn"), "Charger les données d'exemple", "Tes données seront remplacées. Touche encore", function(){
    var keep = state.sync; state = normalize({ entries: seed(), routines: seedRoutines() }); state.sync = keep;
    save(); renderAll(); closeAll(); toast("Données d'exemple chargées");
  });
});
