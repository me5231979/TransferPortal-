# The Transfer Portal · Vanderbilt Learning Series

An interactive training for Vanderbilt staff and managers on **the Transfer
Portal**, Vanderbilt's staff-facing internal talent mobility experience
(powered by Oracle, paired with Workforce Intelligence on the leader side).

**Live editions**

| Edition | URL | For |
|---|---|---|
| Classroom | https://me5231979.github.io/TransferPortal-/ | Projected in a room, QR welcome, group activities |
| Self-paced | https://me5231979.github.io/TransferPortal-/web/ | Individual learners, solo variants of every activity |
| Facilitator | https://me5231979.github.io/TransferPortal-/facilitator/ | The classroom deck with an ATD script rail on every slide |

The facilitator edition includes a printable guide
(`facilitator/guide.html`) with the run of show, prep checklists,
contingencies, a tough-questions bank, and every section script beside a
picture of its slide.

## What the course covers

1. **What it is:** the one front door, its guarantees (privacy by default,
   the two-week internal-first window, advisory on request), and the
   fact-or-fiction folklore check.
2. **Six entrances:** Explorer, Tenured High Performer, Underutilized
   Contributor, Post-Reorg Realigner, At-Risk Employee, Direct Applicant.
3. **The process:** Track 1 (Interest & Development, always on, private)
   and Track 2 (Move, competitive, event-driven), through the coordinated
   handoff and the backfill cascade.
4. **The culture shift:** the talent hoarding research (Haegele, AER 2024),
   the mobility-is-development reframe, the manager conversation script,
   and the guardrails.
5. **The evidence:** cited, linked research on retention, tenure,
   engagement, speed, cost, and quality of internal mobility.

Length: Full 15 minutes / Core 10 (per-section cuts in the runbook).
Kirkpatrick evaluation: fist-to-five close (L1), scored recap quiz (L2),
first move card plus 7-day pulse and 30-day re-poll (L3).

## Editing

- Copy lives in `index.html`; interactions in `assets/js/main.js`
  (trainer configs, recap `QUESTIONS`, capstone `PRACTICE` / `NOT` / `WHEN`).
- The runbook is `facilitator/notes.json` (timing must sum: Full 15 / Core 10).
- The web and facilitator editions are **generated, never hand-edited**:

```
python3 tools/build-web.py
python3 tools/build-facilitator.py
```

Regenerate both after any change to `index.html` or `notes.json`, and
re-shoot `facilitator/img/*.jpg` after any visual change.

## Publishing

```
git push -u origin main
git branch -f gh-pages main && git push -f origin gh-pages
```

Sister programs: AI Basics, AI 201, Difficult Conversations, Coaching for
Performance, Emotional Intelligence. Same engine, same FLH brand system.

Source material: "The Transfer Portal: A Training Guide for Staff and
Managers," Vanderbilt University People, Culture and Belonging.
