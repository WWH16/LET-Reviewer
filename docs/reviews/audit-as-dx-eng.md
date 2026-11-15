# DX Audit: LET Reviewer

**Perspective**: Developer Experience Engineer
**Date**: 2026-11-15
**Plan**: plans/let-reviewer-plan.md (Draft v1.1)

## Plan Summary
The plan replaces "paste a topic into a chat" with a pipeline: Claude chat produces JSON, the app imports it, and four practice modes plus a paper-style mock exam run on top of one local bank. From a DX point of view the product has two operators. You build it and run the content pipeline, and the user runs the pipeline daily on a phone. The "API surface" of this tool is the JSON contract between a chat window and the import screen, and that contract is where the plan is thinnest.

## Files Reviewed
This is a greenfield plan with no code yet. The table lists the surfaces the plan implies.

| File (planned) | DX Role | Risk |
|---|---|---|
| Question JSON schema (§4) | The contract between Claude chat and the app | **High** |
| Import screen (§5, §6.7) | The only way content enters. Runs on every study session. | **High** |
| Prompt Templates A, B, C (§5, §8.6) | Hand-filled "CLI" for content generation | **High** |
| Backup export/import (§4) | The only protection against data loss | **High** |
| LET config file (§3) | Sub-area taxonomy, weights, item counts, time limits | Medium |
| Mock exam setup (§8.1) | Draws items by TOS weight. Fails when the bank is small. | Medium |
| Tap-entry grading grid (§8.3) | 150 inputs in a row. Speed and undo matter. | Medium |
| Print CSS + QR + corner markers (§8.3) | Depends on browser print dialogs the app does not control | Medium |
| Keyboard shortcuts (§6.8, §11) | Mentioned as a toggle. Never listed. | Medium |
| `reviews/audit-as-a11y-eng.md` | Existing review. Covers focus, ARIA, and import error summary (R9). | — |

## Verdict: APPROVE WITH CHANGES

The architecture is right and already lazy in the good sense: no backend, no API keys, print CSS instead of a PDF library, Leitner instead of a tuned algorithm. The gaps are all at the seams. The plan specifies the happy path of "Claude returns JSON, she imports the file" and nothing about what happens when the JSON is fenced, truncated, duplicated, or uses a sub-area name the config does not know. Those cases will occur in the first week, on a phone, with nobody to debug them. Fix the five Critical items in the phase that first touches each one.

## Critical Issues (Must Fix)

