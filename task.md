# LET Reviewer: Task Handoff

**Last updated**: 2026-11-15
**Purpose**: pick up the build from another Claude account or session. Read this file first, then the three documents under "Read these".

To resume, tell Claude: *"Read task.md and continue from the first unchecked item."*
Update the checkboxes and the "Where we left off" section at the end of every session.

## Read these

| File | What it holds |
|---|---|
| `docs/plans/let-reviewer-plan.md` | Product plan, Draft v1.3. Data model §4, import rules §5, mock exam §8, stack §9, visual design §13. |
| `docs/plans/frontend-plan.md` | Build order, steps F0–F9, with "done when" for each |
| `docs/reviews/audit-as-a11y-eng.md` | Accessibility rules (C1–C8, R1–R14). These are acceptance criteria. |
| `docs/reviews/audit-as-dx-eng.md` | Import and error message rules. Suggested error wording is here. |
| `docs/reviews/audit-as-structural-eng.md` | Layers, sync design, Supabase table |

## Where we left off

- **Redesign (2026-11-15):** whole UI moved from the sharp monochrome look to Hallmark Dose, light first, dark kept as a setting. sloplint: 12 FAIL before, 0 after; every link, field, handler, and heading kept.
- **Done:** F0–F9 and the verify pass. Type-check, 35 tests, and production build pass. Every screen checked at phone width with no errors.
- **Not done (needs you):** Vercel deploy (sign-in and domain choice). Real print test on paper at Folio size (DX R9). Airplane-mode test on the user's phone. LET sub-area weights are still placeholders (plan §12).
- **Next action:** deploy to Vercel, or start Phase 2b (Supabase sync) under Later.

Installed versions: React 19.3, react-router-dom 7.18, Dexie 4.4, dexie-react-hooks 4.4, Vite 8.3, TypeScript 7.0, Vitest 5.1, vite-plugin-pwa 2.0, `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` 5.3. Node 26, npm 11.

## Stack (decided)

- React + Vite + TypeScript, PWA through `vite-plugin-pwa`
- Dexie (IndexedDB) is the source of truth. Screens read and write it only.
- Hash router (`react-router-dom`), so no Vercel rewrite is needed
- Plain CSS with tokens. No CSS framework, no state library.
- Look: Hallmark redesign in the Dose theme (light first, warm paper, one green, moulded controls, plastic answer keys). Stylesheets: `src/ui/tokens.css` and `src/ui/base.css` (scaffold), `src/ui/app.css` (the app, stamp at the top). Fonts: Schibsted Grotesk, Instrument Sans, DM Mono, bundled.
- Vercel static hosting. Supabase (Auth with email code + one `docs` table) is added later as an optional copy.
- No server code in v1

## Rules to keep

1. **Import directions.** `src/domain/` imports nothing. `src/db/` imports `domain`. `src/ui/` imports only `domain` types. `src/features/` imports `domain`, `db`, `ui`. Later, `@supabase/supabase-js` is imported only in `src/sync/`.
2. **Derived, never stored:** whether an attempt was correct, and review cards (Leitner). Both are worked out from attempts and the question's current answer.
3. **IDs:** the app assigns question IDs at import (`rc-` + slug of `sourceRef`, `ai-` + hash of the stem). Attempts and mock exams use `crypto.randomUUID()`. A mock exam's `GE-1115-A` is a display `label`, not its ID.
4. **Synced records** (questions, mock exams, settings) carry `updatedAt` and a `deleted` flag. Attempts are append-only.
5. **Dose look.** One green does every signal. Wrong or missed is grey, never red. State is shown by fill, border, icon, and words. No uppercase tracked labels, no middle-dot strings, no dashes in copy. Run Hallmark sloplint after UI changes (see .hallmark/).
6. **No review-center content in the repo.** Development uses `src/domain/sample-questions.json`, which holds original items only.
7. **LET sub-area weights in `let-config.ts` are placeholders** until the user confirms their level, major, and the official TOS (plan §12, questions 1–3). Mark them clearly in the file.
8. **Commit after each completed task.** One commit per finished step (F0, F1, ...), made after the step is verified. No `Co-Authored-By` or "Generated with" lines in the commit message. Tick the step's boxes in this file in the same commit. This folder is its own git repository on branch `main`.

## Checklist

### F0. Scaffold
- [x] `package.json`, install dependencies
- [x] `tsconfig.json`, `vite.config.ts` (React + PWA plugin, `registerType: 'prompt'` so updates wait for the next launch), `index.html`, `.gitignore`
- [x] App icons (`public/icon-180.png`, `icon-192.png`, `icon-512.png`), black with a white outlined square
- [x] `.claude/launch.json` for the dev server on port 5173
- [x] `src/app/main.tsx`, `App.tsx` with hash routes: `/`, `/drill`, `/session`, `/review`, `/mock`, `/mock/:id`, `/mock/:id/print`, `/mock/:id/entry`, `/mock/:id/results`, `/progress`, `/bank`, `/bank/import`, `/bank/:id`, `/settings`, `/states`
- [x] Shell: skip link, header, bottom navigation, focus moves to each screen's `<h1>` on route change
- [ ] Deploy to Vercel on the final production domain (**needs you**: Vercel sign-in and the domain choice)

