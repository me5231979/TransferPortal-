#!/usr/bin/env python3
"""Generate the self-paced web edition at web/index.html.

Same course as the classroom edition minus the classroom prompts: the QR
welcome slide is dropped and every "As a group" activity is replaced by
its solo variant (the "Flying solo?" line it already carries). Run after
editing index.html:

    python3 tools/build-web.py
"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, 'index.html')).read()

# ---- 1. drop the welcome/QR slide ----
i = s.index('id="s-welcome"')
start = s.rindex('<section', 0, i)
# include the leading comment line if present
cstart = s.rindex('<!--', 0, start)
if s[cstart:start].count('\n') <= 2: start = cstart
end = s.index('</section>', i) + len('</section>')
s = s[:start] + s[end:]

# ---- 2. group activities -> solo variants ----
def solo_block(m):
    block = m.group(0)
    if 'As a group' not in block:
        return block
    fs = re.search(r'<p class="why"[^>]*><b>Flying solo\?</b>(.*?)</p>', block, re.S)
    if fs:
        return ('<div class="deeper__ask"><h4><span class="mode">On your own</span></h4>\n'
                '          <p class="why"><b>Do this now:</b>' + fs.group(1) + '</p></div>')
    return ''  # group-only, no solo fallback: drop
s = re.sub(r'<div class="deeper__ask"[^>]*>.*?</div>(?=\s*(?:<div|</div>))', solo_block, s, flags=re.S)

# ---- 3. head + paths ----
s = s.replace(' | Vanderbilt</title>', ': Self-Paced | Vanderbilt</title>', 1)
s = re.sub(r'(rel="canonical" href="[^"]+?)/?"', r'\1/web/"', s, count=1)
s = s.replace('href="assets/', 'href="../assets/')
s = s.replace('src="assets/', 'src="../assets/')
s = s.replace('href="cheatsheet.html"', 'href="../cheatsheet.html"')
s = s.replace('href="worksheet.html"', 'href="../worksheet.html"')
s = s.replace('<li><a href="web/">Self-paced version</a></li>',
              '<li><a href="../">Classroom edition (for facilitators)</a></li>')

# ---- 4. slide counter ----
n = len(re.findall(r'<section class="slide', s))
s = re.sub(r'(id="deckCount">1 / )\d+', lambda m: m.group(1) + str(n), s)

assert 'As a group' not in s, 'a group block survived'
assert 'id="s-welcome"' not in s
out = os.path.join(ROOT, 'web', 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write(s)
print('wrote %s (%d slides)' % (out, n))
