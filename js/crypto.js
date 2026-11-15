/* MORE · Comptes locaux chiffrés (PBKDF2 + AES-GCM)
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   SHA-256 en JS pur (mode de secours sans crypto.subtle)
   ========================================================= */
var SHA_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(msg){
  var s = unescape(encodeURIComponent(msg)), l = s.length, words = [], i;
  var nw = ((l + 8) >> 6 << 4) + 16;
  for (i = 0; i < nw; i++) words[i] = 0;
  for (i = 0; i < l; i++) words[i>>2] |= (s.charCodeAt(i) & 255) << (24 - (i%4)*8);
  words[l>>2] |= 0x80 << (24 - (l%4)*8);
  words[nw-1] = l * 8;
  var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], w = new Array(64);
  for (var j = 0; j < nw; j += 16){
    var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
    for (i = 0; i < 64; i++){
      if (i < 16) w[i] = words[j+i] | 0;
      else { var x = w[i-15], y = w[i-2];
        w[i] = ((((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3)) + w[i-16] + (((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10)) + w[i-7]) | 0; }
      var t1 = (hh + (((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7))) + ((e&f)^(~e&g)) + SHA_K[i] + w[i]) | 0;
      var t2 = ((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10))) + ((a&b)^(a&c)^(b&c))) | 0;
      hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0; h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
  }
  return h.map(function(v){ return ("00000000" + (v>>>0).toString(16)).slice(-8); }).join("");
}

/* =========================================================
   Comptes chiffrés (PBKDF2 + AES-GCM, ou mode de secours)
   ========================================================= */
var ACC_KEY = "carnet-muscu.accounts.v2", OLD_KEY = "carnet-muscu.v1", MAX_ACC = 3;
var state = normalize(null), session = null, selectedAcc = null, fails = 0;
function readAccounts(){
  try {
    var a = JSON.parse(localStorage.getItem(ACC_KEY));
    return Array.isArray(a) ? a.filter(function(x){ return x && RE_ID.test(x.id || "") && typeof x.name === "string" && typeof x.salt === "string"; }).slice(0, MAX_ACC) : [];
  } catch(e){ return []; }
}
function writeAccounts(a){ try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); return true; } catch(e){ return false; } }
var accounts = readAccounts();
var hasCrypto = !!(window.crypto && crypto.subtle && crypto.getRandomValues && window.TextEncoder);
function b64(buf){ var out = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) out += String.fromCharCode(b[i]); return btoa(out); }
function unb64(str){ var r = atob(str), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
function deriveKey(pw, salt){
  return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]).then(function(base){
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  });
}
function encrypt(key, obj){
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj))).then(function(ct){ return { iv: b64(iv), data: b64(ct) }; });
}
function decrypt(key, acc){
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(acc.iv) }, key, unb64(acc.data)).then(function(pt){ return JSON.parse(new TextDecoder().decode(pt)); });
}
function randSalt(){ var b = new Uint8Array(16); try { crypto.getRandomValues(b); } catch(e){ for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); } return b64(b); }
function slowHash(pw, salt){ var h = sha256(salt + ":" + pw); for (var i = 0; i < 3000; i++) h = sha256(h + salt); return h; }
function hashAccount(name, pw, data){
  var salt = randSalt();
  var acc = { id: uid(), name: name, mode: "hash", salt: salt, hash: slowHash(pw, salt), plain: data };
  accounts.push(acc); writeAccounts(accounts);
  return { acc: acc, key: null };
}
function createAccount(name, pw, data){
  if (!hasCrypto) return Promise.resolve(hashAccount(name, pw, data));
  var salt = crypto.getRandomValues(new Uint8Array(16));
  return deriveKey(pw, salt).then(function(key){
    return encrypt(key, data).then(function(enc){
      var acc = { id: uid(), name: name, salt: b64(salt), iv: enc.iv, data: enc.data };
      accounts.push(acc); writeAccounts(accounts);
      return { acc: acc, key: key };
    });
  }).catch(function(){ return hashAccount(name, pw, data); });
}
var saveQueue = Promise.resolve();
function persist(){
  if (!session) return;
  var snap = JSON.parse(JSON.stringify(state)), sess = session;
  if (!sess.key){
    var a0 = accounts.find(function(x){ return x.id === sess.id; });
    if (a0){ a0.plain = snap; if (!writeAccounts(accounts)) toast("Impossible d'enregistrer sur cet appareil"); }
    return;
  }
  saveQueue = saveQueue.then(function(){ return encrypt(sess.key, snap); }).then(function(enc){
    var a = accounts.find(function(x){ return x.id === sess.id; }); if (!a) return;
    a.iv = enc.iv; a.data = enc.data;
    if (!writeAccounts(accounts)) toast("Impossible d'enregistrer sur cet appareil");
  }).catch(function(){ toast("Erreur d'enregistrement"); });
}
function save(){ state.updatedAt = Date.now(); persist(); schedulePush(); }
function ensureDemo(){
  if (accounts.length || !CONFIG.demo) return Promise.resolve();
  var old = null; try { old = JSON.parse(localStorage.getItem(OLD_KEY)); } catch(e){}
  var data = old && Array.isArray(old.entries) ? normalize(old) : normalize({ entries: seed() });
  data.routines = data.routines.length ? data.routines : seedRoutines();
  return createAccount("Moi", "1234", data).then(function(){ try { localStorage.removeItem(OLD_KEY); } catch(e){} });
}
