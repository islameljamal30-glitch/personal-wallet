/* Runs before the page paints: marks JavaScript and motion support, with a failsafe so content
   is never left hidden if the animation scripts fail to load. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("motion");
  window.setTimeout(function () { root.classList.add("failsafe"); }, 3000);
})();
