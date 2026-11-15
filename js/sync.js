/* MORE · Synchronisation Supabase (optionnelle)
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Synchronisation Supabase
   ========================================================= */
var pushTimer = null, pushWarned = false;
function sbBase(u){ return String(u || "").trim().replace(/\/+$/, ""); }
function sbReq(path, opts, sync){
  sync = sync || state.sync; opts = opts || {};
  var headers = { "apikey": sync.key, "Content-Type": "application/json" };
  headers.Authorization = "Bearer " + (opts.anon ? sync.key : (sync.access || sync.key));
  if (opts.prefer) headers.Prefer = opts.prefer;
  return fetch(sbBase(sync.url) + path, { method: opts.method || "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined }).then(function(res){
    if (res.status === 401 && !opts.retried && !opts.anon && sync.refresh){
      return sbRefresh(sync).then(function(){ opts.retried = true; return sbReq(path, opts, sync); });
    }
    return res.text().then(function(txt){
      var json = null; try { json = txt ? JSON.parse(txt) : null; } catch(e){}
      if (!res.ok){ var msg = json && (json.msg || json.message || json.error_description || json.error) || ("Erreur " + res.status); throw new Error(msg); }
      return json;
    });
  }, function(){ throw new Error("NETWORK"); });
}
function sbRefresh(sync){
  return sbReq("/auth/v1/token?grant_type=refresh_token", { method: "POST", anon: true, body: { refresh_token: sync.refresh } }, sync).then(function(j){
    sync.access = j.access_token; sync.refresh = j.refresh_token || sync.refresh; persist();
  });
}
function syncErr(e){
  if (e && e.message === "NETWORK") return "Connexion impossible. Dans l'aperçu Claude, la synchro est bloquée : elle marche une fois l'app sur GitHub Pages (ou vérifie l'adresse du projet).";
  var m = (e && e.message) || "Erreur inconnue";
  if (/invalid login/i.test(m)) return "E-mail ou mot de passe en ligne incorrect.";
  if (/email not confirmed/i.test(m)) return "Confirme d'abord ton e-mail (lien reçu de Supabase), puis reconnecte-toi.";
  if (/relation .* does not exist|carnets/i.test(m)) return "La table « carnets » n'existe pas : lance le code SQL ci-dessous dans Supabase.";
  return m;
}
function sbAuth(signup){
  var msg = $("syncMsg"); msg.className = "err";
  var cfg = { url: sbBase($("sbUrl").value), key: $("sbKey").value.trim() }, email = $("sbEmail").value.trim(), pw = $("sbPw").value;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url)){ msg.textContent = "Colle l'adresse du projet, de la forme https://xxxx.supabase.co"; return; }
  if (cfg.key.length < 20){ msg.textContent = "Colle la clé « anon public » du projet."; return; }
  if (!isEmail(email) || pw.length < 8){ msg.textContent = "E-mail valide et mot de passe en ligne de 8 caractères minimum."; return; }
  msg.className = "err muted"; msg.textContent = signup ? "Création du compte…" : "Connexion…";
  var path = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  sbReq(path, { method: "POST", anon: true, body: { email: email, password: pw } }, cfg).then(function(j){
    if (!j || !j.access_token){ msg.className = "err ok"; msg.textContent = "Compte créé. Confirme ton e-mail si Supabase te l'a demandé, puis touche « Se connecter »."; return; }
    if (!j.user || !/^[0-9a-f-]{36}$/i.test(j.user.id || "")) throw new Error("Réponse inattendue du serveur");
    state.sync = { url: cfg.url, key: cfg.key, email: email, access: j.access_token, refresh: j.refresh_token, uid: j.user.id, last: 0 };
    $("sbPw").value = ""; persist();
    return sbPull(true).then(function(found){ if (!found) return sbPush(); }).then(function(){ msg.className = "err ok"; msg.textContent = "Connecté et synchronisé."; paintSync(); });
  }).catch(function(e){ msg.className = "err"; msg.textContent = syncErr(e); });
}
function sbPush(){
  if (!state.sync || !state.sync.access) return Promise.resolve();
  return sbReq("/rest/v1/carnets?on_conflict=user_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: { user_id: state.sync.uid, data: exportData(), updated_at: new Date(state.updatedAt || Date.now()).toISOString() } })
    .then(function(){ state.sync.last = Date.now(); persist(); paintSync(); });
}
function applyRemote(data){
  var keep = { sync: state.sync, active: state.active }, d = normalize(data);
  d.sync = keep.sync; d.active = keep.active; state = d; persist(); renderAll();
}
/* onlyIfNewer : au démarrage, ne remplace que si le serveur a plus récent */
function sbPull(onlyIfNewer){
  if (!state.sync || !state.sync.access) return Promise.resolve(false);
  return sbReq("/rest/v1/carnets?select=data,updated_at&user_id=eq." + encodeURIComponent(state.sync.uid)).then(function(rows){
    if (!rows || !rows.length) return false;
    var remote = rows[0], rt = Date.parse(remote.updated_at) || 0;
    if (onlyIfNewer && rt <= (state.updatedAt || 0)) return true;
    applyRemote(remote.data); state.sync.last = Date.now(); persist(); paintSync();
    return true;
  });
}
function schedulePush(){
  if (!state.sync || !state.sync.access) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function(){ sbPush().catch(function(e){ if (!pushWarned){ pushWarned = true; toast("Synchro en attente : " + syncErr(e).split(".")[0]); } }); }, 2500);
}
function paintSync(){
  var on = !!(state.sync && state.sync.access);
  $("syncForm").hidden = on; $("syncOn").hidden = !on;
  if (on) $("syncState").textContent = "Connecté en ligne : " + state.sync.email + (state.sync.last ? " · dernière synchro " + new Date(state.sync.last).toLocaleString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "") + ". Chaque modification est envoyée automatiquement.";
  else {
    $("syncState").textContent = "Sauvegarde tes séances sur un serveur Supabase (gratuit) pour les retrouver sur un autre téléphone.";
    if (state.sync){ $("sbUrl").value = state.sync.url || ""; $("sbKey").value = state.sync.key || ""; $("sbEmail").value = state.sync.email || ""; }
  }
}
$("sbLogin").addEventListener("click", function(){ sbAuth(false); });
$("sbSignup").addEventListener("click", function(){ sbAuth(true); });
$("sbPush").addEventListener("click", function(){ var m = $("syncMsg"); m.className = "err muted"; m.textContent = "Envoi…"; sbPush().then(function(){ m.className = "err ok"; m.textContent = "Données envoyées."; }, function(e){ m.className = "err"; m.textContent = syncErr(e); }); });
$("sbPull").addEventListener("click", function(){
  var b = $("sbPull"), m = $("syncMsg");
  armed(b, "Récupérer", "Remplacer les données ici ? Touche encore", function(){
    m.className = "err muted"; m.textContent = "Récupération…";
    sbPull(false).then(function(found){ m.className = "err ok"; m.textContent = found ? "Données récupérées depuis le serveur." : "Rien sur le serveur pour l'instant."; }, function(e){ m.className = "err"; m.textContent = syncErr(e); });
  });
});
$("sbLogout").addEventListener("click", function(){ if (state.sync){ state.sync.access = null; state.sync.refresh = null; } persist(); paintSync(); $("syncMsg").textContent = ""; });
$("sqlCopy").addEventListener("click", function(){ copyText($("sqlBox"), $("sqlCopy"), "Copier le code"); });
function copyText(ta, btn, label){
  var done = function(){ btn.textContent = "Copié !"; setTimeout(function(){ btn.textContent = label; }, 1800); };
  try { navigator.clipboard.writeText(ta.value).then(done, function(){ ta.select(); btn.textContent = "Sélectionné, copie-le"; }); }
  catch(e){ ta.select(); btn.textContent = "Sélectionné, copie-le"; }
}