| # | Issue | Impact on Developer | Fix |
|---|-------|-------------------|-----|
| C1 | **The import contract is unspecified.** §5.A.3 says only "She imports the file." Chat output arrives wrapped in ``` fences, with a sentence before or after it, sometimes truncated mid-array on a long page, and on a phone there is usually no file at all, only a Copy button. | The first import fails with a raw `JSON.parse` error, or one bad item rejects 49 good ones. The user cannot recover and messages you. | Specify import in Phase 1: (a) **Paste from clipboard** is the primary path, file picker second. (b) Strip code fences and surrounding prose before parsing. (c) Validate per item and import the valid ones. (d) Show a preview before commit: "48 new, 2 duplicates skipped, 2 errors". (e) Nothing is written until she taps **Import 48 items**. |
| C2 | **Question IDs come from the LLM and nothing defines them.** Template A says `id` with no format. Template B will produce `ai-001` in every chat, so separate sessions collide. Re-importing a page either duplicates items or silently overwrites an item whose key she already corrected. Attempts and review cards point at `questionId`. | Lost edits, orphaned history, or a bank full of duplicates. All silent. | The app owns IDs. Review-center items: derive the ID from `sourceRef` (handout, page, item number) at import. AI items: the app assigns a content hash of the stem, and ignores any `id` in the JSON. Same ID on import means **skip by default**, listed in the preview. Never overwrite an item that was edited in the app. |
| C3 | **No schema version on the bank or the backup.** §10 Phase 0 locks the schema, then Phase 3 adds `MockExam`, and later phases will add fields. The backup file is the only safety net (§4), and nothing says a backup made in Phase 1 restores in Phase 4. Restore semantics (replace or merge) are also unstated. | A backup that does not restore is discovered the week before the exam. A restore that silently replaces current data destroys the progress it was meant to protect. | Export an envelope: `{ "type": "backup", "schemaVersion": 1, "exportedAt": ..., "questions": [...], "attempts": [...], ... }`. Use Dexie's versioned migrations and run the same migration on restore. Restore shows a preview ("Backup from 8 Nov: 412 questions, 2,130 attempts. Your device now: 440 questions, 2,480 attempts") and makes **Cancel** the default. |
| C4 | **Sub-area and topic names are free text typed into a prompt.** Template B has `{area}`, `{subarea}`, `{topic}`, and `<paste schema>` filled by hand. Template A asks Claude to choose `subarea` while also telling it not to invent anything. One spelling drift ("Assessment of Learning" vs "Assessment in Learning") creates a phantom sub-area. | §8.1 draws mock items in proportion to TOS sub-area weights. Items in a phantom sub-area are never drawn, and Progress splits one topic across two rows. Nothing reports it. | (a) The app builds the prompts. A **Copy prompt** button on Drill setup, Progress, and Bank fills area, sub-area, topic, level, schema, and the exact allowed sub-area list from config. The templates stop being text she edits. (b) Import validates `area` and `subarea` against config and offers the nearest match. (c) Store a stable `subareaId` slug in config so a display rename does not orphan questions. |
| C5 | **Mock exam setup has no behavior for a bank that is too small.** A full GenEd mock needs 150 items spread across sub-areas by weight. Phase 0 yields 30–50 items. Phase 3's "done when" is a full 150-item mock. | The first mock attempt either crashes, produces a 62-item "150-item" exam, or repeats items. Whichever it is, she sees it at the moment she set aside two hours. | Setup shows availability before Start: "GenEd needs 150. Bank has 62 review-center, 40 AI." Offer the fixes as buttons: **Use 75-item half length**, **Include AI questions**. If a sub-area has too few items, fill from the other sub-areas and say so in one line on the setup screen. Never repeat an item inside one exam. |

## Recommendations

| # | Issue | Why | Fix |
|---|-------|-----|-----|
| R1 | Phase 0's "valid JSON" has nothing to validate against | The schema is locked by eye, and the first real validator appears in Phase 1 with different rules | Write the validator first: one plain function, about 40 lines, no schema library. Run it in Phase 0 as `node validate.mjs page.json`, then import the same function in the app. One runnable test file covers it. |
| R2 | Three JSON shapes go through "import": question arrays, backups, and Template C answer sheets | Three entry points on a phone is three places to paste the wrong thing | One paste box that detects the shape: array is questions, object with `schemaVersion` is a backup, object with `examId` is an answer sheet. State what it detected before doing anything. |
| R3 | `Attempt.correct` is stored, and "Key looks wrong" lets her fix a key later | After a key fix, history still records the old verdict. Progress and Leitner boxes stay wrong. | Delete the `correct` field. Derive it from `chosen` and the question's current `answer`. Less data, no re-scoring code. |
| R4 | No undo for a bad import batch | A mis-transcribed page puts 30 wrong items in the bank, and removing them one by one is the only option | Stamp each item with `importBatchId`. Bank gets "Imported 15 Nov, 30 items" with **Remove batch**. Removal is blocked or confirmed if any item has attempts. |
| R5 | Keyboard shortcuts exist only as an on/off setting. The plan never lists them. | The laptop path for a 150-item mock and for tap entry depends on them | Add a shortcut table to the plan. Practice: `A`–`D` or `1`–`4` select, `Enter` check/next, `F` flag, `X` eliminate, `?` help. Tap entry: `A`–`D` shade and advance, `Space` blank and advance, `Backspace` back one row, `G` then a number to jump. Scope and toggle per a11y audit C4. |
| R6 | Tap entry cannot record a blank, and has no stated way to back up | Auto-advance on tap means an unanswered item has no input. One mis-tap shifts every row after it, which is the exact error *Strict sheet* exists to catch. | Add a fifth target, **Blank**, on each row. Show "Item 12 of 150" and a **Back** control. Before grading, show the count: "150 entered, 4 blank". |
| R7 | The QR code needs a generator library and a scanner library, for a list that holds one to three pending exams | Two dependencies and a camera permission prompt to avoid one tap | Cut the QR from v1. Print the Exam ID as large text. Pick the exam from the *Printed exams* list. Add the QR only if the offline bubble reader gets built, since Template C can read the printed ID. Corner markers stay because they are four CSS squares. |
| R8 | §8.4.3 promises per-item pacing, and §8.2 puts all items on one scrolling page | With a scrolling booklet there is no "current item", so per-item time cannot be measured | Record a timestamp on each answer. Report pacing at checkpoints ("Item 50 at 0:41, target 0:40") and flag the largest gaps between consecutive answers. Change the §8.4 wording to match. |
| R9 | Printing depends on dialogs the app does not control | `@page size` is honored differently across browsers, and "Save as PDF" is hard to find on a phone | Before building Phase 3b, spend 30 minutes printing a two-page test from the user's actual phone and browser at Folio size. Put the findings in the plan. Show one hint above the Print button: "In the print dialog, set paper size to Folio (8.5×13)". |
| R10 | Storage durability is one line: "IndexedDB on the device" plus a weekly reminder | Browsers can evict site data, and the rules differ between a browser tab and an installed home-screen app. Verify the current behavior for her phone. | Call `navigator.storage.persist()` on first import and show the result in Settings ("Storage: protected / not protected"). Base the reminder on risk, not the calendar: "214 answers since your last backup on 2 Nov". Use the share sheet for export where a plain download is unreliable. |
| R11 | The app ships empty and the plan has no first-run screen | Home with no reviews, no rating, and no bank looks broken. The templates live in a plan document, not in the app. | First-run Home has one job: **Add your first questions**, with the three steps and a **Copy Template A** button. Add **Load 10 sample questions** so the app can be tried before any digitizing. The sample file doubles as your dev and test seed, since the repo cannot hold review-center content. |
| R12 | The config file format is unstated | JSON cannot hold comments, and the config is the only place the TOS weights are explained | Make it a typed TypeScript module (`let-config.ts`) with a comment on each field and the source resolution cited. The compiler checks the shape, so no runtime config validation is needed. |
| R13 | Template C output is trusted for `examId` and item count | A photo of the wrong sheet, or 148 answers for a 150-item exam, would grade against the wrong items | On import, compare `examId` with the open exam and the answer count with `itemIds.length`. Mismatch stops the import with the message in the Error Message Audit below. |
| R14 | Items transcribed from a photo are marked `verified` when a key is present | The key letter itself can be mis-read during transcription. That recreates problem 1 in §1 inside the trusted set. | The import preview shows item number and key letter in a compact column so she can check the page's key against the paper in one pass. No new status needed. |
| R15 | Service worker updates are not mentioned | A new deploy can swap the app, or run a migration, in the middle of a mock exam | Apply updates only on next launch. Never reload during an exam with status `in-progress`. Show the build version in Settings so "which version are you on" has an answer. |
| R16 | "Any free static host" is not a decision | It leaves the deploy step undefined at the point the user needs a URL | Pick one host in the plan and write the one deploy command next to it. |

## Nice-to-Haves

| # | Suggestion | Rationale |
|---|------------|-----------|
| N1 | Template A accepts a page range and a default sub-area, so the per-page fields are filled once per handout | A 40-page handout should not need 40 hand edits of "Page: ____" |
| N2 | Import preview reports the batch's distribution: "30 items: 22 Assessment of Learning, 8 Curriculum Development" | Catches a wrong sub-area before commit |
| N3 | Define "day" for streaks and Leitner `due` as the local calendar date, with a 3 a.m. rollover | Studying at 00:30 should count as the same night |
| N4 | **Copy debug info** in Settings: version, schema version, counts per table, last backup date | Replaces a screenshot thread when something looks wrong |
| N5 | Exam ID suffix continues past `Z` (`AA`), or uses a short counter | Removes a collision that only appears on a heavy day |
| N6 | Remember the last Drill setup and offer it as **Repeat last drill** on Home | The daily path becomes one tap |
| N7 | Search in Bank accepts `status:unverified` and `source:ai` style filters | A power path for clearing queues, at the cost of one small parser. Build only if the queues get long. |

## Error Message Audit

The plan defines no error text. "Current Message" is therefore what the default implementation would show.

| Error Scenario | Current Message | What Developer Needs | Suggested Message |
|---------------|----------------|---------------------|-------------------|
| Pasted text is not JSON (fences, prose, or chat UI text) | `Unexpected token '`' ... is not valid JSON` | That the app looked for a JSON list and where to get one | "No question list found in what you pasted. In Claude, tap **Copy** on the code block, then paste here." |
| JSON is cut off mid-array | `Unexpected end of JSON input` | That the output was truncated, and that the complete items are safe | "The list was cut off after item 31. Those 31 can be imported. Ask Claude to 'continue from item 32'." |
| Item fails validation | Whole import rejected, or the item is dropped without notice | Which item, which field, and what is allowed | "Item 7 (Handout 3, p.12): `answer` is "E". It must be A, B, C, D, or empty." |
| Unknown sub-area | Item imports into a new phantom sub-area | The nearest valid name and a one-tap fix | "Item 4: sub-area "Assessment in Learning" is not in your list. Use **Assessment of Learning**?" |
| Duplicate ID or duplicate stem | Silent overwrite or silent duplicate | The count, and confirmation that existing items are untouched | "2 items are already in your bank and were skipped. Your saved versions were not changed." |
| `media.src` without `media.alt` | (a11y audit C6 rejects it, no text given) | The rule and the fix | "Item 12 has a figure with no description. Add a one-sentence description, or remove the figure." |
| Backup from a newer app version | Crash in migration, or partial restore | That nothing was changed, and what to do | "This backup was made by a newer version (v3) than this app (v2). Nothing was restored. Reload the app to update, then try again." |
| Backup file is not a backup (a question list) | Restore wipes data, or a parse error | What the file is and where it belongs | "This is a question list, not a backup. Import 30 questions instead?" |
| Restore over existing data | Silent replace | What will be lost | "Restore replaces everything on this device: 440 questions, 2,480 answers. The backup has 412 questions, 2,130 answers from 8 Nov." Buttons: **Cancel**, **Replace with backup**. |
| Storage full or write fails | `QuotaExceededError` in the console, answer lost | That the answer was not saved, and how to free space | "Could not save your last answer. Storage is full. Export a backup now, then free space on your phone." |
| Mock exam: bank too small | Short exam, repeats, or crash | The numbers and the available fixes | "A full GenEd mock needs 150 questions. You have 62 from the review center and 40 AI. **Use 75-item half length** or **Include AI questions**." |
| Template C: Exam ID mismatch | Grades against the wrong items | Both IDs | "This sheet is for exam PE-1112-B. You opened GE-1115-A. Open PE-1112-B instead?" |
| Template C: answer count mismatch | Missing items graded as blank | The count, and that she can fill the gap | "The sheet has 148 answers for a 150-item exam. Items 149–150 are missing. Enter them by hand before grading." |
| Exam resumed after the app was closed | Unstated. Possibly a restart. | That nothing was lost and how the clock was handled | "Exam GE-1115-A restored: 98 of 150 answered. The timer was paused while the app was closed." |
| Print blocked or paper size differs | Layout breaks with no explanation | That the item numbering still holds | "Printing uses your browser's dialog. If the paper size differs, page breaks move but item numbers stay the same." |

## Developer Journey

**First use (builder, Phase 0–1).** The schema is clear and the phases are small. Friction starts at "30–50 real items in valid JSON": nothing defines valid, so R1's validator should be the first code written. The second friction point is seed data. The repo cannot contain review-center questions, so without a sample file (R11) every dev session starts with a manual import.

**First use.** She opens an empty app (R11). She photographs a page, opens Claude, and has to find Template A in a plan document, then fill in the handout name and page by hand. Claude replies with a fenced code block. She has no file to import, only text to paste (C1). If the import fails, the message is a parser error (Error Message Audit). This is the highest-friction moment in the whole product, and it happens before she answers one question.

**Daily use.** Drill, Check, Next is a tight loop and the plan gets it right: instant feedback in practice modes, no confirmation dialogs, auto-save in mock. The one confirmation the plan adds (Submit exam) guards an action that happens once per exam, so it is correctly placed. Friction appears in the generate loop: "Copy my weak topics" gives a list, but Template B takes one topic plus a hand-pasted schema (C4). Each round trip is four manual edits on a phone keyboard. An app-built prompt makes it one tap and one paste. The second daily risk is silent drift: a misspelled sub-area or a colliding ID does not fail, it just makes Progress and mock draws slightly wrong (C2, C4).

**Power use.** On a laptop, a 150-item mock and tap-entry grading are keyboard work, and the plan lists no keys (R5). With `A`–`D` plus `Space` for blank, tap entry drops from about five minutes to about two. Bulk paths are mostly present (Add all to Review, queues in Bank). The missing ones are undo for an import batch (R4) and a multi-page Template A (N1). The printed path has the most unknowns outside the app's control, so the 30-minute print test (R9) should happen before Phase 3b is scheduled.

## Verdict Details
- **Error Quality**: CONCERNS. No error text is specified, and the main input is LLM output pasted on a phone. See C1 and the Error Message Audit.
- **Defaults & Config**: CONCERNS. Good defaults in mock mode (real time, Keep answering). Config format, sub-area identity, schema versioning, and restore semantics are undefined (C3, C4, R12).
- **Keyboard Experience**: CONCERNS. A toggle exists, the shortcut map does not. Tap entry has no blank or back key (R5, R6).
- **Discoverability**: CONCERNS. The app ships empty with no first-run path, and the prompt templates live outside the app (R11, C4).
- **Workflow Integration**: CONCERNS. The chat-to-app round trip is the core workflow and is specified only on the happy path (C1, C2, R2). Print and backup rely on platform behavior that needs a short test on her actual phone (R9, R10).
