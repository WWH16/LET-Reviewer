# Plan: LET Reviewer

**Date**: 2026-11-10
**Status**: Draft v1.3 (2026-11-15: added Mock Exam paper experience, §8; folded in DX audit C1–C5: import rules, app-owned IDs, versioned backups, app-built prompts, small-bank mock setup; introduced the Vercel + Supabase stack and sync-ready data model from the structural audit, §9)
**Audience**: You (building it) and the person studying with it (using it)

---

## 1. The problem with the current workflow

Right now the user pastes a topic into an LLM and asks for a quiz. That works, but:

| Problem | Why it hurts for the LET |
|---|---|
| The LLM's answer key is sometimes wrong, and she can't tell | She can end up memorizing a wrong answer with full confidence |
| Questions vanish when the chat ends | No record of what she missed, so no targeted re-review |
| Topics aren't balanced against the exam's weights | Easy to over-drill comfortable areas and skip weak ones |
| No practice under exam conditions | The real test is 150 items per part, on a clock |
| The review center's questions get answered once and filed away | Those are her most trustworthy items, and she isn't re-using them |

## 2. What we're building

A small, phone-first web app: **one question bank → four ways to practice → progress that maps to how the LET is actually scored.**

**Goals**
1. **One bank, two kinds of questions.** Review-center questions are trusted. AI-generated ones are labeled *Unverified* until the user checks them.
2. **Four practice modes:** Drill (by topic), Review Mistakes (spaced repetition), Mock Exam (timed, LET format), Quick 10 (a 5-minute session).
3. **Progress shown as a projected LET rating**, including a warning when any part is near the 50% floor.
4. **Works offline on her phone**, with no account needed. Cloud backup and sync between her phone and laptop is optional and is turned on in Settings (§9).

**Non-goals (v1)**
- Multiple users or social features. The only sign-in is the optional one for her own cloud backup.
- Publishing the review center's questions anywhere public. That material belongs to the review center. The app ships empty, and content is imported on her device only. If she turns on cloud backup, her bank is also kept in private database rows that only her account can read.
- Calling an LLM from inside the app. Generation happens in a Claude chat using saved prompt templates (§5), and the results get imported. This keeps API keys and costs out of v1.

## 3. LET facts the app encodes

| | Elementary | Secondary |
|---|---|---|
| Parts and weights | GenEd 40%, ProfEd 60% | GenEd 20%, ProfEd 40%, Specialization 40% |
| Items | 150 GenEd, 150 ProfEd | 150 / 150 / 150 for most majors (120 Math, 100 TVTEd) |
| Time | GenEd 2 h, ProfEd 3 h | + Specialization 3.5 h |
| Passing | 75% weighted average **and** no part below 50% | same |

- The sub-area lists (e.g. GenEd's 10 areas, ProfEd's TOS areas) are stored in a config file, taken from the review center's coverage and the current TOS (BPT Res. No. 11, s. 2025). They are not hard-coded.
- Each sub-area in the config has a stable **id** (e.g. `assessment-of-learning`) and a display name. Questions store the id, so renaming a sub-area never orphans its questions.
- **Open question:** is the user taking Elementary or Secondary, and if Secondary, what is their major? This is a setting in the app, but we need it to seed the config.

## 4. Data model

```jsonc
// Question
{
  "id": "rc-handout-3-p-12-7",      // assigned by the app at import, never by the LLM (see §5, Import rules)
  "area": "ProfEd",                 // GenEd | ProfEd | Major
  "subarea": "assessment-of-learning",   // sub-area id from the config (§3)
  "topic": "Table of Specifications",
  "lang": "en",                     // en | fil   (GenEd Filipino items are in Filipino)
  "stem": "Which of the following ...",
  "choices": [ {"key":"A","text":"..."}, {"key":"B","text":"..."},
               {"key":"C","text":"..."}, {"key":"D","text":"..."} ],
  "answer": "B",                    // null if the handout has no key
  "explanation": "B is correct because ... A is wrong because ...",
  "source": "review-center",        // review-center | ai
  "sourceRef": "Handout 3, p.12, #7",
  "status": "verified",             // verified | unverified | needs-key | flagged
  "media": null,                    // { "src": "...", "alt": "..." } — rare; prefer text
  "tags": ["Bloom", "TOS"]
}

// Attempt (one per answer). Append-only: never edited after it is written.
{ "id": "<uuid>", "questionId": "...", "chosen": "C", "ms": 41200,
  "mode": "drill", "at": "2026-11-10T21:04:00+08:00" }

// Review card (spaced repetition). A local cache rebuilt from attempts. Never synced.
{ "questionId": "...", "box": 1, "due": "2026-11-11" }
```

