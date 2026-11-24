# Frontend Build Plan: LET Reviewer

**Date**: 2026-11-15
**Parent plan**: `let-reviewer-plan.md` (Draft v1.3)
**Scope**: the app as it runs in the browser, built first and working fully offline. Supabase sign-in and sync (parent plan Phase 2b) come after step F7 and are not part of this document.

## Approach

Build the frontend against the local database (Dexie) from day one. There is no fake API layer to replace later: under the local-first rule, the local database *is* what the screens talk to, before and after Supabase is added. Sync is later added beside the app, not underneath it.

Until the real questions exist, every step runs on a small sample file, `src/domain/sample-questions.json` (10–20 original items, never review-center content).

## Setup choices

| Need | Choice | Why |
|---|---|---|
| Scaffold | `npm create vite@latest` with the `react-ts` template | Matches the stack in the parent plan §9 |
| Routing | `react-router-dom`, hash router | Eight screens. Hash routing needs no Vercel rewrite and works offline. |
| Local data | `dexie` + `dexie-react-hooks` | Screens re-render when data changes, with no state library |
| State | React state and `useLiveQuery` only | No Redux or Zustand. The database is the shared state. |
| Styling | Plain CSS with the tokens from parent plan §13 | Five colors and one spacing scale do not need a CSS framework |
| Fonts | Geist and Geist Mono as bundled `woff2` files | Works offline. Check the package name and license when installing. |
| Offline | `vite-plugin-pwa` | Generates the Workbox service worker and manifest |
| Tests | `vitest` for `src/domain/` | Pure functions, fast to test |

## Folder layout

```
src/
  domain/      types.ts, validate.ts, ids.ts, leitner.ts, scoring.ts,
               examDraw.ts, let-config.ts, sample-questions.json
  db/          db.ts (Dexie schema), repositories, backup.ts
  ui/          tokens.css, Button, Chip, ChoiceGroup, Dialog, StatusRegion
  features/    home/, bank/, drill/, question/, results/, review/,
               progress/, mock/, settings/
  app/         App.tsx, routes.tsx, main.tsx
```

Import rule: `domain` imports nothing. `db` imports `domain`. `ui` imports nothing from `features`. `features` import `domain`, `db`, and `ui`.

## Steps

Each step ends with something that can be opened on a phone.

| Step | Build | Done when |
|---|---|---|
| **F0. Scaffold** | Vite + React + TypeScript project, hash router with eight empty routes, lint rule for the import directions, first deploy to Vercel on the final production domain | The empty shell opens on the user's phone from the production URL |
| **F1. Design system** | `tokens.css` (light only), fonts, and the base pieces: Button, Chip, ChoiceGroup (real radio group), Dialog (native `<dialog>`), StatusRegion. One `/states` page showing every state: idle, selected, correct, wrong pick, eliminated, focus, disabled. | The `/states` page matches parent plan §13 and every token pair passes a contrast check |
| **F2. Domain** | Types, validator, ID assignment, sample questions, and a Vitest file for the validator and IDs | `npx vitest run` passes. The validator rejects a bad item with a message naming the item and field. |
| **F3. Local database** | Dexie schema (questions, attempts, mockExams, settings, meta), repositories, and "Load sample questions" | Sample questions survive a page reload and show in a plain list |
| **F4. Bank and first run** | Import screen (paste box, tolerant parsing, per-item validation, preview, commit), Bank list with search and status chips, first-run Home with "Add your first questions" and "Load 10 sample questions" | Pasting a fenced chat reply with one bad item imports the good ones and lists the bad one with a reason |
| **F5. Drill loop** | Drill setup, Question screen (Check answer, feedback, explanation, Next, Flag, Key looks wrong, eliminate), Results. Attempts saved on each answer. Focus moves as in the accessibility audit (C1, C2, R1). | A 20-item drill runs start to finish by touch and by keyboard only, and the attempts are in the database |
| **F6. Settings, backup, offline** | Settings (level, exam date, text size, shortcuts), versioned export and restore with preview, PWA manifest and service worker, `navigator.storage.persist()` | Installed to the home screen, a drill works in airplane mode, and a backup restores on a second device. **This completes parent plan Phase 1.** |
| **F7. Review and Progress** | Leitner review queue worked out from attempts, Home "reviews due", Progress screen with accuracy by sub-area, weakest five topics, Copy prompt | A missed item comes back the next day, and Progress matches a hand count of the attempts |
| **F8. Mock exam, digital** | Exam setup with the availability check, booklet, answer sheet (side panel on laptop, bottom drawer on phone), timer, auto-save, submit dialog, results and "checking the paper" | A half-length mock runs under time, survives closing the app mid-exam, and shows results only after submit |
| **F9. Mock exam, printed** | Print styles for A4, Letter, and Folio, answer sheet with corner markers, tap-entry grading with Blank and Back | She takes a printed mock and grades it in about five minutes |

After F7 the backend work (Supabase table, sign-in, sync) can start in parallel with F8, since it only touches `src/sync/` and Settings.

## Order of risk

Three things are tested early because they are cheap to check now and expensive to find late:

1. **F0 deploys to the real domain.** Local data is tied to the domain, so the domain is fixed before any real data exists.
2. **F1 settles every visual state on one page.** The monochrome design has no color to fall back on, so states must be told apart by fill, border, icon, and words before screens are built on them.
3. **F4 comes before F5.** Import is the only way content gets in, and it is the highest-friction step for the user.

## Not in this plan

- Supabase sign-in and sync (parent plan Phase 2b)
- Photo grading through Claude (Phase 3c)
- In-app question generation, offline bubble reading, read-aloud (Later)
