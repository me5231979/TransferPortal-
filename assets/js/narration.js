/* Narration player for the self-paced and SCORM editions.
   Adds a Listen button to each slide that has a generated MP3 at
   assets/audio/narr-<slide id>.mp3. Buttons remove themselves if the
   audio is missing, so the edition works before generation runs. */
(function () {
  'use strict';
  if (!document.querySelector || !window.Audio) return;

  var css = document.createElement('style');
  css.textContent =
    '.narr-btn{position:absolute;right:1.25rem;bottom:4.75rem;z-index:6;display:inline-flex;align-items:center;gap:.45rem;' +
    'padding:.5rem .95rem;border-radius:999px;border:1px solid rgba(207,174,112,.75);background:rgba(28,28,28,.82);' +
    'color:#CFAE70;font:600 .78rem/1 Inter,Arial,sans-serif;letter-spacing:.04em;cursor:pointer}' +
    '.narr-btn:hover{background:#CFAE70;color:#1C1C1C}' +
    '.narr-btn svg{width:.85rem;height:.85rem;fill:currentColor}' +
    '.on-light .narr-btn{background:rgba(255,255,255,.9);color:#946E24;border-color:rgba(148,110,36,.5)}' +
    '.on-light .narr-btn:hover{background:#946E24;color:#fff}';
  document.head.appendChild(css);

  var script = document.currentScript || document.querySelector('script[src*="narration.js"]');
  var AUDIO_BASE = 'assets/audio/';
  if (script && script.src) AUDIO_BASE = script.src.replace(/js\/narration\.js.*$/, 'audio/');

  var PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l9 6-9 6z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z"/></svg>';
  var players = [];

  function pauseOthers(except) {
    players.forEach(function (p) { if (p !== except && !p.audio.paused) p.pause(); });
  }

  document.querySelectorAll('section.slide[id]').forEach(function (slide) {
    var audio = new Audio(AUDIO_BASE + 'narr-' + slide.id + '.mp3');
    audio.preload = 'none';
    var btn = document.createElement('button');
    btn.className = 'narr-btn';
    btn.type = 'button';
    btn.innerHTML = PLAY + '<span>Listen</span>';
    btn.setAttribute('aria-label', 'Play narration for this page');
    var dead = false;
    var player = {
      audio: audio,
      pause: function () { audio.pause(); btn.innerHTML = PLAY + '<span>Listen</span>'; }
    };
    function kill() { if (!dead) { dead = true; btn.remove(); } }
    audio.addEventListener('error', kill);
    audio.addEventListener('ended', function () { player.pause(); });
    btn.addEventListener('click', function () {
      if (audio.paused) {
        pauseOthers(player);
        var p = audio.play();
        if (p && p.catch) p.catch(kill);
        btn.innerHTML = PAUSE + '<span>Pause</span>';
      } else {
        player.pause();
      }
    });
    players.push(player);
    slide.appendChild(btn);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting && !audio.paused) player.pause();
        });
      }, { threshold: 0.3 }).observe(slide);
    }
  });
})();
