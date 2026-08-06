# The Transfer Portal — Vanderbilt Learning Series

Single-page interactive classroom experience (Learning on Demand). Live at
https://me5231979.github.io/TransferPortal-/ (GitHub Pages, `gh-pages`
branch — publish with `git branch -f gh-pages main && git push -f origin gh-pages`).

Sister programs: AI_Classroom (AI Basics), AI-Advanced (AI 201),
Difficult_Conversations, Coaching-for-Performance, emotional-intelligence;
catalog at me5231979/Course_Library. Same engine, same standing principles.

## Standing design principles (do not regress these)

1. **Play throughout.** Every teaching section has a trainer: Fact or
   Fiction (01), Pick the Entrance (02), Call the Next Move (03),
   Judge the Response (04, the signature piece), Guess the Number (05).
2. **Privacy is the product.** The portal's core promise is silent-by-default
   interest declarations, and the course itself mirrors it: the capstone and
   all typed input stay on-screen, saved nowhere, and learner-visible copy
   SAYS so. Never add telemetry, storage, or sharing.
3. **Never contradict the program facts:** the program rests on three
   connected pieces (an ongoing growth conversation with your manager,
   recommended never required; a private skill map the staff member owns;
   Oracle as the operating layer for learning, declarations, Gigs, and
   requisitions); growth means upward or lateral, within or across units,
   and mobility is a normal part of a Vanderbilt career; two-week
   internal-first window; Gigs are development with no transfer guarantee (and have NOT launched yet: the copy carries a caveat in section 01, door B, Track 1, the capstone chip, and the cheatsheet; remove those when Gigs go live);
   advisory activates only on request; no auto-notification to managers
   and no forced career conversations; recruiters support competitive
   application; internal application is competitive, never entitled;
   retaliation and surveillance are named violations.
4. **Facilitator edition is generated, never hand-edited** — run
   `python3 tools/build-web.py` and `python3 tools/build-facilitator.py`
   after ANY change to index.html or notes.json. The QR encodes the
   LEARNER url.
5. **Claims carry citations.** Every statistic links its source (SHRM,
   Haegele AER 2024, LinkedIn/Belt Course, Bersin, AMS, Inop.ai, Cornell
   ILR, Mlekus & Maier, Eriksson & Ortega). Keep the links live.
6. **Brand: Vanderbilt FLH system.** Black #1C1C1C / white / flat gold
   #CFAE70; Libre Caslon Display headlines (one italic word), Inter body,
   Antonio eyebrows; motion ≤400ms; real VU lockups (authorized use only).
   Zero em or en dashes in copy, JS strings, or JSON.
7. **No frameworks.** One CSS file, one JS file, vendored QR lib,
   self-hosted fonts; hero uses the particle canvas (no video montage).

## Layout (10 slides)

Welcome/QR (privacy norm) → Hero (5 objectives) →
01 What it is (Fact or Fiction) → 02 Six entrances (Pick the Entrance) →
03 The process, two tracks (Call the Next Move) → 04 The culture shift
(Judge the Response) → 05 The evidence (Guess the Number + stat tiles) →
Recap quiz → Capstone First Move Card + five-move warm-up (Oracle
screenshots, Talent Compass Tool link) → Closing.

Deliberately no agenda, manifesto, or glossary slides; the deck was
consolidated to teaching pages only. Don't reintroduce filler pages.

Oracle screenshots live at `assets/img/oracle-career-preferences.png`,
`oracle-skills.png`, `oracle-marketplace.png`; the figures hide gracefully
via onerror if a file is missing. Keep course terms matched to the real
Oracle UI: Talent Profile (Career Preferences, Skills I have / I'm
developing), Grow (Careers of Interest), Opportunity Marketplace.

## Editing map

- Copy: `index.html` · Recap: `QUESTIONS` in `assets/js/main.js`
- Trainers: `makeTrainer` configs (portalFact, entrancePick, nextMove,
  managerCall, statGuess)
- Capstone maps: `PRACTICE` / `NOT` / `WHEN` in main.js (id `movePlan`)
- Runbook: `facilitator/notes.json` (timing must sum: Full 15 / Core 10)
- Printables: `cheatsheet.html` (quick reference), `worksheet.html`
  (first move card)
- Source doc: "The Transfer Portal: A Training Guide for Staff and
  Managers," VU People, Culture and Belonging, v1.0 August 2026.