**Rules that keep the data safe to sync (§9):**
- Whether an attempt was correct is **not stored**. It is worked out from `chosen` and the question's current `answer`, so fixing a wrong key also fixes her history.
- Review cards are worked out from attempts in the same way. Two devices can never disagree about a card, because neither one stores it as the truth.
- Questions, mock exams, and settings carry `updatedAt` and a `deleted` flag. Removing something sets the flag, so the removal reaches her other device.
- Attempt and mock exam IDs are UUIDs made on the device. Question IDs come from the content (§5, Import rules), so the same handout imported on two devices merges into one set.

**Storage:** IndexedDB on the device is the source of truth. Supabase is an optional copy (§9). **Export/Import JSON** for backups, with a gentle weekly "Back up your progress" reminder. Losing three months of attempt history the week before the exam would be a disaster.

**Backup format.** A backup is one versioned envelope:

```jsonc
{ "type": "backup", "schemaVersion": 1, "exportedAt": "2026-11-15T21:00:00+08:00",
  "questions": [...], "attempts": [...], "mockExams": [...], "settings": {...} }
```

- The database uses Dexie's versioned migrations. Every schema change bumps `schemaVersion`, and restoring an older backup runs the same migrations, so a Phase 1 backup still restores in Phase 4.
- A backup from a *newer* version than the app is refused, and nothing is changed: "This backup was made by a newer version (v3) than this app (v2). Nothing was restored. Reload the app to update, then try again."
- **Restore replaces, it does not merge.** Before anything is written, the app shows both sides ("Backup from 8 Nov: 412 questions, 2,130 answers. This device now: 440 questions, 2,480 answers"). The buttons are **Cancel** (default) and **Replace with backup**.

## 5. How questions get into the bank

### A. Digitize the review-center questions (highest value, do first)
1. The user photographs or scans a page of the handout.
2. She uploads it to Claude with **Prompt Template A** (below), and Claude returns JSON in the schema above.
3. She copies the JSON from the chat and pastes it into the app's Import screen (see *Import rules* below). Each item keeps `source: "review-center"` and a `sourceRef`, so she can always check it against the paper.
4. If the handout has no answer key, the item is saved with `answer: null` and `status: "needs-key"`. It shows up in a queue for her to fill in, and it's never auto-answered by AI.

### B. Generate new items from what she has reviewed
**Prompt Template B** gives Claude the topic plus her notes or a handout excerpt. It asks for N items in the same schema, each with an explanation that also says *why each wrong choice is wrong*. Every generated item comes in as `source: "ai"`, `status: "unverified"`.

In the app, unverified items show a visible **Unverified** label and a **"Key looks wrong"** button. Drill setup has a filter: *Review-center only* / *Include AI questions*.

### C. Target her weak spots
The Progress screen has an **"Copy my weak topics"** button. It produces a short list (e.g. "Assessment of Learning: 48% over 40 attempts"). Each weak topic also has a **Copy prompt** button, which copies Template B already filled in for that topic.

### Import rules (all imports)

The JSON comes from a chat window on a phone, so the import screen has to cope with what chats actually produce. Suggested error wording is in `reviews/audit-as-dx-eng.md`.

