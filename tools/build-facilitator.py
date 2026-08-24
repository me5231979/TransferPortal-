#!/usr/bin/env python3
"""Generate the facilitator edition at facilitator/index.html.

Mirrors the learner site (index.html) and renders the runbook
(facilitator/notes.json) as a notes rail on the right of each slide.
Run after editing index.html or notes.json:

    python3 tools/build-facilitator.py
"""
import json, re, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEARNER_URL = "https://me5231979.github.io/TransferPortal-/"

s = open(os.path.join(ROOT, 'index.html')).read()
notes = json.load(open(os.path.join(ROOT, 'facilitator', 'notes.json')))
by_id = {sec['id']: sec for sec in notes['sections']}

# ---- 1. asset + link paths (one directory deeper) ----
s = s.replace('href="assets/', 'href="../assets/')
s = s.replace('src="assets/', 'src="../assets/')
s = s.replace('href="cheatsheet.html"', 'href="../cheatsheet.html"')
s = s.replace('href="worksheet.html"', 'href="../worksheet.html"')

# ---- 2. head: title, noindex, no canonical/og confusion ----
s = s.replace('<title>The Talent Transfer Portal | Vanderbilt</title>',
              '<title>The Talent Transfer Portal · Facilitator Edition | Vanderbilt</title>')
s = re.sub(r'<link rel="canonical"[^>]*>\n', '', s)
s = s.replace('<meta name="viewport"', '<meta name="robots" content="noindex">\n<meta name="viewport"')

# ---- 3. QR points at the LEARNER site ----
s = s.replace('<div class="qr-card" id="qrCard" data-reveal>',
              f'<div class="qr-card" id="qrCard" data-reveal data-url="{LEARNER_URL}">')
s = s.replace('Follow along on your own device.', 'Learners scan this code and land on the learner edition; your screen keeps the notes. Follow along on your own device.')

# ---- 4. body class + nav badge ----
s = s.replace('<body>', '<body class="fac">')
s = s.replace('''    <img class="nav__vicon" src="../assets/img/vu-v-icon-nav.png" alt="Vanderbilt University" width="34" height="25">
  </a>''',
'''    <img class="nav__vicon" src="../assets/img/vu-v-icon-nav.png" alt="Vanderbilt University" width="34" height="25">
    <span class="fac__badge">Facilitator Edition</span>
  </a>''')

# ---- 5. inject the notes rail into each slide that has runbook notes ----
def rail(sec):
    def esc(t): return html.escape(t, quote=False)
    parts = [
        f'<div class="facnote__head"><span>Facilitator script</span>'
        f'<span class="facnote__time">Full {sec.get("minutes","–")} min · Core {sec.get("coreMinutes","–") or "skip"}</span>'
        f'<button class="facnote__hide" type="button" aria-label="Hide the facilitator script">Hide</button></div>',
        f'<p class="facnote__purpose">{esc(sec.get("purpose",""))}</p>',
    ]
    if sec.get('say'):
        parts.append(f'<div class="facnote__blk"><span class="facnote__tag t-say">Say</span><p class="facnote__script">&ldquo;{esc(sec["say"])}&rdquo;</p></div>')
    steps = ''.join(f'<li>{esc(x)}</li>' for x in sec.get('facilitate', []))
    if steps:
        parts.append(f'<div class="facnote__blk"><span class="facnote__tag t-do">Do</span><ol class="facnote__steps">{steps}</ol></div>')
    ask = sec.get('ask')
    if ask:
        expect = ''.join(f'<li>{esc(x)}</li>' for x in ask.get('expect', []))
        parts.append(
            f'<div class="facnote__blk"><span class="facnote__tag t-ask">Ask</span>'
            f'<p class="facnote__script">&ldquo;{esc(ask["q"])}&rdquo;</p>'
            + (f'<p class="facnote__mini">Expect:</p><ul class="facnote__steps">{expect}</ul>' if expect else '')
            + (f'<p class="facnote__mini">Respond: {esc(ask["respond"])}</p>' if ask.get('respond') else '')
            + '</div>')
    if sec.get('debrief'):
        parts.append(f'<div class="facnote__blk"><span class="facnote__tag t-deb">Debrief</span><p class="facnote__mini">{esc(sec["debrief"])}</p></div>')
    if sec.get('validate'):
        parts.append(f'<p class="facnote__meta"><b>Validate:</b> {esc(sec["validate"])}</p>')
    if sec.get('watchFor'):
        parts.append(f'<p class="facnote__meta"><b>Watch for:</b> {esc(sec["watchFor"])}</p>')
    if sec.get('transition'):
        parts.append(f'<div class="facnote__blk"><span class="facnote__tag t-tra">Transition</span><p class="facnote__script">&ldquo;{esc(sec["transition"])}&rdquo;</p></div>')
    if sec.get('coreNote'):
        parts.append(f'<p class="facnote__meta facnote__core"><b>60-min core:</b> {esc(sec["coreNote"])}</p>')
    return '<aside class="facnote" aria-label="Facilitator notes">' + ''.join(parts) + '</aside>'

