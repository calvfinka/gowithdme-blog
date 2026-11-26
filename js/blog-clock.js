/* Jam dan tanggal di paling atas halaman blog. Berdetak tiap detik, berhenti saat tab tersembunyi. Logika: js/clock-core.js */
(function(){
  var C = window.IB_ClockCore, box = document.getElementById("blClock");
  if (!C || !box) return;
  var dEl = box.querySelector("[data-d]"), tEl = box.querySelector("[data-t]"), zEl = box.querySelector("[data-z]");
  var tz = C.deviceTz(), timer = 0, last = "";
  function paint(){
    var n = new Date(), r = C.format(n, tz), key = r.date + r.time;
    if (key !== last) {
      last = key;
      if (dEl.textContent !== r.date) dEl.textContent = r.date;
      tEl.textContent = r.time;
      if (zEl.textContent !== r.zone) zEl.textContent = r.zone;
      box.setAttribute("datetime", r.iso + "T" + r.time);
    }
    return n;
  }
  function loop(){ var n = paint(); timer = setTimeout(loop, C.untilNextSecond(n)); }
  function stop(){ clearTimeout(timer); timer = 0; }
  document.addEventListener("visibilitychange", function(){ if (document.hidden) stop(); else if (!timer) loop(); });
  loop();
})();
