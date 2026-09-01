#!/usr/bin/env python3
"""Build the SCORM 1.2 package for Oracle Learning.

Packages the SELF-PACED edition (web/index.html) as a single SCO with the
SCORM wrapper (assets/js/scorm.js) injected, plus the printables it links
(job aid, quick reference, first move card) and every asset. Run after the
editions are regenerated:

    python3 tools/build-web.py && python3 tools/build-scorm.py

Writes talent-transfer-portal-scorm12.zip at the repo root.
"""
import os, re, shutil, zipfile, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'scorm-dist')
ZIP = os.path.join(ROOT, 'talent-transfer-portal-scorm12.zip')
TITLE = 'The Talent Transfer Portal'

if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, 'web'))


def strip_vercel(s):
    s = re.sub(r'<script>\s*window\.va = window\.va[^<]*</script>\n?', '', s)
    s = s.replace('<script defer src="/_vercel/insights/script.js"></script>\n', '')
    return s


# ---- the SCO: self-paced edition with the SCORM wrapper ----
sco = open(os.path.join(ROOT, 'web', 'index.html')).read()
sco = strip_vercel(sco)
assert 'scorm.js' not in sco
sco = sco.replace('</body>', '<script src="../assets/js/scorm.js?v=1"></script>\n</body>')
open(os.path.join(DIST, 'web', 'index.html'), 'w').write(sco)

# ---- printables the course links to ----
for f in ('jobaid.html', 'cheatsheet.html', 'worksheet.html'):
    s = strip_vercel(open(os.path.join(ROOT, f)).read())
    open(os.path.join(DIST, f), 'w').write(s)

# ---- assets, wholesale ----
shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(DIST, 'assets'))

# ---- imsmanifest.xml ----
files = []
for dirpath, dirnames, filenames in os.walk(DIST):
    for name in sorted(filenames):
        rel = os.path.relpath(os.path.join(dirpath, name), DIST).replace(os.sep, '/')
        files.append(rel)
file_xml = '\n      '.join('<file href="%s"/>' % html.escape(f, quote=True) for f in files)

manifest = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="VU.TalentTransferPortal.SCORM12" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-TTP">
    <organization identifier="ORG-TTP">
      <title>%(title)s</title>
      <item identifier="ITEM-TTP" identifierref="RES-TTP" isvisible="true">
        <title>%(title)s</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-TTP" type="webcontent" adlcp:scormtype="sco" href="web/index.html">
      %(files)s
    </resource>
  </resources>
</manifest>
''' % {'title': TITLE, 'files': file_xml}
open(os.path.join(DIST, 'imsmanifest.xml'), 'w').write(manifest)

# ---- zip (imsmanifest.xml at the archive root) ----
if os.path.exists(ZIP):
    os.remove(ZIP)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for dirpath, dirnames, filenames in os.walk(DIST):
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            z.write(full, os.path.relpath(full, DIST).replace(os.sep, '/'))

import xml.dom.minidom
xml.dom.minidom.parse(os.path.join(DIST, 'imsmanifest.xml'))  # well-formedness gate
size = os.path.getsize(ZIP) / 1e6
print('wrote %s (%.1f MB, %d files)' % (ZIP, size, len(files) + 1))