count = 0
for sid, sec in by_id.items():
    pat = re.compile(r'(<section class="slide[^"]*" id="' + sid + r'"[^>]*>.*?)(\n  </section>)', re.S)
    m = pat.search(s)
    if not m:
        continue
    s = s[:m.end(1)] + '\n    ' + rail(sec) + s[m.end(1):]
    count += 1


# ---- 5b. facilitator briefing slide (ATD front matter) ----
def esc2(t): return html.escape(t, quote=False)
meta = notes['meta']
prep_cols = ''
PREP_SUBS = {"weekBefore": "Learn the course by taking it",
             "dayBefore": "Test everything a learner touches",
             "thirtyMinBefore": "Set the room, set the tone"}
for n, (label, key) in enumerate((("A week before","weekBefore"),("The day before","dayBefore"),("30 minutes before","thirtyMinBefore")), start=1):
    items = ''.join(f'<li>{esc2(x)}</li>' for x in meta['prep'][key])
    prep_cols += (f'<div class="brief__box"><h3>0{n} · {label}</h3>'
                  f'<p class="brief__sub">{PREP_SUBS[key]}</p><ol class="checks">{items}</ol></div>')
mats = ''.join(f'<li>{esc2(x)}</li>' for x in meta['materials'])
cont = ''.join(f'<div class="brief__row"><b>If {esc2(c["if"]).rstrip(".")}:</b> {esc2(c["then"])}</div>' for c in meta['contingencies'])
tough = ''.join(f'<details class="brief__q"><summary>{esc2(t["q"])}</summary><p>{esc2(t["a"])}</p></details>' for t in meta['toughQuestions'])
tmpl = ''.join(f'<details class="brief__q"><summary>{esc2(t["title"])}</summary><p>{esc2(t["body"])}</p></details>' for t in meta.get('templates', []))
tmpl_box = f'<div class="brief__box brief__wide"><h3>07 · Copy-paste templates</h3><p class="brief__sub">Copy, swap the brackets, send</p>{tmpl}</div>' if tmpl else ''
inv = (meta.get('templates') or [{}])[0]
briefing_rail = ('<aside class="facnote" aria-label="Facilitator notes">'
  '<div class="facnote__head"><span>Facilitator script</span>'
  + f'<span class="facnote__time">Full {meta["paths"]["full"]["minutes"]} min · Core {meta["paths"]["core"]["minutes"]}</span>'
  + '<button class="facnote__hide" type="button" aria-label="Hide the facilitator script">Hide</button></div>'
  + '<p class="facnote__purpose">Run this course</p>'
  + '<p class="facnote__mini">The pre-work invite. Send it with the calendar invite a week out; swap anything in [brackets] and it is ready.</p>'
  + '<span class="facnote__tag t-say">Invite</span>'
  + f'<div class="facnote__invite">{esc2(inv.get("body", ""))}</div>'
  + '</aside>') if inv.get('body') else ''
