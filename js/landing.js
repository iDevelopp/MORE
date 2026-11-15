/* MORE : page de présentation.
   - Ouverte depuis l'icône de l'écran d'accueil (mode application), elle renvoie directement vers l'app.
   - Apparitions au défilement, vidéo qui grandit en entrant à l'écran, léger parallaxe des téléphones. */
(function(){
  "use strict";
  /* lien reçu par e-mail (mot de passe oublié, lien périmé) : on le confie à l'app */
  if (/access_token=|error_code=|error=/.test(location.hash || "")){ window.location.replace("app.html" + location.hash); return; }
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (standalone){ window.location.replace("app.html"); return; }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) document.documentElement.classList.add("js");

  document.addEventListener("DOMContentLoaded", function(){
    var bar = document.querySelector(".bar"), frames = document.querySelectorAll(".frame"), shots = document.querySelectorAll(".feat img");

    if (!reduce && "IntersectionObserver" in window){
      var io = new IntersectionObserver(function(list){
        list.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
      document.querySelectorAll("[data-reveal]").forEach(function(el){ io.observe(el); });
    }

    var ticking = false;
    function frame(){
      ticking = false;
      var vh = window.innerHeight;
      if (bar) bar.classList.toggle("scrolled", window.scrollY > 40);
      if (reduce) return;
      /* la vidéo passe de 88 % à 100 % de sa taille en remontant vers le haut de l'écran */
      frames.forEach(function(f){
        var r = f.getBoundingClientRect(), k = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
        f.style.setProperty("--vs", (0.88 + 0.12 * (1 - Math.pow(1 - k, 3))).toFixed(4));
      });
      /* les téléphones glissent légèrement moins vite que la page */
      shots.forEach(function(img){
        var r = img.getBoundingClientRect(), c = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.setProperty("--py", (c * -40).toFixed(1) + "px");
      });
    }
    function onScroll(){ if (!ticking){ ticking = true; window.requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
  });
})();