1. **Paste first.** The main input is a paste box (with a "Paste from clipboard" button). A file picker is the second option.
2. **Tolerant parsing.** The app strips code fences and any text before or after the JSON. If the list is cut off, it keeps the complete items and says where it stopped ("The list was cut off after item 31. Ask Claude to continue from item 32").
3. **Validation per item.** One bad item never blocks the good ones. Each error names the item, the field, and what's allowed ("Item 7 (Handout 3, p.12): `answer` is "E". It must be A, B, C, D, or empty").
4. **Sub-areas are checked against the config.** `subarea` may be the id or the display name, and it is stored as the id. If it matches nothing, the item is held back and the app offers the nearest match ("Use **Assessment of Learning**?"). It never creates a new sub-area on its own.
5. **The app assigns IDs.** Any `id` in the pasted JSON is ignored.
   - Review-center items: `rc-` plus the `sourceRef` in lowercase with punctuation turned into dashes (`"Handout 3, p.12, #7"` → `rc-handout-3-p-12-7`).
   - AI items: `ai-` plus a short hash of the stem.
   - An ID is set once at import and never recomputed, even if she edits the item later.
6. **Duplicates are skipped, never overwritten.** If an incoming item's ID is already in the bank, the saved version stays as it is, including any key she corrected. The preview lists what was skipped.
7. **Preview, then commit.** Nothing is written until she confirms. The preview reads like "48 new, 2 already in your bank (skipped), 2 with errors", and the button says **Import 48 items**.

### Prompt templates

She doesn't edit these by hand. The app fills in the area, sub-area, topic, level, schema, and the list of allowed sub-areas from the config, and a **Copy prompt** button puts the finished prompt on the clipboard. The button is on Drill setup, Progress, and Bank. Only the handout name and page (Template A) and her notes (Template B) are typed in.

<details><summary><b>Template A — Digitize a handout page</b></summary>

```
You are converting a scanned LET review handout into JSON. Transcribe exactly.
Do NOT invent, fix, or improve questions or answers.

For each numbered item, output one object with:
area (GenEd|ProfEd|Major), subarea, topic, lang ("en" or "fil"),
stem, choices [{key,text}], answer (the letter from the handout's key, or null
if no key is shown), explanation ("" if none on the page), source "review-center",
sourceRef "<Handout name>, p.<page>, #<item>", status ("verified" if key present,
else "needs-key"), media null, tags [].

Rules:
- Math: write it as plain text (e.g. "x^2 + 3x - 4 = 0", "3/4"), never as an image.
- If an item depends on a figure/table, transcribe the table as text; describe
  a figure in "media.alt" in one or two sentences.
- If any text is unreadable, put "[unreadable]" and set status "flagged".
- "subarea" must be copied exactly from the allowed list below. If none fits,
  use "unknown". Do not make up a new one.
- Do not include an "id" field.
Return a JSON array only.
Allowed sub-areas: {filled in by the app}
Handout name: ____  Page: ____
```
</details>

<details><summary><b>Template B — Generate practice items</b></summary>

```
Write {N} LET-style multiple-choice questions (4 choices, one correct) on:
Area: {area}  Subarea: {subarea}  Topic: {topic}
Level: {Elementary|Secondary, major}

Base them ONLY on this material I reviewed:
<<< paste notes / handout excerpt >>>

Mix: ~40% recall, ~40% application/scenario, ~20% analysis.
Distractors must be plausible (common misconceptions), not silly.
For each item, the explanation must say why the answer is right AND why each
other choice is wrong, and name the source concept (theorist, law, principle).
If you are not certain of the correct answer, skip that item.

Output JSON array in this schema: {schema, filled in by the app}
Use "{subarea}" exactly as the subarea value. Do not include an "id" field.
source "ai", status "unverified", sourceRef "AI from: {topic} notes".
```
</details>

## 6. Screens

1. **Home**: reviews due today, a "Continue" button, a projected-rating card, a countdown to her target exam date, and a study streak.
2. **Drill setup**: area → subarea → topic, number of items, a source filter, and "Start". Also **Copy prompt**, which copies Template B filled in for the chosen topic.
3. **Question (practice modes)**: "Question 4 of 20", the stem, four choices, **Check answer**, then feedback, explanation, and **Next**. Also **Flag** and **Key looks wrong**. Optional: tap-and-hold or a button to *eliminate* a choice, which matches the strike-out habit from the paper exam.
4. **Mock exam**: built to feel like the paper LET, with results only after submission. It comes in two forms, **Digital paper** and **Printed paper**. Full spec in §8.
5. **Results**: score per part, projected weighted rating, a pass/fail check against both rules, and the wrong items with **Add all to Review**.
6. **Progress**: accuracy by area and subarea over time, the weakest 5 topics, and the "Copy my weak topics" button.
7. **Bank**: import by paste with a preview (§5, Import rules), **Copy prompt** for Template A, search, edit an item, and queues for *Needs key*, *Unverified*, and *Flagged*.
8. **Settings**: level/major, target exam date, timer options, theme, text size, keyboard shortcuts on/off, export/import backup, and cloud backup (sign in with an email code, "Last synced" status, **Sync now**).

