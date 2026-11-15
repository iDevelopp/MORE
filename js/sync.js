/* MORE · Synchronisation Supabase (optionnelle)
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Synchronisation Supabase
   ========================================================= */
var pushTimer = null, pushWarned = false;
/* --- Chiffrement de bout en bout : le carnet est chiffré sur le téléphone avant l'envoi.
       Clé = PBKDF2-SHA-256 (250 000 itérations) de la phrase secrète + sel ; chiffrement AES-GCM 256 bits.
       Le serveur ne reçoit que { v, salt, iv, ct } : illisible sans la phrase. --- */
var e2eCache = { salt: null, phrase: null, key: null };
function e2eKey(phrase, saltB64){
  if (e2eCache.key && e2eCache.salt === saltB64 && e2eCache.phrase === phrase) return Promise.resolve(e2eCache.key);
  return deriveKey("more-e2e:" + phrase, unb64(saltB64)).then(function(k){ e2eCache = { salt: saltB64, phrase: phrase, key: k }; return k; });
}
function e2eSeal(obj){
  var s = state.sync;
  if (!s || !s.phrase) return Promise.reject(new Error("NOPHRASE"));
  if (!s.salt) s.salt = randSalt();
  return e2eKey(s.phrase, s.salt).then(function(k){ return encrypt(k, obj); })
    .then(function(enc){ return { v: 1, alg: "AES-GCM-256", kdf: "PBKDF2-SHA256-250000", salt: s.salt, iv: enc.iv, ct: enc.data }; });
}
function e2eOpen(blob, phrase){
  if (!blob || typeof blob !== "object") return Promise.reject(new Error("Données du serveur illisibles."));
  if (!blob.ct) return Promise.resolve({ data: blob, legacy: true });   /* ancienne sauvegarde en clair : rechiffrée au prochain envoi */
  if (typeof blob.salt !== "string" || typeof blob.iv !== "string" || typeof blob.ct !== "string") return Promise.reject(new Error("Données du serveur illisibles."));
  return e2eKey(phrase, blob.salt)
    .then(function(k){ return decrypt(k, { iv: blob.iv, data: blob.ct }); })
    .then(function(d){ return { data: d, salt: blob.salt }; }, function(){ throw new Error("PHRASE"); });
}
function sbFetchRow(sync){
  return sbReq("/rest/v1/carnets?select=data,updated_at&user_id=eq." + encodeURIComponent(sync.uid), {}, sync)
    .then(function(rows){ return rows && rows.length ? rows[0] : null; });
}
function sbBase(u){ return String(u || "").trim().replace(/\/(rest|auth)\/v1.*$/i, "").replace(/\/+$/, ""); }
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
  if (e && e.message === "CONFIRM") return "Compte créé. Confirme ton e-mail (lien reçu), puis connecte-toi.";
  if (e && e.message === "NETWORK") return "Connexion impossible. Dans l'aperçu Claude, la synchro est bloquée : elle marche une fois l'app sur GitHub Pages (ou vérifie l'adresse du projet).";
  var m = (e && e.message) || "Erreur inconnue";
  if (/invalid login/i.test(m)) return "E-mail ou mot de passe en ligne incorrect.";
  if (/email not confirmed/i.test(m)) return "Confirme d'abord ton e-mail (lien reçu de Supabase), puis reconnecte-toi.";
  if (/relation .* does not exist|carnets/i.test(m)) return "La table « carnets » n'existe pas : lance le code SQL ci-dessous dans Supabase.";
  if (m === "PHRASE") return "Phrase secrète incorrecte (ou sauvegarde modifiée sur le serveur) : impossible de déchiffrer.";
  if (m === "NOPHRASE") return "Ajoute ta phrase secrète : déconnecte puis reconnecte la synchronisation.";
  return m;
}
function sbAuth(signup){
  var msg = $("syncMsg"); msg.className = "err";
  var cfg = { url: CONFIG.supabaseUrl ? sbBase(CONFIG.supabaseUrl) : sbBase($("sbUrl").value), key: CONFIG.supabaseKey || $("sbKey").value.trim() }, email = $("sbEmail").value.trim(), pw = $("sbPw").value;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url)){ msg.textContent = "Colle l'adresse du projet, de la forme https://xxxx.supabase.co"; return; }
  if (cfg.key.length < 20){ msg.textContent = "Colle la clé « anon public » du projet."; return; }
  if (!isEmail(email) || pw.length < 8){ msg.textContent = "E-mail valide et mot de passe en ligne de 8 caractères minimum."; return; }
  var phrase = $("sbPhrase").value;
  if (!hasCrypto){ msg.textContent = "Ce navigateur ne permet pas le chiffrement : ouvre MORE dans Safari via son adresse https."; return; }
  if (phrase.length < 12){ msg.textContent = "Choisis une phrase secrète d'au moins 12 caractères (ex. 4 mots séparés par des tirets)."; return; }
  msg.className = "err muted"; msg.textContent = signup ? "Création du compte…" : "Connexion…";
  var path = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  sbReq(path, { method: "POST", anon: true, body: { email: email, password: pw } }, cfg).then(function(j){
    if (!j || !j.access_token){ msg.className = "err ok"; msg.textContent = "Compte créé. Confirme ton e-mail si Supabase te l'a demandé, puis touche « Se connecter »."; return; }
    if (!j.user || !/^[0-9a-f-]{36}$/i.test(j.user.id || "")) throw new Error("Réponse inattendue du serveur");
    var tmp = { url: cfg.url, key: cfg.key, email: email, access: j.access_token, refresh: j.refresh_token, uid: j.user.id, last: 0, phrase: phrase, salt: null };
    msg.textContent = "Vérification de la phrase secrète…";
    /* on vérifie la phrase sur la sauvegarde existante AVANT d'enregistrer quoi que ce soit */
    return sbFetchRow(tmp).then(function(row){
      if (!row){ state.sync = tmp; return sbPush(); }
      return e2eOpen(row.data, phrase).then(function(res){
        tmp.salt = res.salt || null; state.sync = tmp;
        var rt = Date.parse(row.updated_at) || 0;
        if (rt > (state.updatedAt || 0)) applyRemote(res.data);
        if (res.legacy) return sbPush();
      });
    }).then(function(){
      $("sbPw").value = ""; $("sbPhrase").value = ""; persist();
      if (ONLINE && session && !accOnline()) rekeyAccount(pw, email).then(function(){ paintSync(); toast("Carnet lié à " + email + " : ton mot de passe en ligne ouvre maintenant MORE"); }, function(){});
      msg.className = "err ok"; msg.textContent = "Connecté. Tes données sont chiffrées avant chaque envoi."; paintSync();
    });
  }).catch(function(e){ msg.className = "err"; msg.textContent = syncErr(e); });
}
function sbPush(){
  if (!state.sync || !state.sync.access) return Promise.resolve();
  return e2eSeal(exportData()).then(function(blob){
    return sbReq("/rest/v1/carnets?on_conflict=user_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
      body: { user_id: state.sync.uid, data: blob, updated_at: new Date(state.updatedAt || Date.now()).toISOString() } });
  }).then(function(){ state.sync.last = Date.now(); persist(); paintSync(); return sharePushAll().catch(function(e){ shareErr = e; }); });
}
function applyRemote(data){
  var keep = { sync: state.sync, active: state.active }, d = normalize(data);
  d.sync = keep.sync; d.active = keep.active; state = d; persist(); renderAll();
}
/* onlyIfNewer : au démarrage, ne remplace que si le serveur a plus récent */
function sbPull(onlyIfNewer){
  if (!state.sync || !state.sync.access) return Promise.resolve(false);
  if (!state.sync.phrase) return Promise.reject(new Error("NOPHRASE"));
  return sbFetchRow(state.sync).then(function(row){
    if (!row){ if (onlyIfNewer && state.entries.length) schedulePush(); return false; }
    var rt = Date.parse(row.updated_at) || 0;
    if (onlyIfNewer && rt <= (state.updatedAt || 0)){ if (rt < (state.updatedAt || 0)) schedulePush(); return true; }
    return e2eOpen(row.data, state.sync.phrase).then(function(res){
      if (res.salt) state.sync.salt = res.salt;
      applyRemote(res.data); state.sync.last = Date.now(); persist(); paintSync();
      return res.legacy ? sbPush().then(function(){ return true; }) : true;
    });
  });
}
var pushPending = false;
function schedulePush(){
  if (!state.sync || !state.sync.access || !state.sync.phrase) return;
  clearTimeout(pushTimer); pushPending = true;
  pushTimer = setTimeout(flushPush, 400);
}
function flushPush(){
  clearTimeout(pushTimer); if (!pushPending) return; pushPending = false;
  sbPush().then(function(){ pushWarned = false; }, function(e){ pushPending = true; if (!pushWarned){ pushWarned = true; toast("Synchro en attente : " + syncErr(e).split(".")[0]); } });
}
/* =========================================================
   Partage du suivi (lecture seule + commentaires)
   Chaque lien a sa propre clé, placée après le # du lien : elle n'est jamais envoyée au serveur.
   ========================================================= */
