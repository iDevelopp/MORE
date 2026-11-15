/* MORE · page de suivi partagé.
   Le lien a la forme suivi.html#<identifiant>.<clé>. La clé (après le #) n'est jamais envoyée au serveur :
   elle sert seulement, ici, à déchiffrer le suivi et à chiffrer les commentaires.
   © Propriétaire – voir LICENSE. */
(function(){
  "use strict";
  var CONFIG = window.MORE_CONFIG || {};
  var REFRESH_MS = 30000;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function base(u){ return String(u || "").trim().replace(/\/(rest|auth)\/v1.*$/i, "").replace(/\/+$/, ""); }
  function b64(buf){ var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s){ var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  function unb64u(s){ s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return unb64(s); }
  function num(v){ var n = +v; return isFinite(n) && n >= 0 ? n : 0; }
  function sum(a){ return (a || []).reduce(function(x, y){ return x + num(y); }, 0); }
  function kg(v){ return (Math.round(num(v) * 10) / 10).toLocaleString("fr-FR"); }
  function fmtDur(s){ s = Math.round(num(s)); if (s < 60) return s + " s"; var m = Math.floor(s / 60), r = s % 60; return m + " min" + (r ? " " + r : ""); }
  function fmtDate(d, o){ return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", o); }
  function since(ts){
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "à l'instant"; if (m < 60) return "il y a " + m + " min";
    var h = Math.round(m / 60); if (h < 24) return "il y a " + h + " h";
    var j = Math.round(h / 24); return j === 1 ? "hier" : "il y a " + j + " jours";
  }
  function fail(title, text){ $("title").textContent = title; $("sub").textContent = text; $("content").innerHTML = ""; $("liveTag").textContent = "Lecture seule"; $("liveTag").className = "tag"; }

  var m = /^#([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(location.hash || "");
  var url = base(CONFIG.supabaseUrl), apikey = CONFIG.supabaseKey;
  var hasCrypto = !!(window.crypto && crypto.subtle && window.TextEncoder);
  if (!m){ fail("Lien incomplet", "Ce lien de suivi est incomplet : demande à la personne de te le renvoyer en entier."); return; }
  if (!url || !apikey){ fail("Suivi indisponible", "Ce site n'est pas encore relié à son serveur."); return; }
  if (!hasCrypto){ fail("Navigateur non compatible", "Ouvre ce lien dans Safari, Chrome ou Firefox (adresse en https)."); return; }

  var shareId = m[1], keyP = crypto.subtle.importKey("raw", unb64u(m[2]), "AES-GCM", false, ["encrypt", "decrypt"]);
  var snap = null, comments = [], lastStamp = "", openForm = null, busy = false;

  function rpc(name, body){
    return fetch(url + "/rest/v1/rpc/" + name, { method: "POST", headers: { "apikey": apikey, "Authorization": "Bearer " + apikey, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function(r){ return r.text().then(function(t){ var j = null; try { j = t ? JSON.parse(t) : null; } catch(e){}
        if (!r.ok) throw new Error((j && (j.message || j.msg)) || ("Erreur " + r.status)); return j; }); });
  }
  function open(blob){
    if (!blob || typeof blob.iv !== "string" || typeof blob.ct !== "string") return Promise.reject(new Error("illisible"));
    return keyP.then(function(k){ return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, k, unb64(blob.ct)); })
      .then(function(pt){ return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function seal(obj){
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return keyP.then(function(k){ return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj))); })
      .then(function(ct){ return { v: 1, alg: "AES-GCM-256", iv: b64(iv), ct: b64(ct) }; });
  }

  /* ---------- mesures (mêmes règles que l'app) ---------- */
  function mode(e){ return e.kind === "cardio" ? "cardio" : e.kind === "sol" ? "sol" : "load"; }
  function pv(e){ var md = mode(e); return md === "cardio" ? num(e.km) || num(e.minutes) : md === "sol" ? (sum(e.reps) || num(e.dur)) : num(e.weight); }
  function unit(e){ var md = mode(e); return md === "cardio" ? (num(e.km) ? "km" : "min") : md === "sol" ? (sum(e.reps) ? "reps" : "s") : "kg"; }
  function pvTxt(e){ var md = mode(e); return md === "cardio" ? (num(e.km) ? kg(e.km) + " km" : num(e.minutes) + " min") : md === "sol" ? (sum(e.reps) ? sum(e.reps) + " reps" : fmtDur(e.dur)) : kg(e.weight) + " kg"; }
  function detail(e){
    var md = mode(e), reps = (e.reps || []).filter(function(r){ return num(r) > 0; });
    if (md === "cardio") return [num(e.minutes) ? num(e.minutes) + " min" : "", num(e.km) ? kg(e.km) + " km" : "", num(e.incline) ? "pente " + kg(e.incline) + " %" : ""].filter(Boolean).join(" · ");
    if (md === "sol") return [reps.length ? reps.join(" · ") + " reps" : "", num(e.dur) ? fmtDur(e.dur) : "", num(e.weight) ? "+ " + kg(e.weight) + " kg" : ""].filter(Boolean).join(" · ");
    return reps.join(" · ") + (reps.length ? " reps" : "");
  }
  var GROUPS = { jambes: "Jambes", dos: "Dos", pecs: "Pectoraux", epaules: "Épaules", bras: "Bras", abdos: "Abdos", cardio: "Cardio", autre: "Autre" };
  var TYPES = { machine: "Machine", halteres: "Haltères", sol: "Tapis de sol", course: "Tapis de course" };

  /* ---------- rendu ---------- */
  function chart(points){
    var W = 320, H = 110, pl = 30, pr = 10, pt = 14, pb = 20;
    if (points.length < 2) return "";
    var vals = points.map(function(p){ return p.v; }), mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn){ mx += 1; mn = Math.max(0, mn - 1); }
    var pad = (mx - mn) * 0.15; mn = Math.max(0, mn - pad); mx += pad;
    function X(i){ return pl + i * (W - pl - pr) / (points.length - 1); }
    function Y(v){ return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); }
    var d = points.map(function(p, i){ return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.v).toFixed(1); }).join(" ");
    var area = d + " L" + X(points.length - 1).toFixed(1) + " " + (H - pb) + " L" + pl + " " + (H - pb) + " Z";
    var last = points[points.length - 1], up = last.v >= points[0].v;
    var col = up ? "#9be22d" : "#e8c547";
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution">'
      + '<defs><linearGradient id="g' + points.length + 'x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".25"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>'
      + '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="rgba(255,255,255,.08)"/>'
      + '<text x="' + (pl - 6) + '" y="' + (Y(mx - pad) + 3).toFixed(1) + '" text-anchor="end">' + esc(kg(mx - pad)) + '</text>'
      + '<text x="' + (pl - 6) + '" y="' + (Y(Math.max(0, mn + pad)) + 3).toFixed(1) + '" text-anchor="end">' + esc(kg(mn + pad)) + '</text>'
      + '<text x="' + pl + '" y="' + (H - 5) + '">' + esc(fmtDate(points[0].d, { day: "numeric", month: "short" })) + '</text>'
      + '<text x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(fmtDate(last.d, { day: "numeric", month: "short" })) + '</text>'
      + '<path d="' + area + '" fill="url(#g' + points.length + 'x)"/>'
      + '<path d="' + d + '" fill="none" stroke="#f5f5f7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + X(points.length - 1).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="4.5" fill="' + col + '"/></svg>';
  }
  function render(){
    if (!snap) return;
    var ents = (Array.isArray(snap.entries) ? snap.entries : []).filter(function(e){ return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.machine; });
    var name = String(snap.name || "").slice(0, 40) || "ton ami";
    $("title").textContent = "Le suivi de " + name;
    $("sub").textContent = "Mis à jour " + since(snap.at || Date.now()) + " · se met à jour tout seul";
    document.title = "Suivi de " + name + " · MORE";
    if (!ents.length){ $("content").innerHTML = '<div class="empty">Aucune séance pour l\'instant.</div>'; return; }

    var byDay = {}, byEx = {};
    ents.forEach(function(e){ (byDay[e.date] = byDay[e.date] || []).push(e); (byEx[e.machine] = byEx[e.machine] || []).push(e); });
    var days = Object.keys(byDay).sort().reverse();
    var monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    /* records : série qui dépasse tout ce qui précède pour l'exercice */
    var prKeys = {}, prMonth = 0;
    Object.keys(byEx).forEach(function(n){
      var l = byEx[n].slice().sort(function(a, b){ return a.date < b.date ? -1 : 1; }), best = -1;
      l.forEach(function(e, i){ var v = pv(e); if (i > 0 && v > best){ prKeys[n + "|" + e.date] = 1; if (e.date >= monthAgo) prMonth++; } if (v > best) best = v; });
    });
    var html = '<div class="tiles anim">'
      + '<div class="tile"><b>' + days.filter(function(d){ return d >= monthAgo; }).length + '</b><small>séances sur 30 jours</small></div>'
      + '<div class="tile"><b class="date">' + esc(fmtDate(days[0], { day: "numeric", month: "short" })) + '</b><small>dernière séance</small></div>'
      + '<div class="tile"><b class="up">' + prMonth + '</b><small>records ce mois</small></div></div>';

    html += '<h2>Dernières séances</h2><div class="anim">' + days.slice(0, 6).map(function(d){
      var l = byDay[d], note = snap.notes && typeof snap.notes[d] === "string" ? snap.notes[d] : "";
      var cm = comments.filter(function(c){ return c.date === d; });
      return '<div class="day"><div class="day-head"><b>' + esc(fmtDate(d, { weekday: "long", day: "numeric", month: "long" })) + '</b><span>' + l.length + ' exercice' + (l.length > 1 ? "s" : "") + '</span></div>'
        + l.map(function(e){ return '<div class="line"><span class="n">' + esc(e.machine) + (prKeys[e.machine + "|" + d] ? '<span class="pr">PR</span>' : '') + '</span><span class="v">' + esc(pvTxt(e)) + '</span><span class="d">' + esc(detail(e)) + '</span></div>'; }).join("")
        + (note ? '<div class="note">' + esc(note.slice(0, 1000)) + '</div>' : '')
        + cm.map(function(c){ return '<div class="cmt"><div class="cmt-head"><b>' + esc(c.name) + '</b><span>' + esc(since(c.at)) + '</span></div><p>' + esc(c.text) + '</p></div>'; }).join("")
        + (openForm === d
          ? '<div class="cform"><input class="input" id="cName" maxlength="40" placeholder="Ton prénom (ex. Coach)" value="' + esc(localName()) + '"><textarea class="input" id="cText" maxlength="1000" placeholder="Ton commentaire sur cette séance"></textarea><p class="msg" id="cMsg"></p><div class="row"><button type="button" class="btn" data-send="' + d + '">Envoyer</button><button type="button" class="btn ghost" data-cancel>Annuler</button></div></div>'
          : '<button type="button" class="cbtn" data-comment="' + d + '">Commenter cette séance</button>')
        + '</div>';
    }).join("") + '</div>';

    var exNames = Object.keys(byEx).sort(function(a, b){
      var la = byEx[a].reduce(function(x, e){ return e.date > x ? e.date : x; }, ""), lb = byEx[b].reduce(function(x, e){ return e.date > x ? e.date : x; }, "");
      return la < lb ? 1 : la > lb ? -1 : a.localeCompare(b, "fr");
    });
    html += '<h2>Progression</h2><div class="anim">' + exNames.map(function(n){
      var l = byEx[n].slice().sort(function(a, b){ return a.date < b.date ? -1 : 1; }), last = l[l.length - 1], first = l[0];
      var pts = l.map(function(e){ return { d: e.date, v: pv(e) }; }), best = Math.max.apply(null, pts.map(function(p){ return p.v; }));
      var gain = pv(first) > 0 && l.length > 1 ? Math.round((pv(last) - pv(first)) / pv(first) * 100) : null;
      var meta = snap.meta && snap.meta[n] || {};
      var sub = [TYPES[meta.equip] || "", GROUPS[meta.group] || "", l.length + " séance" + (l.length > 1 ? "s" : "")].filter(Boolean).join(" · ");
      return '<div class="ex"><div class="ex-head"><div><b>' + esc(n) + '</b><small>' + esc(sub) + '</small></div>'
        + '<div class="ex-val">' + esc(kg(pv(last))) + '<small>' + esc(unit(last)) + '</small>'
        + '<em class="' + (gain > 0 ? "up" : "") + '">' + (gain !== null ? (gain > 0 ? "▲ +" : gain < 0 ? "▼ " : "= ") + gain + " %" : "1re séance") + ' · record ' + esc(kg(best)) + '</em></div></div>'
        + chart(pts) + '</div>';
    }).join("") + '</div>';

    if (Array.isArray(snap.weights) && snap.weights.length){
      var w = snap.weights.filter(function(x){ return x && /^\d{4}-\d{2}-\d{2}$/.test(x.date || ""); }).sort(function(a, b){ return a.date < b.date ? -1 : 1; });
      if (w.length) html += '<h2>Poids corporel</h2><div class="ex"><div class="ex-head"><div><b>Poids</b><small>' + w.length + ' pesée' + (w.length > 1 ? "s" : "") + '</small></div><div class="ex-val">' + esc(kg(w[w.length - 1].weight)) + '<small>kg</small></div></div>' + chart(w.map(function(x){ return { d: x.date, v: num(x.weight) }; })) + '</div>';
    }
    var keepText = openForm && $("cText") ? $("cText").value : null;
    $("content").innerHTML = html;
    if (openForm && keepText !== null && $("cText")) $("cText").value = keepText;
  }
  function localName(){ try { return localStorage.getItem("more-suivi-nom") || ""; } catch(e){ return ""; } }

  /* ---------- chargement et mise à jour ---------- */
  function load(first){
    if (busy) return; busy = true;
    rpc("lire_partage", { p_id: shareId }).then(function(rows){
      busy = false;
      if (!rows || !rows.length){ snap = null; fail("Lien désactivé", "Ce lien de suivi n'est plus actif. Demande un nouveau lien à la personne qui te l'a envoyé."); return; }
      var row = rows[0], stamp = String(row.updated_at) + "|" + (Array.isArray(row.commentaires) ? row.commentaires.length : 0);
      if (stamp === lastStamp && !first) return;
      lastStamp = stamp;
      return open(row.data).then(function(s){
        snap = s;
        var list = Array.isArray(row.commentaires) ? row.commentaires : [];
        return Promise.all(list.map(function(c){ return open(c.data).then(function(o){
          var t = String(o && o.text || "").trim().slice(0, 1000); if (!t) return null;
          return { name: String(o.name || "Anonyme").slice(0, 40), text: t, date: o.date, at: Date.parse(c.at) || Date.now() };
        }, function(){ return null; }); }));
      }).then(function(cs){
        if (!cs) return;
        comments = cs.filter(Boolean); $("liveTag").textContent = "En direct"; $("liveTag").className = "tag live"; render();
      }, function(){ fail("Lien invalide", "Impossible de lire ce suivi : le lien est peut-être incomplet ou a été remplacé."); });
    }, function(e){
      busy = false;
      if (first) fail("Suivi indisponible", "Le serveur ne répond pas pour l'instant (" + e.message + "). La page réessaiera toute seule.");
      $("liveTag").textContent = "Hors ligne"; $("liveTag").className = "tag";
    });
  }

  document.addEventListener("click", function(e){
    var b;
    if ((b = e.target.closest("[data-comment]"))){ openForm = b.getAttribute("data-comment"); render(); var t = $("cText"); if (t) t.focus(); return; }
    if (e.target.closest("[data-cancel]")){ openForm = null; render(); return; }
    if ((b = e.target.closest("[data-send]"))){
      var d = b.getAttribute("data-send"), name = ($("cName").value || "").trim().slice(0, 40), text = ($("cText").value || "").trim().slice(0, 1000), msg = $("cMsg");
      if (!name){ msg.className = "msg err"; msg.textContent = "Indique ton prénom."; return; }
      if (!text){ msg.className = "msg err"; msg.textContent = "Écris ton commentaire."; return; }
      try { localStorage.setItem("more-suivi-nom", name); } catch(err){}
      b.disabled = true; msg.className = "msg"; msg.textContent = "Envoi…";
      seal({ v: 1, name: name, text: text, date: d }).then(function(blob){ return rpc("commenter_partage", { p_id: shareId, p_data: blob }); }).then(function(){
        comments.push({ name: name, text: text, date: d, at: Date.now() }); openForm = null; lastStamp = ""; render(); load(false);
      }, function(err){ b.disabled = false; msg.className = "msg err"; msg.textContent = "Envoi impossible : " + err.message; });
    }
  });

  window.addEventListener("hashchange", function(){ location.reload(); });
  load(true);
  setInterval(function(){ if (!document.hidden && !openForm) load(false); }, REFRESH_MS);
  document.addEventListener("visibilitychange", function(){ if (!document.hidden && !openForm) load(false); });
})();
