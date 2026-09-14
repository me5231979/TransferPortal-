/* Narration for the classroom, self-paced, and SCORM editions.
   Bottom-bar controls: LISTEN plays or pauses the current page, AUTO
   reads every page as it turns (default on). Pausing never loses your
   place: positions are kept per page and saved to the browser, so
   toggling off to take notes and back on resumes where you stopped.
   Tracks live at assets/audio/narr-<slide id>.mp3; pages with no track
   are skipped silently, so the deck works before generation runs. */
(function () {
  'use strict';
  if (!document.querySelector || !window.Audio) return;

  var script = document.currentScript || document.querySelector('script[src*="narration.js"]');
  var AUDIO_BASE = 'assets/audio/';
  if (script && script.src) AUDIO_BASE = script.src.replace(/js\/narration\.js.*$/, 'audio/');

  var bar = document.querySelector('.bottombar');
  var slides = Array.prototype.slice.call(document.querySelectorAll('section.slide[id]'));
  if (!bar || !slides.length) return;

  var css = document.createElement('style');
  css.textContent =
    '.bottombar__left{display:flex;align-items:center;gap:.9rem;min-width:0}.narrbar{display:flex;align-items:center;gap:.5rem}' +
    '.narrbar button{display:inline-flex;align-items:center;gap:.45rem;height:34px;padding:0 .85rem;' +
    'border:1px solid rgba(255,255,255,.28);border-radius:5px;background:transparent;color:#fff;cursor:pointer;' +
    'font-family:var(--font-condensed,Antonio,Impact,sans-serif);font-weight:700;font-size:.72rem;letter-spacing:.09em;text-transform:uppercase}' +
    '.narrbar button:hover{border-color:var(--vu-gold-flat,#CFAE70);background:rgba(207,174,112,.12)}' +
    '.narrbar button svg{width:14px;height:14px;fill:currentColor}' +
    '.narrbar .narr-auto.is-on{background:var(--vu-gold-flat,#CFAE70);border-color:var(--vu-gold-flat,#CFAE70);color:#1C1C1C}' +
    '@media (max-width:900px){.narrbar{margin-left:.5rem}.narrbar button span{display:none}.narrbar button{padding:0 .6rem}}';
  document.head.appendChild(css);

  var SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  var LINES = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></svg>';

  var listenBtn = document.createElement('button');
  listenBtn.type = 'button';
  listenBtn.className = 'narr-listen';
  listenBtn.setAttribute('aria-label', 'Play or pause the narration for this page');

  var autoBtn = document.createElement('button');
  autoBtn.type = 'button';
  autoBtn.className = 'narr-auto';
  autoBtn.innerHTML = LINES + '<span>Auto</span>';
  autoBtn.setAttribute('aria-label', 'Read every page aloud as it turns');

  var group = document.createElement('div');
  group.className = 'narrbar';
  group.appendChild(listenBtn);
  group.appendChild(autoBtn);
  /* keep the controls tight against the title on the left: wrap both in
     one flex child so the bar's space-between cannot spread them apart */
  var title = bar.querySelector('.bottombar__title');
  if (title) {
    var left = document.createElement('div');
    left.className = 'bottombar__left';
    bar.insertBefore(left, title);
    left.appendChild(title);
    left.appendChild(group);
  } else {
    bar.appendChild(group);
  }

  var auto = true;
  try { auto = localStorage.getItem('narrAuto') !== '0'; } catch (e) {}
  function paintAuto() {
    autoBtn.classList.toggle('is-on', auto);
    autoBtn.setAttribute('aria-pressed', auto ? 'true' : 'false');
  }
  paintAuto();

  /* remembered positions, per slide, survive a reload */
  var pos = {};
  try { pos = JSON.parse(localStorage.getItem('narrPos') || '{}') || {}; } catch (e) { pos = {}; }
  var saveTimer = null;
  function savePos() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem('narrPos', JSON.stringify(pos)); } catch (e) {}
    }, 400);
  }

  var tracks = {};
  slides.forEach(function (s) {
    var a = new Audio(AUDIO_BASE + 'narr-' + s.id + '.mp3');
    a.preload = 'none';
    var resumed = false;
    a.addEventListener('loadedmetadata', function () {
      if (resumed) return;
      resumed = true;
      var p = pos[s.id];
      if (p && p > 0.5 && p < a.duration - 1) { try { a.currentTime = p; } catch (e) {} }
    });
    a.addEventListener('timeupdate', function () {
      pos[s.id] = a.ended ? 0 : a.currentTime;
      savePos();
    });
    a.addEventListener('pause', function () { paintListen(); savePos(); });
    a.addEventListener('play', function () { paintListen(); });
    a.addEventListener('ended', function () { pos[s.id] = 0; savePos(); paintListen(); });
    a.addEventListener('error', function () { tracks[s.id] = null; paintListen(); });
    tracks[s.id] = a;
  });

  var currentId = slides[0].id;
  var primed = false;   /* browsers allow sound only after a user gesture */

  function currentTrack() { return tracks[currentId]; }
  function paintListen() {
    var a = currentTrack();
    if (!a) { listenBtn.hidden = true; return; }
    listenBtn.hidden = false;
    var playing = !a.paused && !a.ended;
    listenBtn.innerHTML = (playing ? PAUSE : SPEAKER) + '<span>' + (playing ? 'Pause' : 'Listen') + '</span>';
  }
  function pauseAll() {
    slides.forEach(function (s) {
      var a = tracks[s.id];
      if (a && !a.paused) a.pause();   /* pause, never rewind */
    });
  }
  function resumeCurrent() {
    var a = currentTrack();
    if (!a) return;
    pauseAll();
    if (a.ended) { try { a.currentTime = 0; } catch (e) {} }
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  listenBtn.addEventListener('click', function () {
    primed = true;
    var a = currentTrack();
    if (!a) return;
    if (a.paused || a.ended) resumeCurrent();
    else a.pause();
  });
  autoBtn.addEventListener('click', function () {
    auto = !auto;
    primed = true;
    try { localStorage.setItem('narrAuto', auto ? '1' : '0'); } catch (e) {}
    paintAuto();
    if (auto) resumeCurrent(); else pauseAll();
  });

  function prime() {
    if (primed) return;
    primed = true;
    if (auto) resumeCurrent();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, prime, { once: true, capture: true });
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.id === currentId) return;
        currentId = e.target.id;
        pauseAll();
        paintListen();
        if (auto && primed) resumeCurrent();
      });
    }, { threshold: 0.6 });
    slides.forEach(function (s) { io.observe(s); });
  }

  paintListen();
})();