## 7. Spaced repetition (Review Mistakes)

Uses a Leitner system with 5 boxes and intervals of 1, 2, 4, 8, and 16 days.
- A wrong answer in *any* mode puts the item in box 1, due tomorrow.
- A right answer in Review moves the item up one box. A wrong answer sends it back to box 1.
- After box 5 it's "mastered", but it still appears in Mock Exams.
- Home shows "12 reviews due". It's simple, predictable, and needs no tuning.

## 8. Mock Exam: the paper experience

The real LET is a printed test booklet plus a separate answer sheet where you shade bubbles. Mock Exam copies that. **Nothing is graded and nothing is revealed until she submits.** The practice modes (Drill, Review) keep their instant feedback, because instant feedback is better for learning. Mock Exam is for testing under real conditions.

### 8.1 Setting up an exam (shared by both forms)
- Choose the **part** (GenEd / ProfEd / Major, or a full exam day), the **length** (full LET count or a half-length 75), and the **source** (review-center only / include verified AI / include all).
- The app draws items in proportion to the TOS sub-area weights in the config and shuffles their order. Choice order is kept as written in v1, so there's no mapping to get wrong.
- **When the bank is too small.** Before Start, setup shows what's available against what's needed: "A full GenEd mock needs 150 questions. You have 62 from the review center and 40 AI." Start is disabled until the exam can be filled, and the fixes are buttons on the same screen: **Use 75-item half length** and **Include AI questions**. If one sub-area is short, the app fills the gap from the other sub-areas of that part and says so in one line. An item never appears twice in one exam.
- Each exam gets a short **Exam ID** (e.g. `GE-1115-A`) and is saved as a `MockExam` record. That record holds the exact item order, which is what makes printed grading possible.

### 8.2 Digital paper (on screen)
- **Booklet:** one scrolling page of numbered items in a print-like style: plain background, readable serif text, A–D under each stem, no colors or hints. Every item has its own heading, so she can jump around.
- **Answer sheet:** a bubble grid (`12  Ⓐ Ⓑ Ⓒ Ⓓ`). It sits beside the booklet on a laptop. On a phone it's a bottom drawer opened with a button like "Answer sheet (98/150)".
- **Answering:** tapping a choice in the booklet shades the bubble. A *Strict sheet* setting makes her shade on the sheet only, to build the habit of moving answers over and to catch "shifted a row" mistakes.
- **During the exam:** the timer for that part, flags, and answers she can change freely. **Every answer auto-saves**, so a dead battery at item 120 doesn't lose anything.
- **Submit:** a confirmation like "Submit exam? 12 unanswered, 5 flagged", with **Keep answering** as the default button.

### 8.3 Printed paper (real pencil, real paper)
**Printing**
- The app makes a **booklet** and an **answer sheet** using print CSS. She uses "Print → Save as PDF" or prints directly from her phone or laptop. No PDF library is needed.
- Paper sizes: **A4, Letter (short bond), and Folio 8.5×13 (long bond)**, since long bond is common in PH print shops.
- **Booklet:** a header with the Exam ID, part, time allowed, and instructions. Page numbers. No item split across a page break (`break-inside: avoid`). Body text at least 11 pt, pure black. A 1- or 2-column option to save paper.
- **Answer sheet:** name/date line, Exam ID plus a **QR code** with the Exam ID, bubbles in columns of 25 with the letter printed inside each bubble, and **four corner markers** so a photo of the sheet can be lined up later.
- **Optional third page, "Answer key + explanations":** printed separately and folded away, for checking without the app.