briefing = f"""  <section class="slide on-dark" id="s-briefing" data-title="Facilitator briefing">
    <div class="wrap wrap-wide">
      <p class="brief__youarehere">You are here: the facilitator prep page. Learners start on the next page.</p>
      <p class="eyebrow">Run this course / 00 · Facilitator only</p>
      <h2 class="h2">Before the room <em>fills</em>.</h2>
      <p class="lead">Two paths: Full ({meta['paths']['full']['minutes']} min) or Core ({meta['paths']['core']['minutes']} min). Every page ahead carries your script in the right rail: Say, Do, Ask with expected answers, Debrief, and a Transition into the next page, with the Core cut named at the bottom of each card. This page is everything that happens before and around the room. Learners never see this edition; the welcome QR on the next page sends them to their own.</p>
      <div class="hero__cta" style="margin-top:1.25rem"><a class="btn" href="guide.html" target="_blank" rel="noopener">Print the facilitator guide &#128424;</a></div>
      <p class="brief__printnote">One paper packet: this prep page, the run of show, the tough-questions bank, and every section script with its slide pictured beside the notes. Print it or choose Save as PDF.</p>
      <div class="brief__grid">{prep_cols}
        <div class="brief__box"><h3>04 · Materials</h3><p class="brief__sub">Have these in hand</p><ul class="checks">{mats}</ul></div>
        <div class="brief__box brief__wide"><h3>05 · When things go sideways</h3><p class="brief__sub">If it breaks, you have a move</p>{cont}</div>
        <div class="brief__box brief__wide"><h3>06 · Tough questions, ready answers</h3><p class="brief__sub">Say each answer out loud once before you teach</p>{tough}</div>
        {tmpl_box}
      </div>
      <p class="why" style="margin-top:1.5rem"><b>After the session:</b> {esc2(meta['postSession'])}</p>
    </div>
    {briefing_rail}
  </section>

"""
s = s.replace('  <!-- ============ 0 · WELCOME / QR ============ -->', briefing + '  <!-- ============ 0 · WELCOME / QR ============ -->', 1)

