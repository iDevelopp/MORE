/* MORE · applique le thème avant l'affichage (évite un flash blanc) */
try { var p = localStorage.getItem("cm-theme") || "dark"; if (p === "light" || (p === "auto" && matchMedia("(prefers-color-scheme: light)").matches)) document.documentElement.setAttribute("data-theme", "light"); } catch (e) {}