**Grading after the exam**
1. **Tap entry (v1):** In the app, open *Printed exams → GE-1115-A*, or scan the QR. A bubble grid appears and auto-advances to the next row after each tap, so 150 items take about 5 minutes. She also enters the total time she took.
2. **Photo grading (v1.5, through Claude chat):** She photographs the answer sheet and sends it to Claude with **Template C**. Claude returns `{ "examId", "answers": { "1": "B", "2": null, ... }, "unsure": [17, 88] }`. The app imports it and **shows the grid for her to confirm before grading**. Unsure items (double-shaded, erased, faint) are highlighted for her to fix. Nothing is graded without her confirmation.
3. **Offline bubble reading (later, optional):** OpenCV.js uses the corner markers to straighten the photo and read the bubbles on the device itself. It gives the same result each time, needs no AI, and works offline. Only build it if photo grading gets used a lot.

### 8.4 Results (same for both forms)
1. Score per part, projected weighted rating, and a pass/fail check against both rules (75% average, no part below 50%).
2. **Checking the paper:** the booklet again, now marked with her answer, the correct answer, and the explanation. Filters: *Wrong only*, *Flagged*, *Unanswered*.
3. **Pacing** (digital only): which items took longest, compared with the target pace (2 h / 150 items ≈ 48 s per item). Printed exams show only the total time she entered.
4. **Add all wrong answers to Review** in one tap.

### 8.5 Data model additions
```jsonc
// MockExam
{
  "id": "<uuid>",                   // made on the device, so two devices never collide
  "label": "GE-1115-A",             // the Exam ID she sees and that gets printed
  "form": "digital",                // digital | printed
  "part": "GenEd",
  "itemIds": ["rc-handout-3-p-12-7", "..."],   // exact order as printed/shown
  "timeLimitMin": 120,
  "paper": { "size": "folio", "columns": 2 },   // printed only
  "answers": { "1": "B", "2": null },
  "flags": [12, 37],
  "status": "in-progress",          // in-progress | printed | submitted | graded
  "startedAt": "...", "submittedAt": "...", "totalMin": 112
}
```
Graded answers are also written as normal `Attempt` records with `mode: "mock-digital"` or `"mock-printed"`, so Progress and Review use them like any other answer. Printed attempts have `ms: null`.

### 8.6 Template C — Read a photographed answer sheet
```
This is a photo of a multiple-choice answer sheet with bubbles A–D.
Exam ID is printed at the top (also in the QR). Items: {N}.
For each item number 1..N, report which single bubble is shaded.
- If no bubble is shaded: null.
- If two or more are shaded, or a bubble looks erased or faint: give your best
  guess AND add the item number to "unsure".
Do not guess the correct answers. Only report what is shaded.
Return JSON only: { "examId": "...", "answers": { "1": "A", ... }, "unsure": [ ... ] }
```

### 8.7 Accessibility notes for this mode
- The 150-item booklet is the longest screen in the app. It needs a heading on every item, "jump to item #", and the question-grid pattern from audit **C7**.
- The timer follows **C3**, and the submit confirmation follows **C8**.
- Printed pages use black text at 11 pt or larger, with a large-print option (14 pt). Bubbles have the letter printed inside, so they don't rely on position alone.
- The tap-entry grid uses one Tab stop with arrow keys, labels like "Item 12, B", and a visible "Item 12 of 150" counter.

## 9. Tech choice

**Stack:** React + Vite + TypeScript as a **PWA**, using IndexedDB via Dexie and the Workbox service worker for offline use. It is deployed on **Vercel** as a static site, with **Supabase** (Auth + Postgres) as an optional cloud copy. There is no server code in v1. The deploy contains no questions. She can use "Add to Home Screen" to get an app icon.

| Piece | Choice | Why |
|---|---|---|
| Framework | Vite + React + TypeScript, not Next.js | No server rendering or SEO is needed, and offline is simpler. Vercel deploys a Vite build with no configuration. |
| Hosting | Vercel, static build | Push to deploy. Pick the production domain **before the user's first import**: their local data is tied to the exact domain, and preview URLs are separate, empty apps. |
| Local data | Dexie (IndexedDB) | The app reads and writes here only |
| Cloud copy | Supabase Postgres, one table | Backup and phone-to-laptop sync |
| Sign-in | Supabase Auth, email one-time **code** | Optional. A typed code works the same in a browser tab and in the installed app. |
| Server code | None in v1 | Later features that need an API key (in-app generation) go in a Vercel Function under `/api` |

