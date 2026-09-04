/* =====================================================================
   THE TRANSFER PORTAL, classroom deck
   interactions (vanilla JS, no dependencies)
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Nav: scroll state, mobile toggle, active link ---------- */
  var nav = $('.nav');
  var toggle = $('.nav__toggle');
  var links = $('.nav__links');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revEls.forEach(function (el) { revObs.observe(el); });
    // elements already on screen at load can sit inside the observer's
    // excluded margin, so reveal them directly
    requestAnimationFrame(function () {
      revEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.left < window.innerWidth && r.right > 0) {
          el.classList.add('in'); revObs.unobserve(el);
        }
      });
    });
  } else {
    revEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Manifesto word-by-word reveal ---------- */
  $$('.manifesto p').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var wObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var ws = $$('.w', e.target);
        ws.forEach(function (w, i) { setTimeout(function () { w.classList.add('lit'); }, i * 55); });
        wObs.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    $$('.manifesto').forEach(function (m) { wObs.observe(m); });
  }

  /* ---------- Welcome slide: QR code ---------- */
  var qrBox = $('#qrBox');
  if (qrBox && typeof qrcode === 'function') {
    // Encodes the deployed URL. Override by setting data-url on #qrCard.
    var qrCard = $('#qrCard');
    var qrTarget = (qrCard && qrCard.getAttribute('data-url')) ||
      (location.protocol === 'file:' ? '' : location.origin + location.pathname);
    var qrUrlEl = $('#qrUrl');
    if (qrTarget) {
      try {
        var qr = qrcode(0, 'M');
        qr.addData(qrTarget);
        qr.make();
        qrBox.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
        if (qrUrlEl) qrUrlEl.textContent = qrTarget.replace(/^https?:\/\//, '').replace(/\/$/, '');
      } catch (err) {
        qrBox.parentElement.style.display = 'none';
      }
    } else {
      if (qrUrlEl) qrUrlEl.textContent = 'QR appears when the site is hosted';
      qrBox.innerHTML = '<div style="width:100%;aspect-ratio:1;display:grid;place-items:center;border:1px dashed #E4E4E4;color:#777;font-family:Inter,Arial,sans-serif;font-size:.8rem;padding:1rem;text-align:center">Deploy to generate the QR code</div>';
    }
  }

  /* ---------- Hero video: crossfading half-speed montage ---------- */
  var heroVideo = $('#heroVideo');
  if (heroVideo) {
    if (reduce) {
      heroVideo.remove(); heroVideo = null;
    } else {
      var playlist = [];
      try { playlist = JSON.parse(heroVideo.getAttribute('data-playlist') || '[]'); } catch (e) {}
      // resolve relative clip paths against the same prefix the build scripts
      // apply to asset URLs (the nav lockup src carries it: '' or '../')
      var lockup = $('.nav__lockup');
      var vprefix = '';
      if (lockup) {
        vprefix = (lockup.getAttribute('src') || '').replace('assets/img/vu-lockup-white.png', '');
      }
      playlist = playlist.map(function (u) {
        return /^https?:/.test(u) ? u : vprefix + u;
      });
      if (!playlist.length) {
        heroVideo.remove(); heroVideo = null;
      } else {
        var RATE = 0.5;   // each clip runs at half speed
        var FADE_S = 1.5; // crossfade length in wall-clock seconds (matches the CSS transition)
        var twin = heroVideo.cloneNode(false);
        twin.removeAttribute('id');
        twin.removeAttribute('data-playlist');
        twin.muted = true;
        heroVideo.parentNode.insertBefore(twin, heroVideo.nextSibling);
        var vids = [heroVideo, twin];
        var active = 0, clip = 0, failures = 0, switching = false, dead = false;
        var killMontage = function () {
          dead = true;
          vids.forEach(function (v) { if (v.parentNode) v.parentNode.removeChild(v); });
        };
        var startOn = function (slot, idx) {
          if (dead) return;
          clip = ((idx % playlist.length) + playlist.length) % playlist.length;
          var v = vids[slot];
          v.src = playlist[clip];
          v.playbackRate = RATE;
          var p = v.play && v.play();
          if (p && p.catch) p.catch(function () { /* autoplay blocked; canvas remains */ });
          active = slot;
          switching = false;
          // toggling .on drives the CSS opacity transition: new clip fades in
          // over the old one, which keeps playing underneath until paused
          vids.forEach(function (x, i) { x.classList.toggle('on', i === slot); });
        };
        vids.forEach(function (v, slot) {
          v.addEventListener('loadedmetadata', function () { v.playbackRate = RATE; });
          v.addEventListener('timeupdate', function () {
            if (dead || slot !== active || switching || !v.duration) return;
            // start the crossfade FADE_S wall-clock seconds before the clip ends
            if (v.duration - v.currentTime <= FADE_S * RATE) {
              switching = true;
              failures = 0;
              startOn(1 - slot, clip + 1);
              setTimeout(function () { if (!dead) v.pause(); }, FADE_S * 1000 + 150);
            }
          });
          v.addEventListener('ended', function () {
            if (!dead && slot === active && !switching) { switching = true; startOn(1 - slot, clip + 1); }
          });
          v.addEventListener('error', function () {
            failures++;
            if (failures >= playlist.length * 2) { killMontage(); }
            else if (slot === active && !dead) { startOn(1 - slot, clip + 1); }
          });
        });
        startOn(0, 0);
      }
    }
  }

  /* ---------- Hero ambient particles ---------- */
  var canvas = $('.hero__canvas');
  if (canvas && !reduce && !isTouch) {
    var ctx = canvas.getContext('2d');
    var W, H, parts = [];
    var size = function () {
      W = canvas.width = canvas.offsetWidth * (window.devicePixelRatio > 1 ? 2 : 1);
      H = canvas.height = canvas.offsetHeight * (window.devicePixelRatio > 1 ? 2 : 1);
    };
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 46; i++) {
      parts.push({ x: Math.random() * 1, y: Math.random() * 1, r: Math.random() * 1.6 + 0.4,
        vy: (Math.random() * 0.00018 + 0.00006), vx: (Math.random() - 0.5) * 0.00008,
        a: Math.random() * 0.5 + 0.2 });
    }
    (function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy; p.x += p.vx;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r * (window.devicePixelRatio > 1 ? 2 : 1), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(207,174,112,' + p.a + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  } else if (canvas) { canvas.style.display = 'none'; }

  /* ---------- INTERACTIVE: knowledge check quizzes ---------- */
  $$('[data-quiz]').forEach(function (root) {
    $$('.quiz__options', root).forEach(function (group) {
      var answered = false;
      var fb = group.parentElement.querySelector('.quiz__feedback');
      $$('.opt', group).forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (answered) return; answered = true;
          var correct = opt.getAttribute('data-correct') === '1';
          $$('.opt', group).forEach(function (o) {
            o.setAttribute('disabled', 'true');
            if (o.getAttribute('data-correct') === '1') o.classList.add('correct');
          });
          if (!correct) opt.classList.add('wrong');
          if (fb) {
            fb.classList.add('show');
            fb.textContent = (correct ? '✓ Correct. ' : '✗ Not quite. ') + (opt.getAttribute('data-why') || '');
            fb.style.color = correct ? 'var(--vu-oak)' : '#c76b5a';
          }
        });
      });
    });
  });

  /* ---------- Generic scenario trainer (used five times) ---------- */
  function makeTrainer(cfg) {
    var root = $(cfg.root);
    if (!root) return;
    var idx = 0, score = 0, locked = false;
    var qEl = $(cfg.q), optEl = $(cfg.options), fbEl = $(cfg.feedback),
        progEl = $(cfg.progress), nextBtn = $(cfg.next), resEl = $(cfg.result);
    var navEl = $(cfg.root + ' .quiz__nav');
    function render() {
      locked = false;
      var S = cfg.items[idx];
      progEl.textContent = cfg.progressWord + ' ' + (idx + 1) + ' of ' + cfg.items.length;
      qEl.textContent = S.q;
      fbEl.textContent = '';
      nextBtn.style.visibility = 'hidden';
      nextBtn.textContent = idx === cfg.items.length - 1 ? 'See result' : nextBtn.textContent;
      optEl.innerHTML = '';
      var labels = S.opts || cfg.labels;
      labels.forEach(function (label, i) {
        var b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = '<span class="mark">' + String.fromCharCode(65 + i) + '</span><span>' + label + '</span>';
        b.addEventListener('click', function () {
          if (locked) return; locked = true;
          var right = i === S.answer;
          if (right) score++;
          $$('.opt', optEl).forEach(function (o, oi) {
            o.setAttribute('disabled', 'true');
            if (oi === S.answer) o.classList.add('correct');
          });
          if (!right) b.classList.add('wrong');
          fbEl.textContent = (right ? '✓ ' : '✗ ') + S.why;
          fbEl.style.color = right ? cfg.goodColor : '#c76b5a';
          nextBtn.style.visibility = 'visible';
        });
        optEl.appendChild(b);
      });
    }
    nextBtn.addEventListener('click', function () {
      idx++;
      if (idx >= cfg.items.length) {
        navEl.style.display = 'none';
        qEl.textContent = ''; optEl.innerHTML = ''; progEl.textContent = ''; fbEl.textContent = '';
        resEl.hidden = false;
        resEl.innerHTML = '<div class="quiz__score gold-text">' + score + ' / ' + cfg.items.length + '</div>' +
          '<p style="margin-top:.75rem;color:' + cfg.resultColor + '">' +
          (score >= cfg.passAt ? cfg.passMsg : cfg.failMsg) +
          '</p><button class="btn btn--ghost" data-retry style="margin-top:1rem">Run it again</button>';
        $('[data-retry]', resEl).addEventListener('click', function () {
          idx = 0; score = 0; resEl.hidden = true;
          navEl.style.display = '';
          render();
        });
      } else render();
    });
    render();
  }

  /* Fact or fiction (Section 01) */
  makeTrainer({
    root: '#portalFact', q: '#pfQ', options: '#pfOptions', feedback: '#pfFeedback',
    progress: '#pfProgress', next: '#pfNext', result: '#pfResult',
    progressWord: 'Claim', goodColor: 'var(--vu-oak)',
    resultColor: 'var(--ink-soft, #555)', passAt: 4,
    passMsg: 'You know what the portal actually does, which puts you ahead of most of the folklore about it.',
    failMsg: 'Close. The pattern in every answer: the portal is private by default, competitive by design, and it acts only when you ask it to.',
    labels: ['Fact', 'Fiction'],
    items: [
      { q: '"The moment you declare a Career of Interest, your manager gets a notification."',
        answer: 1, why: 'Fiction, and this is the core promise: showing interest alerts no one. You decide when to tell.' },
      { q: '"Eligible open roles post internally for five business days before they can post externally."',
        answer: 0, why: 'Fact. That head start is the staff advantage: you see openings before the outside world does.' },
      { q: '"A Gig is basically a trial run; do well and the permanent transfer follows."',
        answer: 1, why: 'Fiction. A Gig is a short project that builds skills and relationships. A real move still goes through an open job posting.' },
      { q: '"Advisory support starts only when you request it, and nothing you share triggers action without your consent."',
        answer: 0, why: 'Fact. You start the advisor conversation, and it stays advice. Nobody gets moved by surprise.' },
      { q: '"Applying internally means the job is basically yours; internal candidates are guaranteed the role."',
        answer: 1, why: 'Fiction. The window gives you the first look, and the interview is still yours to win. Applying from inside never means the job is yours.' }
    ]
  });

  /* Pick the entrance (Section 02) */
  makeTrainer({
    root: '#entrancePick', q: '#epQ', options: '#epOptions', feedback: '#epFeedback',
    progress: '#epProgress', next: '#epNext', result: '#epResult',
    progressWord: 'Colleague', goodColor: 'var(--vu-gold-flat)',
    resultColor: 'rgba(255,255,255,.85)', passAt: 4,
    passMsg: 'You can route real situations to the right door, including your own.',
    failMsg: 'Close. The tells: curiosity with no urgency is A. Plateaued excellence is B. Hidden skills are C. A reorg is D. Risk is E. A specific posting is F.',
    labels: ['A · Explorer', 'B · New challenge', 'C · Unused skills', 'D · Post-reorg', 'E · At risk', 'F · Direct applicant'],
    items: [
      { q: 'Fifteen years in, excellent reviews, and lately the work runs on autopilot. They love their team and have no wish to abandon it; they just miss being stretched.',
        answer: 1, why: 'Entrance B. A Gig gives them a stretch project in another unit while they keep their home role, and Careers of Interest starts mapping what could come next.' },
      { q: 'Hired as a financial analyst, they have quietly become the unit\'s data visualization expert, and the current role has no room for that work.',
        answer: 2, why: 'Entrance C. Tag the real skills at their true level; the portal then shows roles and Gigs that need them.' },
      { q: 'Their division just merged with another. New manager, new mission, and half their duties moved to a different team in the space of a month.',
        answer: 3, why: 'Entrance D. An advisor conversation helps them figure out what they want next; then they apply to roles that fit. The talk is theirs to start.' },
      { q: 'They keep wondering what else exists at Vanderbilt, and they would be mortified if anyone concluded they were leaving.',
        answer: 0, why: 'Entrance A. Careers of Interest plus a skills profile, browsed privately. Their manager is not alerted; the wondering gets a safe outlet.' },
      { q: 'A posting just went up in another school that matches their skills exactly, and they are ready today.',
        answer: 5, why: 'Entrance F. Straight to the posting during the staff-first window: apply, interview, and if chosen, move with a planned handoff.' }
    ]
  });

  /* Call the next move (Section 03) */
  makeTrainer({
    root: '#nextMove', q: '#nmQ', options: '#nmOptions', feedback: '#nmFeedback',
    progress: '#nmProgress', next: '#nmNext', result: '#nmResult',
    progressWord: 'Moment', goodColor: 'var(--vu-oak)',
    resultColor: 'var(--ink-soft, #555)', passAt: 4,
    passMsg: 'You can see every step before it happens, which is exactly what makes the process trustworthy.',
    failMsg: 'Close. The through-line: private until you act, competitive when you do, and coordinated when you win.',
    labels: [],
    items: [
      { q: 'You just tagged your skills and declared two Careers of Interest. What appears on your manager\'s screen?',
        opts: ['Nothing; your interest is private and only counted in group totals', 'An alert that day', 'A meeting request from HR'],
        answer: 0, why: 'Nothing. Your interest and profile stay private, reaching People, Culture and Belonging only as group totals. You choose when to tell.' },
      { q: 'You finish a Gig in another unit and loved every minute. What did the Gig earn you?',
        opts: ['A permanent transfer to that team within the year', 'First refusal on their next opening', 'The growth itself: skills, relationships, and proof, with any move still going through an open job posting'],
        answer: 2, why: 'The Gig is the growth. What you carry out of it, new skills, a network, and proof you can do the work, makes you a stronger candidate when a real job posts.' },
      { q: 'A role you want just posted internally. When can external candidates enter the race?',
        opts: ['Immediately, alongside you', 'After the five-business-day staff-first window', 'Whenever the hiring manager chooses'],
        answer: 1, why: 'Five business days. That window is the staff advantage: Vanderbilt candidates get the first look, then everyone goes through the same fair interview process.' },
      { q: 'You interviewed and got the role. What happens between the offer and your first day?',
        opts: ['You start Monday and your old team improvises', 'HR and both managers coordinate a planned handoff, typically two to four weeks', 'You split time between both jobs for a quarter'],
        answer: 1, why: 'A planned, respectful handoff, usually two to four weeks. The manager you leave is a partner in the plan, never a roadblock.' },
      { q: 'You have moved. What happens to the role you left behind?',
        opts: ['It posts to the same portal, giving your old team the same first look you just used', 'It is absorbed and disappears', 'It goes straight to outside posting to speed things up'],
        answer: 0, why: 'Your old job posts to staff first, so one move becomes the next person\'s opportunity.' }
    ]
  });

  /* Judge the response (Section 04) */
  makeTrainer({
    root: '#managerCall', q: '#mcQ', options: '#mcOptions', feedback: '#mcFeedback',
    progress: '#mcProgress', next: '#mcNext', result: '#mcResult',
    progressWord: 'Response', goodColor: 'var(--vu-gold-flat)',
    resultColor: 'rgba(255,255,255,.85)', passAt: 4,
    passMsg: 'You can hear the difference between developing talent and defending territory. That ear is the culture shift.',
    failMsg: 'Close. The tells: the good response thanks first and coaches forward. Hoarding guilts or stalls. A guardrail breaks the moment anyone blocks, punishes, or spies.',
    labels: ['Builds the culture', 'Talent hoarding', 'Crosses a guardrail'],
    items: [
      { q: '"Thank you for telling me. What drew you to it? And whatever happens, let\'s make sure the next step in your development here is real."',
        answer: 0, why: 'The model response: thanks first, curiosity second, growth either way. This is the minute the program depends on.' },
      { q: '"After everything I\'ve invested in you? I have to say, the timing feels a little disloyal."',
        answer: 1, why: 'The guilt trip is textbook hoarding: it stops people from applying inside and pushes them to other employers instead.' },
      { q: '"I hear you. Honestly though, you\'re too critical to this project right now. Let\'s revisit after the fiscal year, and maybe the one after."',
        answer: 1, why: 'Softer voice, same hoard. "Not now" without a date is "no" wearing a calendar.' },
      { q: '"Understood. I\'ll ask HR to hold your application until we\'ve delivered Q3; I\'m sure they can pause these things."',
        answer: 2, why: 'Blocking or delaying an application is the program\'s brightest line, and asking HR for a workaround is itself the violation.' },
      { q: '"Noted. I\'ll remember this at review time; commitment to this team matters to me."',
        answer: 2, why: 'A rating threat is retaliation, full stop. One sentence like this teaches a whole unit to move secretly or leave.' }
    ]
  });

  /* ---------- INTERACTIVE: First Move Card capstone ---------- */
  var planEl = $('#movePlan');
  if (planEl) {
    var pick = { practice: null, not: null, when: null };
    var whoIn = $('#planWho'), buildBtn = $('#planBuild'), statusEl2 = $('#planStatus'), outEl2 = $('#planOut');
    function planReady() {
      var missing = [];
      if (whoIn.value.trim().length < 3) missing.push('your direction (1)');
      if (!pick.practice) missing.push('a first move (2)');
      if (!pick.not) missing.push('a NOT (3)');
      if (!pick.when) missing.push('a date (4)');
      var ok = missing.length === 0;
      buildBtn.disabled = !ok;
      statusEl2.textContent = ok ? 'Ready, build it' : 'Still needed: ' + missing.join(', ');
      return ok;
    }
    whoIn.addEventListener('input', planReady);
    [['#planPractice', 'practice', 'data-practice'], ['#planNot', 'not', 'data-not'], ['#planWhen', 'when', 'data-when']].forEach(function (cfg) {
      var group = $(cfg[0]);
      $$('.opt', group).forEach(function (b) {
        b.addEventListener('click', function () {
          pick[cfg[1]] = b.getAttribute(cfg[2]);
          $$('.opt', group).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          outEl2.hidden = true;
          planReady();
        });
      });
    });
    var PRACTICE = {
      explore: { name: 'Profile and interests', move: 'Open the Talent Transfer Portal, tag your skills at their honest levels, and declare at least one Career of Interest. Private to you; the suggestions start from there.' },
      gig: { name: 'The Gig warm-up', move: 'Set one Grow goal around a stretch skill now, so the day Gigs launch you can search the postings and save the one that fits it.' },
      req: { name: 'The requisition search', move: 'Search open internal requisitions in your target area, save the closest match, and read its requirements against your profile. Gaps become Grow goals.' },
      advisory: { name: 'The advisory conversation', move: 'Request an employee-consultant conversation and bring one honest question about your direction. It stays confidential, and nothing happens without your consent.' },
      coach: { name: 'The manager conversation', move: 'Hold the "what\'s next for you at Vanderbilt" conversation with one team member this week, before any requisition holds it for you. Thank first, coach forward.' }
    };
    var NOT = {
      drift: 'Waiting to be discovered. Counter-move: the portal only matches what you put in it, so the profile update happens before anything else.',
      inflate: 'Inflating skill ratings. Counter-move: tag the level a hiring manager would verify in an interview; credibility compounds, padding gets found out.',
      stall: 'Putting the career conversation off again. Counter-move: the calendar invite goes out the moment you finish this card.',
      hoard: 'Guilting or slow-walking a team member\'s move. Counter-move: the response is "thank you for telling me," and the release goes on your leadership record as the win it is.'
    };
    var WHEN = { tomorrow: 'tomorrow', threedays: 'within the next 3 days', week: 'within 7 days' };
    buildBtn.addEventListener('click', function () {
      if (!planReady()) return;
      var who = whoIn.value.trim();
      var p = PRACTICE[pick.practice];
      var rows = '' +
        '<div class="row"><b>My direction</b><span>' + who.replace(/</g, '&lt;') + '</span></div>' +
        '<div class="row"><b>My first move</b><span>' + p.name + '. ' + p.move + '</span></div>' +
        '<div class="row"><b>What I will NOT do</b><span>' + NOT[pick.not] + '</span></div>' +
        '<div class="row"><b>The date</b><span>' + WHEN[pick.when].charAt(0).toUpperCase() + WHEN[pick.when].slice(1) + ', in the actual portal, before the week gets loud.</span></div>' +
        '<div class="row"><b>The evidence</b><span>Afterward, write one line about what you found. That line decides your second move.</span></div>' +
        '<div class="row"><b>The disclosure note</b><span>You owe nobody an announcement for exploring. Once you\'re a serious candidate for something, have the professional conversation with your manager on your terms.</span></div>';
      outEl2.innerHTML = '<span class="tag">My first move card</span>' +
        '<div class="plan__out-grid">' + rows + '</div>' +
        '<div class="lab__runrow" style="margin-top:1.25rem">' +
        '<button class="btn" id="planCopy">Copy my card</button>' +
        '<span class="quiz__progress" id="planCopied" style="color:rgba(255,255,255,.6)">Put the move on your calendar now</span></div>';
      outEl2.hidden = false;
      $('#planCopy').addEventListener('click', function () {
        var text = 'MY FIRST MOVE CARD (The Talent Transfer Portal, Vanderbilt)\n' +
          'Direction: ' + who + '\n' +
          'First move: ' + p.name + '. ' + p.move + '\n' +
          'I will NOT: ' + NOT[pick.not] + '\n' +
          'Date: ' + WHEN[pick.when] + '.\n' +
          'Evidence: one line afterward on what I found.\n' +
          'Disclosure: professional conversation with my manager once I\'m a serious candidate.';
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
          $('#planCopied').textContent = 'Copied. Paste it somewhere you\'ll see before the date.';
        }, function () {
          $('#planCopied').textContent = 'Select the card text above and copy it manually.';
        });
      });
      outEl2.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    });
  }

  /* ---------- INTERACTIVE: scored recap quiz ---------- */
  var recap = $('#recap');
  if (recap) {
    var QUESTIONS = [
      { q: 'The Talent Transfer Portal is best described as…',
        opts: ['A guaranteed promotion track for long-time staff', 'A fair internal job market that you own, private by default', 'A tool HR uses to reassign people', 'A public list of who wants to leave their team'],
        correct: 1, why: 'A job market you own: private by default, fair by design, with help that starts only when you ask.' },
      { q: 'You declare a Career of Interest on Tuesday. Your manager…',
        opts: ['Gets an alert Tuesday', 'Sees it at your next review', 'Is not alerted; you choose if and when to tell', 'Is told only if HR flags you as a risk to leave'],
        correct: 2, why: 'Silent by default. Interest is only counted in group totals, and you tell your manager on your timing, once you\'re a serious candidate.' },
      { q: 'A Gig is…',
        opts: ['A trial period that turns into a transfer if you do well', 'A short stretch project with a set scope and end date that builds your skills', 'A required rotation HR assigns', 'A second job with extra pay'],
        correct: 1, why: 'Growth, on purpose: real work in another unit, with your home role kept. Any real move still goes through an open job posting.' },
      { q: 'The five-business-day staff-first window means…',
        opts: ['Vanderbilt staff get a five-business-day head start before roles post to the public', 'Roles stay internal-only forever', 'You have five business days to accept any offer', 'Managers get five business days to counter-offer'],
        correct: 0, why: 'Staff see openings first. After the window, inside and outside candidates go through the same fair interview process.' },
      { q: 'The talent hoarding research (Haegele, American Economic Review, 2024) found…',
        opts: ['Hoarding is rare, about one manager in ten', 'About 75% of managers admit to hoarding, and it stops people from applying inside', 'Hoarding mostly helps keep teams stable', 'Only bad managers hoard'],
        correct: 1, why: 'About three out of four, driven by ordinary pressures, and it clearly stops inside applications. That is why the culture work is built in, never left to chance.' },
      { q: 'A team member tells you they\'ve applied for an internal role. The culture-building response starts with…',
        opts: ['"After everything I\'ve invested in you?"', '"Let\'s talk about your timing."', '"Thank you for telling me," then helping them compete well and planning their development either way', 'Calling HR to understand your options'],
        correct: 2, why: 'Thank first, coach forward. That response builds a career at Vanderbilt; the others build a resume for somewhere else.' }
    ];
    var idx = 0, score = 0, locked = false;
    var qEl = $('#recapQ'), optEl2 = $('#recapOptions'), fbEl = $('#recapFeedback'),
        progEl = $('#recapProgress'), nextBtn = $('#recapNext'), panelEl = $('#recapPanel'), resultEl = $('#recapResult');
    function render() {
      locked = false;
      var Q = QUESTIONS[idx];
      qEl.textContent = Q.q;
      progEl.textContent = 'Question ' + (idx + 1) + ' of ' + QUESTIONS.length;
      fbEl.textContent = ''; fbEl.classList.remove('show');
      nextBtn.style.visibility = 'hidden';
      nextBtn.textContent = idx === QUESTIONS.length - 1 ? 'See score' : 'Next question';
      optEl2.innerHTML = '';
      Q.opts.forEach(function (text, i) {
        var b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = '<span class="mark">' + String.fromCharCode(65 + i) + '</span><span>' + text + '</span>';
        b.addEventListener('click', function () {
          if (locked) return; locked = true;
          var right = i === Q.correct;
          if (right) score++;
          $$('.opt', optEl2).forEach(function (o, oi) {
            o.setAttribute('disabled', 'true');
            if (oi === Q.correct) o.classList.add('correct');
          });
          if (!right) b.classList.add('wrong');
          fbEl.classList.add('show');
          fbEl.textContent = (right ? '✓ Correct. ' : '✗ ') + Q.why;
          fbEl.style.color = right ? 'var(--vu-oak)' : '#c76b5a';
          nextBtn.style.visibility = 'visible';
        });
        optEl2.appendChild(b);
      });
    }
    nextBtn.addEventListener('click', function () {
      idx++;
      if (idx >= QUESTIONS.length) { showResult(); }
      else render();
    });
    function showResult() {
      panelEl.hidden = true;
      resultEl.hidden = false;
      var pct = Math.round((score / QUESTIONS.length) * 100);
      var msg = pct >= 80 ? 'The concepts are loaded. The first move on your card is where they become real.' :
                pct >= 50 ? 'Solid. Revisit the sections you missed before your first move.' :
                            'Worth another pass through the deck before the capstone.';
      resultEl.innerHTML = '<span class="eyebrow">Your result</span>' +
        '<div class="quiz__score gold-text">' + score + ' / ' + QUESTIONS.length + '</div>' +
        '<p class="lead" style="margin-top:1rem">' + msg + '</p>' +
        '<button class="btn btn--dark" id="recapRetry" style="margin-top:1.5rem">Try again</button>';
      $('#recapRetry').addEventListener('click', function () {
        idx = 0; score = 0; resultEl.hidden = true; panelEl.hidden = false; render();
      });
    }
    render();
  }

  /* ---------- INTERACTIVE: glossary flip ---------- */
  $$('.flip').forEach(function (card) {
    card.addEventListener('click', function () { card.classList.toggle('flipped'); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); }
    });
  });

  /* ---------- Deck navigation: dots, arrows, keyboard, progress ---------- */
  var slides = $$('.slide');
  var dotWrap = $('#dots');
  var bar = $('#progressBar');
  var counter = $('#deckCount');
  var current = 0;

  if (dotWrap) {
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      var label = s.getAttribute('data-title') || ('Section ' + (i + 1));
      b.setAttribute('aria-label', 'Go to: ' + label);
      b.addEventListener('click', function () { goTo(i); });
      dotWrap.appendChild(b);
    });
  }
  var dots = dotWrap ? $$('button', dotWrap) : [];

  function goTo(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
  }
  var barTitle = $('#barTitle');
  function setActive(i) {
    current = i;
    dots.forEach(function (d, di) { d.setAttribute('aria-current', String(di === i)); });
    if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
    if (barTitle) barTitle.textContent = slides[i].getAttribute('data-title') || '';
    if (typeof checkHint === 'function') checkHint();
    $$('.nav__links a').forEach(function (a) {
      var href = a.getAttribute('href');
      a.setAttribute('aria-current', String(href === '#' + slides[i].id));
    });
  }
  if ('IntersectionObserver' in window) {
    var sObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { setActive(slides.indexOf(e.target)); }
      });
    }, { threshold: 0.5 });
    slides.forEach(function (s) { sObs.observe(s); });
  }
  setActive(0);

  // progress bar follows the deck's horizontal position
  var deckEl = $('.deck');
  if (deckEl) {
    deckEl.addEventListener('scroll', function () {
      var w = deckEl.scrollWidth - deckEl.clientWidth;
      if (bar) bar.style.width = (w > 0 ? (deckEl.scrollLeft / w) * 100 : 0) + '%';
      nav.classList.toggle('scrolled', deckEl.scrollLeft > 40);
    }, { passive: true });
  }

  // "scroll for more" indicator
  var hint = $('#scrollHint');
  function checkHint() {
    if (!hint || !slides[current]) return;
    var s = slides[current];
    var need = s.scrollHeight - s.clientHeight > 56;
    var atEnd = s.scrollTop + s.clientHeight >= s.scrollHeight - 24;
    hint.classList.toggle('show', need && !atEnd);
  }
  if (hint) {
    hint.addEventListener('click', function () {
      var s = slides[current];
      s.scrollBy({ top: s.clientHeight * 0.7, behavior: reduce ? 'auto' : 'smooth' });
    });
    slides.forEach(function (s) { s.addEventListener('scroll', checkHint, { passive: true }); });
    window.addEventListener('resize', checkHint);
    setTimeout(checkHint, 400);
  }

  // in-page anchor links jump the horizontal deck
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      var slide = target.closest ? (target.closest('.slide') || target) : target;
      if (slides.indexOf(slide) > -1) {
        e.preventDefault();
        goTo(slides.indexOf(slide));
      } else if (id === 'top') {
        e.preventDefault();
        goTo(0);
      }
    });
  });

  // keyboard
  document.addEventListener('keydown', function (e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) > -1) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault(); goTo(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault(); goTo(current - 1);
    } else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
  });


  // wheel advances the deck only when a FRESH scroll gesture starts at the
  // slide's edge; momentum from scrolling inside the slide never advances.
  // A gesture is fresh after a 350ms pause in wheel events.
  var wheelLock = 0, lastWheel = 0, armedNext = false, armedPrev = false;
  window.addEventListener('wheel', function (e) {
    var s = slides[current];
    if (!s) return;
    var now = Date.now();
    var fresh = now - lastWheel > 350;
    lastWheel = now;
    if (now - wheelLock < 900) return;
    var atBottom = s.scrollTop + s.clientHeight >= s.scrollHeight - 4;
    var atTop = s.scrollTop <= 4;
    if (fresh) { armedNext = atBottom; armedPrev = atTop; }
    if (e.deltaY > 24 && atBottom && armedNext) {
      wheelLock = now; armedNext = false; armedPrev = false; goTo(current + 1);
    } else if (e.deltaY < -24 && atTop && armedPrev && current > 0) {
      wheelLock = now; armedNext = false; armedPrev = false; goTo(current - 1);
    }
  }, { passive: true });


  // every non-anchor link opens in a new tab
  $$('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.charAt(0) !== '#') {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  });

  // deck bar buttons
  var prevB = $('#deckPrev'), nextB = $('#deckNext');
  if (prevB) prevB.addEventListener('click', function () { goTo(current - 1); });
  if (nextB) nextB.addEventListener('click', function () { goTo(current + 1); });

  // year
  var yEl = $('#year'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---------- Entrance doors: one open at a time per group ---------- */
  $$('.doors').forEach(function (group) {
    $$('details.door', group).forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        $$('details.door[open]', group).forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });
})();
