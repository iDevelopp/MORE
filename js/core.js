/* MORE · Utilitaires, thème, configuration
   © Propriétaire – voir LICENSE. */
"use strict";
var CONFIG = window.MORE_CONFIG || { demo: false };
/* Anti-iframe : en production, l'app refuse de s'afficher dans une autre page (clickjacking) */
if (!CONFIG.demo && window.top !== window.self){ document.documentElement.style.display = "none"; throw new Error("MORE ne s'affiche pas dans une autre page."); }
/* =========================================================
   Utilitaires
   ========================================================= */
var DAY = 86400000;
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function sum(a){ return a.reduce(function(x,y){ return x + (+y||0); }, 0); }
function kg(n){ return (Math.round(n*10)/10).toLocaleString("fr-FR"); }
function t(d){ return new Date(d + "T12:00:00").getTime(); }
function fmtDate(d, opts){ return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", opts || { day:"numeric", month:"short" }); }
function pad2(n){ return (n < 10 ? "0" : "") + n; }
function todayISO(){ var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }
function ago(d){ var n = Math.round((t(todayISO()) - t(d)) / DAY); if (n <= 0) return "aujourd'hui"; if (n === 1) return "hier"; return "il y a " + n + " j"; }
function niceStep(r){ if (!(r > 0)) return 1; var e = Math.pow(10, Math.floor(Math.log10(r))), f = r/e; return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e; }
function plain(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function num(v){ var n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; }
function buzz(p){ try { if (navigator.vibrate) navigator.vibrate(p || 15); } catch(e){} }
function armed(btn, label, text, cb){
  if (!btn.dataset.armed){ btn.dataset.armed = "1"; btn.textContent = text; setTimeout(function(){ if (btn.dataset.armed){ delete btn.dataset.armed; btn.textContent = label; } }, 3000); return; }
  delete btn.dataset.armed; btn.textContent = label; cb();
}

/* =========================================================
   Thème (global à l'appareil)
   ========================================================= */
var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
function themePref(){ try { return localStorage.getItem("cm-theme") || "dark"; } catch(e){ return "dark"; } }
function applyTheme(){
  var p = themePref(), light = p === "light" || (p === "auto" && mq && mq.matches);
  document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", light ? "#f2f3ef" : "#000000");
  document.querySelectorAll("#themeSeg button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-t") === p)); });
}
if (mq && mq.addEventListener) mq.addEventListener("change", applyTheme);
applyTheme();