**Local-first rule.** Every screen reads and writes the local database. Supabase is a copy that one sync module updates in the background. The whole app works signed out and offline, and a failed sync never blocks practice.

**Code layout.** Imports go one way only.

```
src/domain/    pure TypeScript: types, validator, ids, Leitner, scoring, exam draw, LET config
src/db/        Dexie schema, repositories, backup export        (imports domain)
src/sync/      Supabase client, sign-in, push, pull              (imports db, domain)
src/features/  React screens                                     (imports domain, db)
supabase/migrations/   the table and its access policies
```

`@supabase/supabase-js` is imported only inside `src/sync/`, enforced by a lint rule. Only Settings calls into `sync` (status, sign in, Sync now).

**Cloud table.** Supabase stores whole records as JSON, so adding a field to a question never needs a database migration:

```sql
create table public.docs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null,        -- questions | attempts | mockExams | settings
  id         text not null,
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),   -- set by a trigger on every write
  primary key (user_id, collection, id)
);
alter table public.docs enable row level security;
-- select, insert, and update policies: to authenticated, (select auth.uid()) = user_id
-- (update has both using and with check). No delete policy. Anonymous sign-ins stay off.
```

This is a sketch. Check it against the current Supabase docs and run `supabase db advisors` before the first real import.

**Sync.** Hand-written, about 100 lines, no sync library.
- **Push:** upload local records that changed since the last sync.
- **Pull:** fetch rows with a newer `updated_at` than the saved cursor, apply them, and rebuild the derived data (review cards).
- **When:** on app open, on coming back online, at the end of a session, and from **Sync now**. Never on each answer.
- **Conflicts:** the last write wins per record. Attempts never change, so they cannot conflict.
- **First sign-in on a device that already has data:** pull, then push. The result is the union of both, with no "which copy do you want" question.

**Keys.** Only the Supabase URL and the **publishable** key go in Vercel environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The secret key is never added to this project. If the variables are missing, sync is switched off and everything else still runs.

Details and reasoning are in `reviews/audit-as-structural-eng.md`.

**Lighter alternative:** a single self-contained HTML file, published as a private Claude artifact and opened on her phone. It's faster to start, but offline support and storage are less reliable. Fine for a Phase 0/1 trial.

## 10. Phases

| Phase | Scope | Size | Done when |
|---|---|---|---|
| 0 | Lock the schema + Templates A and B; digitize **one** handout in Claude | An evening | 30–50 real items in valid JSON |
| 1 | Import (paste, per-item validation, app-assigned IDs, preview), Copy prompt for Templates A and B, Drill mode, Question screen, Results, local storage, versioned export and restore | A weekend | The user pastes a chat reply, imports it, and does a 20-item drill on her phone, offline. A backup restores on a second device. |
| 2 | Review Mistakes (Leitner), Progress screen, weak-topics export | A weekend | Missed items come back on schedule |
| 2b | Cloud backup and sync: Supabase table + policies, email-code sign-in, push/pull, sync status in Settings | A weekend | She answers on her phone, opens the laptop, and sees the same progress. Signed out and offline still work. |
| 3 | Mock Exam, digital paper (booklet + answer sheet, timer, auto-save, submit, results, checking the paper) | A weekend | Full 150-item GenEd mock under time, results only after submit. With a short bank, setup shows the counts and offers half length instead of starting. |
| 3b | Mock Exam, printed paper (print CSS for 3 paper sizes, QR + corner markers, tap-entry grading) | An evening or two | She takes a printed mock with a pencil and grades it in about 5 minutes |
| 3c | Photo grading via Template C, with a confirmation screen | An evening | A photographed sheet grades correctly after her confirmation |
| 4 | Bank queues (needs-key / unverified / flagged), editing, Quick 10 | Ongoing | AI items get verified as she studies |
| Later | In-app generation, offline OpenCV bubble reading, read-aloud, charts | Optional | — |

## 11. Accessibility and usability

