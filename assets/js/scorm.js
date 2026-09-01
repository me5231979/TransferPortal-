/* =====================================================================
   SCORM 1.2 wrapper for the Talent Transfer Portal course.
   Included only in the SCORM package build (tools/build-scorm.py).
   Reports: incomplete on launch, completed on reaching the final page,
   and the recap quiz score (as a percentage) when the learner finishes it.
   Outside an LMS it finds no API and stays silent.
   ===================================================================== */
(function () {
  'use strict';

  function findAPI(win) {
    var hops = 0;
    while (win && hops < 10) {
      try { if (win.API) return win.API; } catch (e) { break; }
      if (win.parent && win.parent !== win) { win = win.parent; }
      else { break; }
      hops++;
    }
    try { if (window.opener && window.opener.API) return window.opener.API; } catch (e) {}
    return null;
  }

  var API = findAPI(window);
  if (!API) return; // running outside an LMS: plain website behavior

  if (String(API.LMSInitialize('')) === 'false') return;

  var status = String(API.LMSGetValue('cmi.core.lesson_status') || '');
  var done = status === 'completed' || status === 'passed';
  if (!done) {
    API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
    API.LMSCommit('');
  }

  function complete() {
    if (done) return;
    done = true;
    API.LMSSetValue('cmi.core.lesson_status', 'completed');
    API.LMSCommit('');
  }

  // score: the recap result panel unhides with "X / Y" when the quiz ends
  var res = document.getElementById('recapResult');
  if (res && 'MutationObserver' in window) {
    new MutationObserver(function () {
      if (res.hidden) return;
      var m = (res.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      var raw = parseInt(m[1], 10), max = parseInt(m[2], 10);
      if (!max) return;
      API.LMSSetValue('cmi.core.score.min', '0');
      API.LMSSetValue('cmi.core.score.max', '100');
      API.LMSSetValue('cmi.core.score.raw', String(Math.round((raw / max) * 100)));
      API.LMSCommit('');
    }).observe(res, { attributes: true, attributeFilter: ['hidden'] });
  }

  // completion: the learner reaches the closing page
  var slides = document.querySelectorAll('.slide');
  var last = slides[slides.length - 1];
  if (last && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) complete(); });
    }, { threshold: 0.5 }).observe(last);
  }

  // session time + clean finish
  var t0 = Date.now();
  var finished = false;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function finish() {
    if (finished) return;
    finished = true;
    try {
      var s = Math.floor((Date.now() - t0) / 1000);
      API.LMSSetValue('cmi.core.session_time',
        pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60));
      API.LMSCommit('');
      API.LMSFinish('');
    } catch (e) {}
  }
  window.addEventListener('pagehide', finish);
  window.addEventListener('beforeunload', finish);
})();
