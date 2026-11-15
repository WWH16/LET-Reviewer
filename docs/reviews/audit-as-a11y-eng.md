# Accessibility Audit: LET Reviewer

**Perspective**: Accessibility Engineer
**Date**: 2026-11-10
**Plan**: plans/let-reviewer-plan.md

## Plan Summary
This is a new phone-first PWA for LET practice: an imported question bank, Drill, Review, and Mock Exam modes, and progress tracking. It's all new interactive UI. The biggest accessibility risks are the answer-choice widget, feedback after "Check answer", the timed mock exam with a 150-item palette, Filipino-language content, and questions digitized from scanned handouts (math and figures).

## Files Reviewed
This is a greenfield plan with no code yet, so the table lists the components the plan implies.

| File (planned) | A11y Role | Risk |
|---|---|---|
| `QuestionCard` (stem + choices + Check/Next) | Core interaction, used hundreds of times a day | **High** |
| `FeedbackPanel` (correct/incorrect + explanation) | Dynamic content after an action | **High** |
| `MockExam` (timer, palette 1–150, submit) | Time limit, large composite widget, modal confirm | **High** |
| `SubmitExamDialog` | Modal dialog | Medium |
| `DrillSetup` (area → subarea → topic, count, filter) | Form | Medium |
| `ProgressScreen` (charts, projected rating) | Data visualization | Medium |
| `BankManager` (import, search, edit, queues) | Forms, file input, error states | Medium |
| `Settings` (theme, text size, shortcuts, timer) | Form, toggles | Low |
| `Toast` ("Added to Review", "Backup saved") | Status message | Medium |
| Theme tokens (light/dark, correct/incorrect colors) | Contrast | Medium |

## Verdict: APPROVE WITH CHANGES

The plan is a good fit. The data model and flows are simple, and the content pipeline already points toward text over images. But all eight Critical items below need to be acceptance criteria for the phase that builds them. Several of them, like the choice widget and the feedback, are much cheaper to get right on day one than to retrofit.

## Critical Issues (Must Fix)