# ---- 6. facilitator styles ----
FAC_CSS = '''
<style>
/* ============ facilitator edition ============ */
.fac__badge { font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; font-size: .7rem; color: var(--vu-black); background: var(--vu-gold-flat);
  padding: .3rem .55rem; border-radius: 3px; margin-left: .9rem; white-space: nowrap; }
@media (min-width: 1200px) {
  body.fac .slide { display: grid; grid-template-columns: minmax(0,1fr) 350px; align-items: center; column-gap: 0; overflow-y: auto; overflow-x: hidden; }
  body.fac .slide > .wrap { grid-column: 1; }
  body.fac .slide > .hero__video, body.fac .slide > .hero__canvas, body.fac .slide > .hero__scrim { grid-column: 1 / -1; }
  body.fac .facnote { grid-column: 2; align-self: start; position: sticky; top: calc(var(--nav-h) + 16px);
    margin: 0 18px 0 0; }
  body.fac .dots { display: none; } /* rail replaces the dot rail on the right */
}
.facnote {
  background: rgba(20,20,20,.96); color: rgba(255,255,255,.85); border: 1px solid rgba(207,174,112,.45);
  border-left: 3px solid var(--vu-gold-flat); border-radius: 6px; padding: 1rem 1.1rem;
  font-size: .82rem; line-height: 1.5; max-height: calc(100vh - var(--nav-h) - 48px); overflow: auto; z-index: 5;
}
@media (max-width: 1199px) { .facnote { margin: 1.5rem var(--pad-x) 0; } }
.facnote__head { display: flex; justify-content: space-between; gap: .5rem; align-items: baseline;
  font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
  font-size: .68rem; color: var(--vu-gold-flat); border-bottom: 1px solid rgba(207,174,112,.3);
  padding-bottom: .5rem; margin-bottom: .6rem; }
.facnote__purpose { margin: 0 0 .6rem; color: #fff; font-weight: 500; }
.facnote__steps { margin: 0 0 .6rem; padding-left: 1.05rem; display: grid; gap: .35rem; }
.facnote__meta { margin: .35rem 0 0; color: rgba(255,255,255,.75); }
.facnote__meta b { color: var(--vu-gold-flat); font-weight: 600; }
.facnote__core { border-top: 1px dashed rgba(207,174,112,.35); padding-top: .5rem; }
.facnote__blk { margin: .55rem 0 0; }
.facnote__tag { display: inline-block; font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; font-size: .6rem; padding: .15rem .4rem; border-radius: 2px; margin-bottom: .25rem; }
.t-say { background: var(--vu-gold-flat); color: var(--vu-black); }
.t-do  { background: rgba(179,201,205,.9); color: var(--vu-black); }
.t-ask { background: rgba(139,161,142,.9); color: var(--vu-black); }
.t-deb { background: rgba(236,183,72,.9); color: var(--vu-black); }
.t-tra { background: rgba(255,255,255,.25); color: #fff; }
.facnote__script { margin: 0; font-family: var(--font-serif); font-style: italic; font-size: .88rem; color: #fff; }
.facnote__mini { margin: .25rem 0 0; font-size: .78rem; color: rgba(255,255,255,.75); }
.brief__grid { display: grid; gap: 1rem; grid-template-columns: 1fr; margin-top: 1.5rem; }
@media (min-width: 980px) { .brief__grid { grid-template-columns: repeat(2, 1fr); } }
.brief__box { background: #262626; border: 1px solid rgba(207,174,112,.3); border-radius: 6px; padding: 1.1rem 1.25rem; font-size: .92rem; }
.brief__box h3 { font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  font-size: .8rem; color: var(--vu-gold-flat); margin-bottom: .6rem; }
.brief__box ol, .brief__box ul { margin: 0; padding-left: 1.1rem; display: grid; gap: .4rem; color: rgba(255,255,255,.85); }
.brief__wide { grid-column: 1 / -1; }
.brief__row { padding: .45rem 0; border-bottom: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.85); }
.brief__row b { color: var(--vu-gold-flat); }
.brief__q { border-bottom: 1px solid rgba(255,255,255,.08); padding: .4rem 0; }
.brief__q summary { cursor: pointer; font-weight: 500; color: #fff; }
.brief__q p { margin: .4rem 0 .2rem; color: rgba(255,255,255,.8); font-size: .9rem; }
.brief__youarehere { font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase;
  letter-spacing: .09em; font-size: .68rem; color: rgba(255,255,255,.55); margin-bottom: 1rem; }
.brief__sub { font-weight: 600; color: #fff; margin: 0 0 .6rem; font-size: 1rem; }
.brief__printnote { color: rgba(255,255,255,.7); font-size: .9rem; max-width: 62ch; margin-top: .75rem; }
.brief__box ol.checks, .brief__box ul.checks { list-style: none; padding-left: 0; }
.brief__box .checks li { position: relative; padding-left: 1.4rem; }
.brief__box .checks li::before { content: "\\2713"; position: absolute; left: 0; color: var(--vu-gold-flat); font-weight: 700; }
.facnote__invite { border: 1px solid rgba(255,255,255,.18); border-radius: 5px; padding: .8rem .9rem;
  margin-top: .5rem; font-size: .8rem; color: rgba(255,255,255,.85); white-space: pre-wrap; }
/* hide/show the facilitator script */
.facnote__hide { font-family: var(--font-body, Inter, sans-serif); font-weight: 600; font-size: .72rem;
  color: #fff; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.3);
  border-radius: 5px; padding: .3rem .7rem; cursor: pointer; text-transform: none; letter-spacing: 0; }
.facnote__hide:hover { border-color: var(--vu-gold-flat); }
body.fac-hide .facnote { display: none !important; }
@media (min-width: 1200px) { body.fac.fac-hide .slide { grid-template-columns: 1fr; } }
.facshow { position: fixed; right: clamp(14px, 2vw, 28px); top: calc(var(--nav-h) + 14px); z-index: 96;
  display: none; align-items: center; gap: .45rem;
  font-family: var(--font-condensed); font-weight: 700; text-transform: uppercase;
  letter-spacing: .09em; font-size: .68rem; color: var(--vu-gold-flat);
  background: rgba(20,20,20,.92); border: 1px solid rgba(207,174,112,.45); border-radius: 4px;
  padding: .5rem .75rem; cursor: pointer; }
body.fac-hide .facshow { display: inline-flex; }
</style>

'''
s = s.replace('</head>', FAC_CSS + '</head>')