### F1. Design system
- [x] `src/ui/tokens.css`: five color tokens for light and dark, spacing scale, Geist fonts, focus ring, 44 px tap targets
- [x] Base pieces: buttons, Chip, ChoiceGroup (real radio group in a `fieldset`), Dialog (native `<dialog>`), StatusRegion (`role="status"`)
- [x] `/states` page showing every state in both themes
- [x] Check every token pair with a contrast tool (`src/ui/contrast.test.ts`)

### F2. Domain (`src/domain/`)
- [x] `types.ts`: Question, Attempt, MockExam, Settings
- [x] `let-config.ts`: parts, weights, item counts, time limits, sub-areas with stable ids
- [x] `ids.ts`: slug and hash IDs
- [x] `validate.ts`: tolerant parsing (strip fences, recover a cut-off list), shape detection (questions / backup / answer sheet), per-item validation, nearest sub-area suggestion
- [x] `leitner.ts`: boxes 1–5, intervals 1, 2, 4, 8, 16 days, cards derived from attempts
- [x] `scoring.ts`: accuracy by area and sub-area, projected rating, 75% and 50% rules, weakest topics
- [x] `examDraw.ts`: proportional draw by sub-area weight, shortfall fill, no repeats, exam label
- [x] `prompts.ts`: Templates A, B, C filled in from the config
- [x] `sample-questions.json`: 10–20 original items
- [x] `domain.test.ts`: validator, IDs, Leitner, draw, scoring, and a check that `domain` imports no other layer

### F3. Local database (`src/db/`)
- [x] `db.ts`: Dexie stores `questions`, `attempts`, `mockExams`, `settings`, `meta`
- [x] Repository functions, "Load sample questions"
- [x] `backup.ts`: versioned envelope export, restore with version check (replace, not merge)

### F4. Bank and first run
- [x] Import screen: paste box, paste-from-clipboard, file picker, preview ("48 new, 2 skipped, 2 errors"), commit
- [x] Bank list: search, queues (Needs key, Unverified, Flagged), edit screen
- [x] First-run Home: "Add your first questions", Copy Template A, Load sample questions

### F5. Drill loop
- [x] Drill setup: area, sub-area, topic, count, source filter, Copy prompt
- [x] Session: question, Check answer, feedback, explanation, Next, Flag, Key looks wrong, eliminate
- [x] Keyboard shortcuts (A–D, 1–4, Enter, F), scoped and switchable
- [x] Results inside the session

### F6. Settings, backup, offline
- [x] Settings: level, major, exam date, timer, theme, text size, shortcuts, strict sheet
- [x] Export and restore with a preview dialog
- [x] `navigator.storage.persist()` and its status
- [x] Service worker precaches the app; a reload with the server stopped loads from cache (tested in preview build). Real-phone airplane-mode test still to do.

### F7. Review and Progress
- [x] Review queue from due cards, Quick 10
- [x] Home: reviews due, projected rating, countdown, streak, backup reminder
- [x] Progress: accuracy tables, weakest five topics, Copy my weak topics

### F8. Mock exam, digital
- [x] Setup with availability check and the half-length, 25-item, and include-AI fixes (25-item Short length added for small banks)
- [x] Booklet, answer sheet (side panel on laptop, bottom drawer on phone), strict sheet option
- [x] Timer with milestone announcements, auto-save, pause while the app is closed
- [x] Submit dialog ("Keep answering" is the default), grading into attempts
- [x] Results: score, rule check, checking the paper with filters, pacing checkpoints

### F9. Mock exam, printed
- [x] Print styles for A4, Letter, Folio; 1 or 2 columns; large print
- [x] Answer sheet with corner markers and the exam label in large text (no QR code in v1)
- [x] Optional answer key page
- [x] Tap-entry grading with Blank, Back, and a count before grading

### Verify
- [x] `npx tsc --noEmit` passes
- [x] `npx vitest run` passes
- [x] `npx vite build` passes
- [x] Click through every screen in the browser at phone width (375 px): no overflow, no console errors. Light and dark checked.

### Later (not started, separate from the frontend)
- [ ] Phase 2b: Supabase table and policies, email-code sign-in, `src/sync/` push and pull
- [ ] Phase 3c: photo grading through Claude chat (Template C)

## Open decisions (need you or the user)

1. Elementary or Secondary, and which major
2. Production domain. Local data is tied to it, so choose before the user's first import.
3. Whether review-center questions may be stored in her private cloud account, or only her answers and progress
4. Printer access and default paper size

## Commands

```bash
npm run dev
```

```bash
npx vitest run
```

```bash
npm run build
```

These work once F0's config files exist.