These are v1 acceptance criteria, not polish. Details are in `reviews/audit-as-a11y-eng.md`. The headline items:
- Choices are a real radio group, and feedback is announced and never conveyed by color alone.
- The mock timer can be extended or turned off, and it announces only at milestones.
- Filipino items are marked `lang="fil"`. Math and figures are text, never images alone.
- Single-key shortcuts can be turned off. There's a visible focus ring. Tap targets are at least 44 px.
- Light and dark themes both pass contrast. `prefers-reduced-motion` is respected.

## 12. Open questions for the user

1. Elementary or Secondary? If Secondary, which major?
2. What format are the review-center questions in: printed booklet, PDF, photos, Google Form?
3. Do the handouts include answer keys? Explanations?
4. Which exam date is she targeting? (Used for the countdown.)
5. Does she study mostly on her phone, laptop, or both?
6. Does she have easy access to a printer, or would she print at a shop? This decides the default paper size and whether the 2-column layout matters.
7. Is she comfortable with her review-center questions being stored in her own private cloud account for backup? If not, cloud sync covers her answers and progress only, and the questions stay on the device.

## 13. Visual design

**Direction (2026-11-15):** Cloudflare's Kumo components (`@cloudflare/kumo`) in monochrome: black, white and greys only, no hue anywhere. White cards on a light grey page with a hairline ring and a soft shadow. The primary button and the current selection are near-black (near-white in dark mode). Type is Schibsted Grotesk, Instrument Sans and DM Mono.

**How it is built**
- Kumo's precompiled stylesheet (`kumo-standalone.css`), so no Tailwind. Role tokens live in `src/ui/tokens.css`; Kumo's own `--color-kumo-*` tokens point at them, so Kumo's buttons, badges and rings follow the palette.
- Buttons wear Kumo's own classes (`src/ui/btn.ts`); status chips are Kumo `Badge`. Inputs, radios, the dialog and the answer sheet stay native elements, styled to match, because the accessibility rules depend on them (§11).
- Dark mode is `data-mode="dark"` on `<html>`. "System" follows the device.

**State**

| State | Look |
|---|---|
| Choice, idle | White card, hairline ring, letter in an outlined square |
| Choice, selected | Grey card, 2 px dark ring, letter filled dark |
| Correct answer | Light grey card, 2 px dark ring, dark letter box with a check, the words "Correct answer" |
| Her wrong pick | Grey card, 2 px mid-grey ring, cross icon, the words "Your answer", text struck through |
| Eliminated | Muted text, struck through |
| Unverified / Flagged / Needs key | Neutral Kumo badge with an icon and the word; Verified carries a check icon |
| Primary button | Near-black with a white label (near-white with a dark label in dark mode). One per screen. |
| Secondary button | Kumo secondary, white with a ring |

Colour is never the only signal: every state also has an icon, a fill or ring change, and words.

**Type**
- The pre-Kumo faces, bundled as `woff2` so they work offline: Schibsted Grotesk (700, tight tracking) for headings, the brand and large figures; Instrument Sans for body and interface text, Kumo's components included; DM Mono for timers, scores, item numbers and Exam IDs.
- Sizes step with the screen (`--text-h1`, `--text-h2`, `--text-figure`, `--text-stat` in `tokens.css`): page title 22 px on phones, 24 px from 60rem, 28 px from 90rem; section heading 18 then 20 px; the big figure 32, 40, 44 px. Card padding is 16 px on phones and 24 px from 60rem; sections sit 24 px apart on phones and 32 px from 60rem.
- Question text and choices at 16 px; interface and helper text at 14 px. Everything is in rem, so the Text size setting scales Kumo's components too.

**Depth:** a 1 px subtle border on every raised surface first, then a soft neutral shadow under 0.08 alpha in light mode; in dark mode, a faint top-edge highlight instead of shadow.

**Contrast:** every text pair is 4.5:1 or better in both modes, and selection edges reach 3:1 (`src/ui/contrast.test.ts`).

**Touch and focus:** tap targets stay at 44 px on touch screens (§11). Focus ring: 2 px near-black (near-white in dark mode).

**Print:** the mock exam booklet and answer sheet keep pure black on white (§8.3).