FAC_JS = """
<script>
(function () {
  var KEY = 'facScriptHidden';
  var show = document.createElement('button');
  show.className = 'facshow'; show.type = 'button';
  show.textContent = 'Show facilitator script';
  document.body.appendChild(show);
  function set(h) {
    document.body.classList.toggle('fac-hide', h);
    try { localStorage.setItem(KEY, h ? '1' : '0'); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.facnote__hide')) set(true);
  });
  show.addEventListener('click', function () { set(false); });
  try { if (localStorage.getItem(KEY) === '1') set(true); } catch (e) {}
})();
</script>
"""
s = s.replace('</body>', FAC_JS + '</body>')

# ---- 7. footer marker ----
s = s.replace('The Talent Transfer Portal · A Vanderbilt learning experience',
              'The Talent Transfer Portal · Facilitator Edition · learner link: <a href="' + LEARNER_URL + '" style="color:rgba(255,255,255,.7);text-decoration:underline">me5231979.github.io/TransferPortal-</a>')

out = os.path.join(ROOT, 'facilitator', 'index.html')
open(out, 'w').write(s)
print(f'wrote {out}: {count} notes rails injected')

# ---- 8. printable facilitator guide (facilitator/guide.html) ----
def _g(t): return html.escape(str(t), quote=False)
gm = notes['meta']
gsecs = notes['sections']
rows = ''.join(
    f"<tr><td>{_g(x['title'])}</td><td>{x.get('minutes','')}</td><td>{x.get('coreMinutes') if x.get('coreMinutes') else '—'}</td></tr>"
    for x in gsecs)
full_total = sum(x.get('minutes', 0) for x in gsecs)
core_total = sum(x.get('coreMinutes', 0) for x in gsecs)

def _list(items): return ''.join(f'<li>{_g(i)}</li>' for i in items)
prep_html = ''.join(
    f"<h3>{lbl}</h3><ol>{_list(gm['prep'][key])}</ol>"
    for lbl, key in (("A week before", "weekBefore"), ("The day before", "dayBefore"), ("30 minutes before", "thirtyMinBefore")))
cont_html = ''.join(f"<p><b>If {_g(c['if'].rstrip('.'))}:</b> {_g(c['then'])}</p>" for c in gm['contingencies'])
tough_html = ''.join(f"<p><b>Q: {_g(t['q'])}</b><br>{_g(t['a'])}</p>" for t in gm['toughQuestions'])
tmpl_html = ''.join(f"<p><b>{_g(t['title'])}</b><br>{_g(t['body'])}</p>" for t in gm.get('templates', []))

