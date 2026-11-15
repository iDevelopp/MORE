/* MORE : page de présentation.
   Ouverte depuis l'icône de l'écran d'accueil (mode application), elle renvoie directement vers l'app. */
(function(){
  "use strict";
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (standalone) window.location.replace("app.html");
})();