| # | Issue | WCAG Criterion | File(s) | Impact | Fix |
|---|---|---|---|---|---|
| C1 | "Four choices" will likely be built as tappable `div` cards. A screen reader then gets four loose text blobs, with no group, no "1 of 4", no selected state, and no arrow-key behavior. | 1.3.1 Info & Relationships, 4.1.2 Name/Role/Value, 2.1.1 Keyboard | `QuestionCard` | The core interaction is unusable without a mouse or sight | Use `<fieldset>` + `<legend>` (the legend holds the stem, or use `aria-labelledby` to point at the stem heading). Make each choice a native `<input type="radio" name="q-{id}">` inside a `<label>` that holds the letter and text. Style the label as a card. Native radios give arrow keys, a checked state, and "B, 2 of 4" for free. |
| C2 | Feedback after **Check answer** is visual only. A sighted user sees green or red. A screen-reader user hears nothing, and color-blind users can't tell red from green. | 1.4.1 Use of Color, 4.1.3 Status Messages | `FeedbackPanel`, `QuestionCard` | She doesn't know whether she got it right, which defeats the purpose | (a) Show text and an icon: "✓ Correct" / "✗ Incorrect — the answer is B". (b) Mark the correct choice with the text "Correct answer" and her wrong pick with "Your answer", not just border colors. (c) After Check, move focus to the feedback heading (`tabindex="-1"`), which announces the result and lets her read the explanation in order. Don't *also* use `aria-live` on it, or it gets announced twice. (d) Lock the radios (`disabled` or `aria-disabled`) once checked, and say so. |
| C3 | The mock exam timer is fixed, and per-second updates in a live region would flood a screen reader. | 2.2.1 Timing Adjustable, 4.1.3 | `MockExam` | Anyone who needs more time (dyslexia, low vision, screen reader) is cut off. Per-second announcements make the page unusable. | Settings gets **Timer: Real LET time / 1.5× / 2× / Off**. Real time is the default, since exam-condition practice is the point, but she can change it. Render the clock with `role="timer"` and `aria-live="off"`. Add a separate `aria-live="polite"` region that announces only at 30, 10, 5, and 1 minutes remaining. When time runs out, show an auto-submit notice and move focus to Results. Don't drop answers. |
| C4 | Single-key shortcuts (A–D / 1–4 to choose, N for Next, F for Flag) collide with screen readers' single-letter browse-mode navigation and with typing in search fields. | 2.1.4 Character Key Shortcuts | `QuestionCard`, `MockExam`, `Settings` | Screen-reader users hit "F" to jump to a form field and accidentally flag an item. Typing "a" in search picks choice A. | Add a Settings toggle, **Keyboard shortcuts: On/Off**. Only listen while focus is inside the question region, and never while an `input`/`textarea`/`[contenteditable]` is focused. List the shortcuts in a visible help panel. |
| C5 | GenEd Filipino items are written in Filipino, but the page language is `en`. Screen readers and read-aloud would pronounce Filipino with English phonetics. | 3.1.1 Language of Page, 3.1.2 Language of Parts | `QuestionCard`, `FeedbackPanel`, data model | Filipino items become hard to understand by ear | The schema already has `lang`. Render `lang={q.lang}` on the question's `<fieldset>` and on the explanation. Set `<html lang="en">` (or `fil` if she switches the UI language). Template A already asks Claude to set `lang`. Keep that rule, and validate it on import. |
| C6 | Questions digitized from scans could end up as images, such as a photographed math problem or a table. | 1.1.1 Non-text Content | Data model, Template A, `QuestionCard` | An image-only question has no text alternative and doesn't scale with text size | Keep the plan's "text, never image" rule as a hard requirement. On import, reject items whose `media.src` is set without a non-empty `media.alt`. Write math as text (or MathML if needed), and turn tables into real `<table>` markup with `<th>`. |
| C7 | The 150-button question palette means 150 Tab stops. And if "answered" and "flagged" are shown only by color or fill, a screen reader can't tell them apart. | 2.4.3 Focus Order, 2.1.1, 1.4.1, 4.1.2 | `MockExam` | Getting to Submit or back to the question takes 150 key presses. Status isn't exposed. | Make the palette a single Tab stop with **roving tabindex** (arrows move between numbers, Home/End jump to the ends). Wrap it in `<nav aria-label="Question navigator">`. Give each button an accessible name like `aria-label="Question 12, answered, flagged"`, and mark the current one with `aria-current="true"`. Show status in a non-color way too, such as a filled dot for answered and a flag icon for flagged, plus a text legend. Add **Next unanswered** and **Next flagged** buttons. On mobile, put the palette behind a "Questions (138/150 answered)" button that opens a sheet. |
| C8 | The **Submit exam** confirmation is a modal with no stated focus behavior. | 2.4.3, 2.1.2 No Keyboard Trap, 4.1.2 | `SubmitExamDialog` | Focus can escape behind the dialog, or get lost when it closes | Use a native `<dialog>` with `showModal()`, which makes the background inert. Give it a heading like "Submit exam? 12 items unanswered". Initial focus goes to the safe action, **Keep answering**. **Submit now** is the second button. Escape closes it, and focus returns to the Submit button. Buttons start with a verb, never "OK". |

## Recommendations

| # | Issue | WCAG Criterion | Fix |
|---|---|---|---|
| R1 | On **Next**, the old content is replaced and focus is left on a button that no longer exists or has moved | 2.4.3 | Move focus to the new question's heading `<h2 tabindex="-1">Question 5 of 20</h2>` |
| R2 | Page/screen changes in a single-page app aren't announced | 2.4.2 Page Titled | Update `document.title` per screen ("Drill · Assessment of Learning · Q5 of 20 — LET Reviewer"), and move focus to each screen's `<h1>` on route change |
| R3 | Text size: she'll study for hours on a phone | 1.4.4 Resize Text, 1.4.10 Reflow | Use `rem` units everywhere, add a text-size setting (100/115/130%), and check for no horizontal scroll at 320 px wide and 200% zoom |
| R4 | Tap targets for choices, Flag, and palette numbers | 2.5.8 Target Size (Minimum) | At least 44×44 px (AA minimum is 24 px; 44 is right for a thumb-driven study app). Make the whole choice card the label, so the entire card is tappable. |
| R5 | Correct/incorrect greens and reds often fail on white, and grays on dark surfaces often fail in dark mode | 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast | Define tokens for `--correct-fg`, `--incorrect-fg`, `--muted-fg`, and `--focus-ring`, and check each at ≥4.5:1 (text) or ≥3:1 (borders, icons, focus ring) **in both themes**. Add the contrast check to CI or a test page. |
| R6 | A visible focus indicator isn't specified | 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured | Use a global `:focus-visible` outline of 2 px+ at ≥3:1 contrast. Make sure a sticky timer or bottom bar never covers the focused element (use `scroll-padding`). |
| R7 | The Progress charts are visual only | 1.1.1 | Put a text summary above each chart ("Projected rating 72.4%, below 75%. Weakest: Assessment of Learning, 48%."), and add a "Show as table" toggle with a real `<table>` |
| R8 | Toasts ("Added to Review", "Backup saved", "Import complete: 48 items, 2 errors") | 4.1.3 | Use one persistent `role="status"` region that's always in the DOM. Never use auto-dismissing toasts for errors. Keep them on screen at least 5 s, and pause on hover or focus. |
| R9 | JSON import errors | 3.3.1 Error Identification, 3.3.3 Error Suggestion | Show an error summary with an `<h2>`, and list the failing items with the item ID and what to fix ("rc-h03-p12-07: missing media.alt"). Link each one to the editor. Move focus to the summary. |
| R10 | Status labels on items (Verified / Unverified / Needs key / Flagged) | 1.4.1 | Show them as text chips with an icon, never as a colored dot alone. Include the status in the question's accessible description (`aria-describedby`). |
| R11 | "Eliminate a choice" via tap-and-hold | 2.5.1 Pointer Gestures, 4.1.2 | Long-press can't be the only way. Add a small "Eliminate" toggle button per choice with `aria-pressed`, and append "(eliminated)" to the choice label. An eliminated choice stays selectable. |
| R12 | Motion: score count-ups, progress bar fills, confetti on a pass | 2.3.3 Animation from Interactions | Wrap all non-essential animation in `@media (prefers-reduced-motion: no-preference)`. Under reduce, show final values instantly. No flashing. |
| R13 | Document structure | 1.3.1, 2.4.1 Bypass Blocks | Use `<header>`, `<main>`, and `<nav>` landmarks, one `<h1>` per screen, and `<h2>` for each question. Add a skip link to `<main>`. Use real `<ul>` lists for the bank and wrong-items list. |
| R14 | Drill setup cascading selects (area → subarea → topic) | 3.2.2 On Input, 1.3.1 | Use native `<select>` with visible `<label>`s. Changing area must not auto-navigate. Announce "12 topics available" via the status region when the subarea changes. |