sec_html = ''
for x in gsecs:
    ask = x.get('ask')
    ask_html = ''
    if ask:
        exp = ''.join(f'<li>{_g(e)}</li>' for e in ask.get('expect', []))
        ask_html = (f"<p class='tagline ask'>Ask</p><p class='script'>&ldquo;{_g(ask['q'])}&rdquo;</p>"
                    + (f"<p class='mini'><b>Expect:</b></p><ul>{exp}</ul>" if exp else '')
                    + (f"<p class='mini'><b>Respond:</b> {_g(ask['respond'])}</p>" if ask.get('respond') else ''))
    core = x.get('coreMinutes')
    sec_html += f"""
  <div class="sec">
    <div class="sec__shot"><img src="img/{x['id']}.jpg" alt="Slide: {_g(x['title'])}" onerror="this.closest('.sec').classList.add('noimg')"></div>
    <div class="sec__notes">
    <h2>{_g(x['title'])} <span class="mins">Full {x.get('minutes','–')} min · Core {core if core else 'skip'}</span></h2>
    <p class="purpose">{_g(x.get('purpose',''))}</p>
    {'<p class="tagline say">Say</p><p class="script">&ldquo;' + _g(x['say']) + '&rdquo;</p>' if x.get('say') else ''}
    {'<p class="tagline">Do</p><ol>' + _list(x.get('facilitate', [])) + '</ol>' if x.get('facilitate') else ''}
    {ask_html}
    {'<p class="mini"><b>Debrief:</b> ' + _g(x['debrief']) + '</p>' if x.get('debrief') else ''}
    {'<p class="mini"><b>Validate:</b> ' + _g(x['validate']) + '</p>' if x.get('validate') else ''}
    {'<p class="mini"><b>Watch for:</b> ' + _g(x['watchFor']) + '</p>' if x.get('watchFor') else ''}
    {'<p class="mini"><b>Transition:</b> &ldquo;' + _g(x['transition']) + '&rdquo;</p>' if x.get('transition') else ''}
    {'<p class="mini core"><b>Core path:</b> ' + _g(x['coreNote']) + '</p>' if x.get('coreNote') else ''}
    </div>
  </div>"""

