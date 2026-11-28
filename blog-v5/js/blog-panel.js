/* Panel pencarian + kategori yang turun halus dari bilah atas saat halaman blog digulir. Logika: js/panel-core.js */
(function(){
  var P = window.IB_PanelCore, panel = document.getElementById("blPanel"), anchor = document.getElementById("blQ"),
      head = document.querySelector(".bl-top"), s = document.getElementById("blQs"), q = document.getElementById("blQi");
  if (!P || !panel || !anchor || !head) return;
  var on = false, tick = 0;
  function set(v){
    on = v; panel.classList.toggle("on", v); panel.setAttribute("aria-hidden", v ? "false" : "true");
    if (s) s.tabIndex = v ? 0 : -1;
    if (v && s && q && s.value !== q.value) s.value = q.value;
  }
  function check(){ tick = 0; var v = P.next(on, anchor.getBoundingClientRect().bottom, head.getBoundingClientRect().bottom); if (v !== on) set(v); }
  function onScroll(){ if (!tick) tick = requestAnimationFrame(check); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  check();
  if (s && q) {
    s.addEventListener("input", function(){ q.value = s.value; q.dispatchEvent(new Event("input", { bubbles: true })); });
    q.addEventListener("input", function(){ if (s.value !== q.value) s.value = q.value; });
    var x = document.getElementById("blQx"); if (x) x.addEventListener("click", function(){ s.value = ""; });
  }
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && on && s && document.activeElement === s) s.blur(); });
})();