var shareErr = null, shareComments = [];
function b64u(buf){ return b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(s){ s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return unb64(s); }
function shareKey(sh){ return crypto.subtle.importKey("raw", unb64u(sh.key), "AES-GCM", false, ["encrypt", "decrypt"]); }
function shareSeal(sh, obj){
  return shareKey(sh).then(function(k){ return encrypt(k, obj); }).then(function(enc){ return { v: 1, alg: "AES-GCM-256", iv: enc.iv, ct: enc.data }; });
}
function shareOpen(sh, blob){
  if (!blob || typeof blob.iv !== "string" || typeof blob.ct !== "string") return Promise.reject(new Error("illisible"));
  return shareKey(sh).then(function(k){ return decrypt(k, { iv: blob.iv, data: blob.ct }); });
}
function shareUrl(sh){ return new URL("suivi.html", location.href).href.split("#")[0] + "#" + sh.id + "." + sh.key; }
/* Ce que voit la personne : 12 derniers mois de séries, types et groupes ; notes et poids seulement si coché */
function shareSnapshot(sh){
  var since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), meta = {}, notes = {};
  var ents = state.entries.filter(function(e){ return e.date >= since; }).map(function(e){
    var o = { date: e.date, machine: e.machine };
    if (isC(e)){ o.kind = "cardio"; o.minutes = e.minutes; o.km = e.km; o.incline = e.incline; }
    else { o.reps = e.reps; o.weight = e.weight; if (e.kind === "sol"){ o.kind = "sol"; o.dur = e.dur; } }
    if (!meta[e.machine]) meta[e.machine] = { equip: typeOf(e.machine), group: groupOf(e.machine) };
    return o;
  });
  if (sh.notes) Object.keys(state.notes).forEach(function(d){ if (d >= since) notes[d] = state.notes[d]; });
  return { v: 1, name: session ? displayName(session.name) : "", at: Date.now(), entries: ents, meta: meta, notes: notes,
    weights: sh.weight ? state.profile.weights : [], height: sh.weight ? state.profile.height : null };
}
function sharePushAll(){
  if (!state.shares || !state.shares.length || !state.sync || !state.sync.access || !hasCrypto) return Promise.resolve();
  return Promise.all(state.shares.map(function(sh){
    return shareSeal(sh, shareSnapshot(sh)).then(function(blob){
      return sbReq("/rest/v1/partages?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
        body: { id: sh.id, owner: state.sync.uid, data: blob, updated_at: new Date().toISOString() } });
    });
  })).then(function(){ shareErr = null; });
}
/* Commentaires laissés sur les liens : déchiffrés ici, affichés dans l'historique */
function fetchComments(){
  if (!state.shares || !state.shares.length || !state.sync || !state.sync.access || !hasCrypto) return Promise.resolve();
  return sbReq("/rest/v1/commentaires?select=id,partage_id,data,created_at&order=created_at.desc&limit=300").then(function(rows){
    return Promise.all((rows || []).map(function(r){
      var sh = state.shares.find(function(x){ return x.id === r.partage_id; }); if (!sh) return null;
      return shareOpen(sh, r.data).then(function(o){
        var text = String(o && o.text || "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, 1000);
        if (!text) return null;
        return { id: +r.id, share: sh.id, label: sh.label, name: safeStr(o.name, 40) || sh.label, text: text, date: safeDate(o.date), at: Date.parse(r.created_at) || 0 };
      }, function(){ return null; });
    }));
  }).then(function(list){
    shareComments = list.filter(Boolean);
    var seen = state.settings.seen || 0, fresh = shareComments.filter(function(c){ return c.at > seen; });
    if (fresh.length){
      toast(fresh.length === 1 ? "Nouveau commentaire de " + fresh[0].name : fresh.length + " nouveaux commentaires");
      state.settings.seen = Math.max.apply(null, shareComments.map(function(c){ return c.at; })); persist();
    }
    renderHistory(); paintShares();
  }, function(){});
}
function commentsHtml(d){
  var l = shareComments.filter(function(c){ return c.date === d; }).sort(function(a, b){ return a.at - b.at; });
  return l.map(function(c){
    return '<div class="cmt"><div class="cmt-head"><b>'+esc(c.name)+'</b><span>'+esc(ago(new Date(c.at).toISOString().slice(0, 10)))+' · via « '+esc(c.label)+' »</span>'
      + '<button type="button" class="del" data-cdel="'+c.id+'" aria-label="Supprimer ce commentaire">✕</button></div><p>'+esc(c.text)+'</p></div>';
  }).join("");
}
function paintShares(){
  var box = $("shareList"); if (!box) return;
  var can = ONLINE && state.sync && state.sync.access && state.sync.phrase;
  $("shareNeed").hidden = !!can; $("shareNew").hidden = !can || state.shares.length >= 10;
  box.innerHTML = state.shares.map(function(sh){
    var n = shareComments.filter(function(c){ return c.share === sh.id; }).length;
    var opts = ["courbes", "séances", "records"].concat(sh.notes ? ["notes"] : [], sh.weight ? ["poids"] : []).join(", ");
    return '<div class="glass card share"><div class="share-head"><b>'+esc(sh.label)+'</b><span>'+n+' commentaire'+(n > 1 ? "s" : "")+'</span></div>'
      + '<p class="hint" style="margin:6px 0 12px">Voit : '+esc(opts)+'</p>'
      + '<div class="row"><button type="button" class="btn sm" data-scopy="'+sh.id+'">Copier le lien</button>'
      + (navigator.share ? '<button type="button" class="btn ghost sm" data-ssend="'+sh.id+'">Envoyer…</button>' : '') + '</div>'
      + '<button type="button" class="btn danger sm" data-scut="'+sh.id+'" style="margin-top:10px">Couper ce lien</button></div>';
  }).join("");
  $("pvShare").textContent = state.shares.length ? state.shares.length + " lien" + (state.shares.length > 1 ? "s" : "") : "Aucun";
}
$("shCreate").addEventListener("click", function(){
  var m = $("shareMsg"), label = $("shLabel").value.trim(); m.className = "err";
  if (!label){ m.textContent = "Indique pour qui est ce lien (ex. Coach)."; return; }
  if (!hasCrypto){ m.textContent = "Ce navigateur ne permet pas le chiffrement."; return; }
  var sh = { id: b64u(crypto.getRandomValues(new Uint8Array(16))), key: b64u(crypto.getRandomValues(new Uint8Array(32))),
    label: safeStr(label, 30), notes: $("shNotes").checked, weight: $("shWeight").checked, created: Date.now() };
  state.shares.push(sh); m.className = "err muted"; m.textContent = "Création du lien…";
  sharePushAll().then(function(){
    save(); $("shLabel").value = ""; $("shNotes").checked = false; $("shWeight").checked = false;
    m.className = "err ok"; m.textContent = "Lien créé : copie-le et envoie-le à " + sh.label + "."; paintShares();
  }, function(e){
    state.shares = state.shares.filter(function(x){ return x.id !== sh.id; });
    m.className = "err"; m.textContent = /partages|does not exist|404/i.test(e && e.message || "") ? "Le partage n'est pas encore activé dans Supabase : copie le code SQL ci-dessous et exécute-le une fois." : syncErr(e);
  });
});
$("shareList").addEventListener("click", function(e){
  var b, sh, m = $("shareMsg");
  if ((b = e.target.closest("[data-scopy]"))){
    sh = state.shares.find(function(x){ return x.id === b.getAttribute("data-scopy"); }); if (!sh) return;
    var url = shareUrl(sh), done = function(){ b.textContent = "Copié !"; setTimeout(function(){ b.textContent = "Copier le lien"; }, 1800); };
    try { navigator.clipboard.writeText(url).then(done, function(){ prompt("Copie ce lien :", url); }); } catch(err){ prompt("Copie ce lien :", url); }
    return;
  }
  if ((b = e.target.closest("[data-ssend]"))){
    sh = state.shares.find(function(x){ return x.id === b.getAttribute("data-ssend"); }); if (!sh) return;
    navigator.share({ title: "Mon suivi MORE", text: "Mon suivi de muscu sur MORE", url: shareUrl(sh) }).catch(function(){});
    return;
  }
  if ((b = e.target.closest("[data-scut]"))){
    var id = b.getAttribute("data-scut");
    armed(b, "Couper ce lien", "Le lien ne marchera plus. Touche encore", function(){
      sbReq("/rest/v1/partages?id=eq." + encodeURIComponent(id), { method: "DELETE" }).then(function(){
        state.shares = state.shares.filter(function(x){ return x.id !== id; });
        shareComments = shareComments.filter(function(c){ return c.share !== id; });
        save(); paintShares(); renderHistory(); toast("Lien coupé");
      }, function(err){ m.className = "err"; m.textContent = "Impossible de couper le lien maintenant (" + syncErr(err) + "). Réessaie avec du réseau."; });
    });
  }
});
$("shareSqlCopy").addEventListener("click", function(){ copyText($("shareSql"), $("shareSqlCopy"), "Copier le code"); });
/* Si l'adresse et la clé Supabase sont dans js/config.js, l'utilisateur n'a plus à les saisir */
var SB_PRESET = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
/* Mode en ligne : le compte MORE est le compte Supabase (plus de compte purement local) */
var ONLINE = !CONFIG.demo && SB_PRESET;
function sbCfg(){ return { url: sbBase(CONFIG.supabaseUrl), key: CONFIG.supabaseKey }; }
function curAcc(){ return session ? accounts.find(function(x){ return x.id === session.id; }) : null; }
function accOnline(){ var a = curAcc(); return !!(a && a.online); }
/* Rechiffre la copie locale avec un nouveau mot de passe (et la rattache au compte en ligne si name est donné) */
function rekeyAccount(pw, name){
  if (!session || !hasCrypto) return Promise.reject(new Error("Chiffrement indisponible sur ce navigateur"));
  var salt = crypto.getRandomValues(new Uint8Array(16)), sess = session;
  return deriveKey(pw, salt).then(function(key){
    return saveQueue.then(function(){ return encrypt(key, JSON.parse(JSON.stringify(state))); }).then(function(enc){
      var a = accounts.find(function(x){ return x.id === sess.id; }); if (!a) return;
      a.salt = b64(salt); a.iv = enc.iv; a.data = enc.data; delete a.mode; delete a.hash; delete a.plain; a.krev = Date.now(); sess.salt = a.salt;
      if (name){ a.name = name; a.online = true; sess.name = name; }
      writeAccounts(accounts); sess.key = key;
    });
  });
}
/* À chaque ouverture : on vérifie le mot de passe auprès du serveur (sans bloquer si on est hors ligne) */
function verifyOnline(acc, pw){
  if (!ONLINE || !acc.online || !state.sync || !state.sync.email) return;
  sbReq("/auth/v1/token?grant_type=password", { method: "POST", anon: true, body: { email: state.sync.email, password: pw } }, sbCfg()).then(function(j){
    if (!j || !j.access_token) return;
    state.sync.url = sbCfg().url; state.sync.key = sbCfg().key;
    state.sync.access = j.access_token; state.sync.refresh = j.refresh_token || state.sync.refresh; persist();
    if (state.sync.phrase) return sbPull(true).then(fetchComments, fetchComments);
  }).then(null, function(e){
    if (e && /invalid login/i.test(e.message || "")){
      var email = acc.name; logout(); openRestore(false); $("rEmail").value = email;
      $("restoreErr").className = "err"; $("restoreErr").textContent = "Ton mot de passe a changé depuis un autre appareil : connecte-toi avec le nouveau.";
    }
  });
}
function paintSync(){
  var on = !!(state.sync && state.sync.access && state.sync.phrase);
  $("sbUrl").closest(".field").hidden = SB_PRESET; $("sbKey").closest(".field").hidden = SB_PRESET;
  $("sbSetup").hidden = SB_PRESET; $("sbSignup").hidden = SB_PRESET && CONFIG.allowSignup === false;
  $("syncForm").hidden = on; $("syncOn").hidden = !on;
  $("sbLogout").hidden = ONLINE && accOnline();
  if (on) $("syncState").textContent = "Connecté en ligne : " + state.sync.email + (state.sync.last ? " · dernière synchro " + new Date(state.sync.last).toLocaleString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "") + ". Chaque modification est chiffrée sur ce téléphone puis envoyée automatiquement : le serveur ne voit qu'un bloc illisible.";
  else {
    $("syncState").textContent = "Sauvegarde tes séances sur un serveur Supabase (gratuit) pour les retrouver sur un autre téléphone.";
    if (state.sync){ $("sbUrl").value = state.sync.url || ""; $("sbKey").value = state.sync.key || ""; $("sbEmail").value = state.sync.email || ""; }
  }
}
$("sbLogin").addEventListener("click", function(){ sbAuth(false); });
$("sbSignup").addEventListener("click", function(){ sbAuth(true); });
$("sbPush").addEventListener("click", function(){ var m = $("syncMsg"); if (!state.sync || !state.sync.access){ m.className = "err"; m.textContent = "Pas connecté : connecte-toi d'abord avec ton compte en ligne."; return; } m.className = "err muted"; m.textContent = "Envoi…"; sbPush().then(function(){ m.className = "err ok"; m.textContent = "Données envoyées."; }, function(e){ m.className = "err"; m.textContent = syncErr(e); }); });
$("sbPull").addEventListener("click", function(){
  var b = $("sbPull"), m = $("syncMsg");
  armed(b, "Récupérer", "Remplacer les données ici ? Touche encore", function(){
    m.className = "err muted"; m.textContent = "Récupération…";
    sbPull(false).then(function(found){ m.className = "err ok"; m.textContent = found ? "Données récupérées depuis le serveur." : "Rien sur le serveur pour l'instant."; }, function(e){ m.className = "err"; m.textContent = syncErr(e); });
  });
});
$("sbLogout").addEventListener("click", function(){
  if (state.sync){ state.sync.access = null; state.sync.refresh = null; state.sync.phrase = null; state.sync.salt = null; }
  e2eCache = { salt: null, phrase: null, key: null }; persist(); paintSync(); $("syncMsg").textContent = "";
});
$("sqlCopy").addEventListener("click", function(){ copyText($("sqlBox"), $("sqlCopy"), "Copier le code"); });
function copyText(ta, btn, label){
  var done = function(){ btn.textContent = "Copié !"; setTimeout(function(){ btn.textContent = label; }, 1800); };
  try { navigator.clipboard.writeText(ta.value).then(done, function(){ ta.select(); btn.textContent = "Sélectionné, copie-le"; }); }
  catch(e){ ta.select(); btn.textContent = "Sélectionné, copie-le"; }
}