guide = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Facilitator Guide (printable) · {html.escape(notes['meta']['program'])}</title>
<meta name="robots" content="noindex">
<style>
  @font-face {{ font-family: 'Libre Caslon Display'; font-weight: 400;
    src: url('../assets/fonts/libre-caslon-display-latin-400-normal.woff2') format('woff2'); }}
  @font-face {{ font-family: 'Inter'; font-weight: 400;
    src: url('../assets/fonts/inter-latin-400-normal.woff2') format('woff2'); }}
  @font-face {{ font-family: 'Inter'; font-weight: 600;
    src: url('../assets/fonts/inter-latin-600-normal.woff2') format('woff2'); }}
  @font-face {{ font-family: 'Antonio'; font-weight: 700;
    src: url('../assets/fonts/antonio-latin-700-normal.woff2') format('woff2'); }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: 'Inter', Arial, sans-serif; color: #1C1C1C; background: #fff;
    font-size: 12.5px; line-height: 1.5; }}
  .sheet {{ max-width: 860px; margin: 0 auto; padding: 28px 32px; }}
  header {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    border-bottom: 2px solid #CFAE70; padding-bottom: 14px; margin-bottom: 16px; }}
  header img {{ width: 150px; }}
  h1 {{ font-family: 'Libre Caslon Display', serif; font-weight: 400; font-size: 26px; margin: 0; }}
  h1 em {{ font-style: italic; color: #946E24; }}
  .eyebrow {{ font-family: 'Antonio', Impact, sans-serif; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; font-size: 10px; color: #946E24; margin: 0 0 6px; }}
  h2 {{ font-family: 'Libre Caslon Display', serif; font-weight: 400; font-size: 18px;
    margin: 0 0 4px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }}
  h3 {{ font-family: 'Antonio', Impact, sans-serif; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; font-size: 12px; color: #946E24; margin: 14px 0 4px; }}
  .mins {{ font-family: 'Antonio', Impact, sans-serif; font-size: 11px; color: #946E24;
    letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }}
  .sec {{ border: 1px solid #E4E4E4; border-left: 3px solid #CFAE70; border-radius: 4px;
    padding: 12px 16px; margin-bottom: 12px; break-inside: avoid;
    display: grid; grid-template-columns: 290px 1fr; gap: 16px; align-items: start; }}
  .sec.noimg {{ grid-template-columns: 1fr; }}
  .sec.noimg .sec__shot {{ display: none; }}
  .sec__shot {{ position: sticky; top: 12px; }}
  .sec__shot img {{ width: 100%; border: 1px solid #E4E4E4; border-radius: 3px; display: block; }}
  .sec__notes {{ min-width: 0; }}
  @media (max-width: 700px) {{ .sec {{ grid-template-columns: 1fr; }} .sec__shot {{ position: static; max-width: 340px; }} }}
  @media print {{ .sec {{ grid-template-columns: 240px 1fr; }} .sec__shot {{ position: static; }} }}
  .purpose {{ font-weight: 600; margin: 2px 0 8px; }}
  .tagline {{ font-family: 'Antonio', Impact, sans-serif; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; font-size: 10px; margin: 10px 0 2px; color: #1C1C1C;
    background: #CFAE70; display: inline-block; padding: 2px 7px; border-radius: 2px; }}
  .tagline.ask {{ background: #8BA18E; }}
  .script {{ font-family: 'Libre Caslon Display', serif; font-style: italic; font-size: 13.5px;
    margin: 4px 0 6px; }}
  .mini {{ margin: 4px 0; color: #444; }}
  .mini.core {{ border-top: 1px dashed #CFAE70; padding-top: 6px; }}
  ol, ul {{ margin: 2px 0 8px; padding-left: 20px; }}
  li {{ margin-bottom: 3px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 8px 0 16px; }}
  th, td {{ border: 1px solid #E4E4E4; padding: 5px 9px; text-align: left; }}
  th {{ font-family: 'Antonio', Impact, sans-serif; text-transform: uppercase; letter-spacing: .06em;
    font-size: 10px; color: #946E24; }}
  .front {{ border: 1px solid #E4E4E4; border-radius: 4px; padding: 12px 16px; margin-bottom: 12px;
    break-inside: avoid; }}
  .printbtn {{ position: fixed; right: 18px; top: 18px; background: #CFAE70; border: 0; border-radius: 4px;
    padding: 9px 16px; font-family: Inter, Arial, sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; }}
  @media print {{ .printbtn {{ display: none; }} body {{ font-size: 11px; }} .sheet {{ padding: 0; max-width: none; }} }}
</style>
</head>
<body>
<button class="printbtn" onclick="window.print()">Print / Save as PDF</button>
<div class="sheet">
  <header>
    <div>
      <p class="eyebrow">Vanderbilt · Learning Series · ATD facilitator guide · print edition</p>
      <h1>{html.escape(notes['meta']['program'].split(' — ')[0].split(' · ')[0])}, the <em>facilitator guide</em></h1>
    </div>
    <img src="../assets/img/vu-lockup-black.png" alt="Vanderbilt University">
  </header>

  <div class="front">
    <h3>Run of show</h3>
    <table><tr><th>Screen</th><th>Full (min)</th><th>Core (min)</th></tr>{rows}
    <tr><th>Total</th><th>{full_total}</th><th>{core_total}</th></tr></table>
    <h3>Audience</h3><p>{_g(gm['audience'])}</p>
    <h3>Room setup</h3><p>{_g(gm['roomSetup'])}</p>
    <h3>Materials</h3><ul>{_list(gm['materials'])}</ul>
    {prep_html}
    <h3>When things go sideways</h3>{cont_html}
    <h3>Tough questions, ready answers</h3>{tough_html}
    {'<h3>Copy-paste templates</h3>' + tmpl_html if tmpl_html else ''}
    <h3>After the session</h3><p>{_g(gm['postSession'])}</p>
  </div>
{sec_html}
  <p class="mini" style="margin-top:14px;color:#777">Generated from facilitator/notes.json. The on-screen facilitator edition lives at ./ alongside this guide.</p>
</div>
</body>
</html>
"""
gout = os.path.join(ROOT, 'facilitator', 'guide.html')
open(gout, 'w').write(guide)
print(f'wrote {gout}')