## Nice-to-Haves

| # | Suggestion | Rationale |
|---|---|---|
| N1 | **Read aloud** button (Web Speech API, `lang` from the item) | Helps her review hands-free on a commute or with tired eyes. It works because C5 gives every item a correct `lang`. |
| N2 | Reading-comfort setting: line height 1.6, max line length ~65ch, optional high-legibility font such as Atkinson Hyperlegible | She'll read long scenario-based ProfEd stems for hours |
| N3 | Keyboard shortcut help (`?`), shown in a native `<dialog>` | Discoverability for laptop study sessions |
| N4 | "Pause mock exam" (when the timer isn't set to Real) | Real life interrupts 2–3 hour sessions |
| N5 | An accessibility test page in the app showing every state (selected, correct, incorrect, eliminated, flagged, disabled) in both themes | One place to run axe and contrast checks before each release |
| N6 | Automated checks: `eslint-plugin-jsx-a11y` + `@axe-core/playwright` on Drill, Mock Exam, and Results | Catches regressions without manual testing every time |

## Keyboard Navigation Walkthrough

**Flow 1 — Drill (practice mode)**

| Step | Action | Expected Focus | Expected Announcement | Plan Handles? |
|---|---|---|---|---|
| 1 | Open app, Tab | Skip link → main | "Skip to main content, link" | ❌ Not specified (R13) |
| 2 | Tab to **Start Drill**, Enter | Drill setup `<h1>` | "Drill setup, heading level 1" | ⚠️ Partial (R2) |
| 3 | Tab through Area/Subarea/Topic selects, Count, Source filter | Each control | "Area, combo box, ProfEd" … "Include AI questions, checkbox, not checked" | ⚠️ Fields listed, labels not specified (R14) |
| 4 | Enter on **Start** | Question heading | "Question 1 of 20, heading level 2" | ❌ (R1) |
| 5 | Tab into choices | First radio | "Which of the following …, group. A, Bloom's taxonomy, radio button, 1 of 4, not checked" | ❌ Choice semantics unspecified (C1) |
| 6 | ↓ arrow | Next radio, selects it | "B, …, radio button, checked, 2 of 4" | ❌ (C1) |
| 7 | Tab to **Check answer**, Enter | Feedback heading | "Incorrect. The answer is C, heading level 3" then explanation | ❌ (C2) |
| 8 | Tab | **Key looks wrong**, **Flag**, then **Next** | "Next question, button" | ⚠️ Buttons listed, order unspecified |
| 9 | Enter on **Next** | New question heading | "Question 2 of 20, heading level 2" | ❌ (R1) |
| 10 | Press `C` (shortcuts on) | Choice C selected | "C, …, radio button, checked, 3 of 4" | ❌ No toggle or scoping (C4) |
| 11 | Finish item 20 | Results `<h1>` | "Results: 14 of 20, 70%, heading level 1" | ⚠️ (R2) |

**Flow 2 — Mock Exam**

| Step | Action | Expected Focus | Expected Announcement | Plan Handles? |
|---|---|---|---|---|
| 1 | Start GenEd mock | Question 1 heading | "Question 1 of 150" | ❌ (R1) |
| 2 | Time passes | (unchanged) | Silent. At 30 min left: "30 minutes remaining" | ❌ Timer behavior unspecified (C3) |
| 3 | Tab to palette | Current question button | "Question navigator, navigation. Question 1, unanswered, current" | ❌ (C7) |
| 4 | → ×11, Enter | Question 12 heading | "Question 12 of 150" | ❌ (C7) |
| 5 | Tab past palette | Next control after the palette (1 Tab, not 150) | — | ❌ (C7) |
| 6 | **Next flagged** | Next flagged question heading | "Question 37 of 150, flagged" | ❌ (C7) |
| 7 | **Submit exam** | Dialog, on **Keep answering** | "Submit exam? 12 items unanswered, dialog. Keep answering, button" | ❌ (C8) |
| 8 | Escape | Back on **Submit exam** | "Submit exam, button" | ❌ (C8) |
| 9 | Submit → **Submit now** | Results `<h1>` | "Results: General Education 78%. Projected rating …" | ⚠️ (R2, R7) |
| 10 | Timer hits 0 (timer on) | Results `<h1>` | "Time is up. Your answers were submitted." | ❌ (C3) |

## ARIA Checklist

| Element | Role | Label | States | Keyboard | Notes |
|---|---|---|---|---|---|
| Choice group | `group` (native `fieldset`) | `legend` / `aria-labelledby` → stem | — | Tab in, arrows move | `lang` from item (C5) |
| Choice | `radio` (native) | Letter + choice text via `<label>` | `checked`, `disabled` after check; "(eliminated)", "Correct answer", "Your answer" in label text | ↑↓←→, Space | Whole card is the label (R4) |
| Eliminate toggle | `button` | "Eliminate choice B" | `aria-pressed` | Enter/Space | Alternative to long-press (R11) |
| Check answer | `button` | "Check answer" | `disabled` until a choice is selected (or allowed, with an inline hint) | Enter/Space | — |
| Feedback heading | heading, `tabindex="-1"` | "Correct" / "Incorrect — the answer is C" | — | Receives focus | Not color-only (C2) |
| Flag | `button` | "Flag question 12" | `aria-pressed` | Enter/Space, `F` if shortcuts are on | — |
| Key looks wrong | `button` | "Report answer key for question 12" | — | Enter/Space | Confirmation via status region |
| Timer | `timer` | "Time remaining" | `aria-live="off"` | — | Milestone region separate (C3) |
| Milestone announcer | `status` | — | `aria-live="polite"` | — | 30/10/5/1 min only |
| Question palette | `navigation` containing buttons | "Question navigator" | — | One Tab stop, arrows, Home/End | Roving tabindex (C7) |
| Palette item | `button` | "Question 12, answered, flagged" | `aria-current` on current | Enter | Visual non-color markers |
| Submit dialog | `dialog` (native, modal) | Its heading | — | Escape closes; focus returns | Initial focus: Keep answering (C8) |
| Toast / status | `status` | — | polite | — | Persistent region (R8) |
| Import error summary | region with `<h2>` | "2 items couldn't be imported" | — | Receives focus | Links to each item (R9) |
| Progress chart | `img` with `aria-labelledby` → text summary | Summary text | — | "Show as table" toggle | R7 |
| Settings toggles | `switch` or checkbox | Visible label | `aria-checked` | Space | Shortcuts, theme, timer, text size |

## Verdict Details
- **Screen Reader Compatibility**: CONCERNS. Choice semantics (C1), feedback (C2), Filipino `lang` (C5), image-only items (C6), and palette naming (C7) all need to be specified.
- **Keyboard Navigation**: CONCERNS. Shortcut scoping (C4) and the 150-stop palette (C7). Otherwise the plan's flows map cleanly to native controls.
- **Focus Management**: CONCERNS. Focus after Check (C2), Next (R1), route changes (R2), and the submit dialog (C8) are all unspecified.
- **Color Contrast**: CONCERNS. Correct/incorrect and muted tokens need checking in both themes (R5). Status chips must not rely on color (R10).
- **Motion Sensitivity**: CONCERNS (minor). The plan names `prefers-reduced-motion` but doesn't list which animations it covers (R12).
