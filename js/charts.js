/* MORE · Graphiques SVG
   © Propriétaire – voir LICENSE. */
"use strict";
/* =========================================================
   Graphiques
   ========================================================= */
function spark(list, col, gid){
  var W = 84, H = 34, p = 3, v = list.map(pv);
  if (v.length === 1) v = [v[0], v[0]];
  var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v); if (hi === lo){ hi += 1; lo -= 1; }
  var pts = v.map(function(y,i){ return [p + i*(W-2*p)/(v.length-1), H-p - (y-lo)/(hi-lo)*(H-2*p)]; });
  var d = pts.map(function(q,i){ return (i?"L":"M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" "), last = pts[pts.length-1];
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".45"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'
    + '<path d="'+d+' L'+last[0].toFixed(1)+' '+H+' L'+p+' '+H+' Z" fill="url(#'+gid+')"/>'
    + '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="3" fill="'+col+'"/></svg>';
}
function drawChart(svg, list, vf){
  var W = 340, H = 210, pl = 40, pr = 18, pt = 22, pb = 28;
  if (!list.length){ svg.innerHTML = '<text x="170" y="105" text-anchor="middle">Pas encore de données</text>'; return; }
  var pts = list.map(function(e){ return { x: t(e.date), y: vf(e), d: e.date }; });
  var xs = pts.map(function(p){ return p.x; }), ys = pts.map(function(p){ return p.y; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x0 === x1){ x0 -= 4*DAY; x1 += 4*DAY; }
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var pad = (y1 - y0) * 0.2 || Math.max(1, y1 * 0.12), step = niceStep((y1 - y0 + 2*pad) / 4);
  y0 = Math.max(0, Math.floor((y0 - pad)/step)*step); y1 = Math.ceil((y1 + pad)/step)*step; if (y1 === y0) y1 = y0 + step;
  function X(v){ return pl + (v - x0)/(x1 - x0)*(W - pl - pr); }
  function Y(v){ return pt + (1 - (v - y0)/(y1 - y0))*(H - pt - pb); }
  var g = '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient>'
        + '<linearGradient id="cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--chart);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--chart)"/></linearGradient></defs>';
  for (var v = y0; v <= y1 + 1e-9; v += step){
    var yy = Y(v).toFixed(1);
    g += '<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke-dasharray="3 4"/>';
    g += '<text x="'+(pl-8)+'" y="'+(+yy+3.5)+'" text-anchor="end">'+kg(v)+'</text>';
  }
  var xl = [pts[0]], mid = pts[Math.floor((pts.length-1)/2)], lastP = pts[pts.length-1];
  if (pts.length > 2 && X(mid.x) - X(pts[0].x) > 60 && X(lastP.x) - X(mid.x) > 60) xl.push(mid);
  if (pts.length > 1) xl.push(lastP);
  xl.forEach(function(p, i){
    var anchor = pts.length === 1 ? "middle" : (i === 0 ? "start" : (i === xl.length-1 ? "end" : "middle"));
    g += '<text x="'+X(p.x).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+anchor+'">'+esc(fmtDate(p.d))+'</text>';
  });
  var c = pts.map(function(p){ return [X(p.x), Y(p.y)]; });
  var d = "M" + c[0][0].toFixed(1) + " " + c[0][1].toFixed(1);
  for (var i = 1; i < c.length; i++){
    var mx = (c[i-1][0] + c[i][0]) / 2;
    d += " C" + mx.toFixed(1) + " " + c[i-1][1].toFixed(1) + " " + mx.toFixed(1) + " " + c[i][1].toFixed(1) + " " + c[i][0].toFixed(1) + " " + c[i][1].toFixed(1);
  }
  if (c.length > 1){
    g += '<path class="fade" d="'+d+' L'+c[c.length-1][0].toFixed(1)+' '+(H-pb)+' L'+c[0][0].toFixed(1)+' '+(H-pb)+' Z" fill="url(#cg)"/>';
    g += '<path class="draw" pathLength="1" d="'+d+'" fill="none" stroke="url(#cl)" stroke-width="3" stroke-linecap="round"/>';
  }
  c.forEach(function(q, i){
    var last = i === c.length - 1, changed = i === 0 || last || Math.round(pts[i].y*10) !== Math.round(pts[i-1].y*10);
    g += '<g class="fade">';
    if (last) g += '<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="10" style="fill:var(--accent);fill-opacity:.22"/>';
    g += '<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+(last?5:3.5)+'" style="fill:'+(last?"var(--accent)":"var(--ink)")+';stroke:'+(last?"var(--accent)":"var(--chart)")+'" stroke-width="2"/>';
    if (changed){
      var lx = Math.min(Math.max(q[0], pl+10), W-pr-6);
      g += '<text class="val" x="'+lx.toFixed(1)+'" y="'+(q[1]-11).toFixed(1)+'" text-anchor="middle">'+kg(pts[i].y)+'</text>';
    }
    g += '</g>';
  });
  svg.innerHTML = g;
}
