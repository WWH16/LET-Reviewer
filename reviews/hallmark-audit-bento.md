# Hallmark audit: the bento and surface changes (uncommitted)

**Date**: 2026-11-16
**Target**: the working tree against `13cf1ed`. That is 11 files: `app.css`, `tokens.css`, Home, StreakCard, Progress, RatingCard, MockResults, MockSetup, DrillSetup, Settings and EditQuestion.
**Scope**: app screens (`--scope app`, genre modern-minimal, the stamped Kumo monochrome system).
**How it was checked**:
- Static lint: **0 FAIL, 0 WARN**. There are 3 waivers on record (7b), 2 answered checks and 1 dismissed check.
- A DOM scan for surfaces nested inside tiles, on the seven changed routes. The profile disclosure in Settings was opened for the scan.
- Contrast was worked out for every new text and background pair.
- Screenshots were taken at 1280 and 375px wide, and in dark mode.
- No project files were changed.

## The read

- **What the change is for**: depth through a ladder of surfaces (tile, action tile, well, one inverse tile per screen) and bento grids on Home, Progress and Mock results.
- **What works and stays**:
  - **One dark mass per screen**: each holds the figure the screen exists for (23 holds).
  - **No overflow**: nothing scrolls sideways at either width.
  - **Practice**: the raised action tile next to the flat quiet tile reads as "available" next to "not now".
  - **Progress**: each part's tile now explains its own figure.
  - **Contrast**: every new pair passes, computed below.
- **What reads as generated**: little. Settings is five identical stacked tiles, the one place close to the card kit. That is defensible for settings sections.
- **What is broken**:
  - One card sits inside a card (Settings), and one bordered box would sit inside a card (Mock setup, when the bank is too small).
  - Progress tiles mix two time windows in one figure.
  - Practice flashes the wrong tile while it loads.

## Findings by tier

### Floor (must fix)

| Gate | Where | Finding | Fix |
|---|---|---|---|
| 11 | `app.css` `.avatar-pick:has(input:checked)`; seen in Settings › Profile | The chosen Woman or Man card gets `--color-card` plus `--shadow-card`. Inside the Profile tile, that is **a card inside a card**. The DOM scan found it, and it is the only one. | Inside a tile, mark the choice the way `.option` does: `.tile .avatar-pick:has(input:checked) { background: var(--color-paper-2); box-shadow: inset 0 0 0 2px var(--color-ink) }`. Keep the card style on Welcome, which has no tile. |
| 11 | `MockSetup.tsx:210` | When the bank is too small, the shortage message gets `.notice` (a tint plus a 1px inset ring) **inside the form tile**, so a bordered box sits in a card. Found by reading the code; the state was not rendered, because the bank holds 35 questions and the length defaults to 25. | Make it a well: `className={enough ? undefined : 'well'}`. Or add `.tile .notice { box-shadow: none }` so any notice inside a tile drops its ring. |

### Reflex (fix, or waive with a reason)

| # | Where | Finding | Fix |
|---|---|---|---|
| R1 | `Progress.tsx` part tile; `bySub = tallyBy(attempts, …)` | **One tile, two windows.** The figure is "accuracy over your last N answers", capped at 150 (`recentPartScores`), but the sub-area table under it counts every answer ever. Once someone has more than 150 answers in a part, the rows no longer add up to the figure above them. Before this change they sat in separate sections. | Tally the sub-areas over the same recent 150 per part, or caption the table "All your answers" with a muted line. The first keeps the tile honest without extra words. |
| R2 | `DrillSetup.tsx:40,58` | **Loading flash.** The screen renders once questions and settings load, but `due` comes from `useStats()`, which can arrive later. Until then Review mistakes shows as the flat, empty quiet tile, then jumps to the raised action tile. | Include the stats in the loading gate: `const stats = useStats(); if (!p \|\| !questions \|\| !settings \|\| !stats) return <Page …>{null}</Page>`. |
| R3 | `app.css` `.weak-item` at 48rem and up | **Actions stranded from their topic.** In the full-width tile, `justify-content: space-between` puts Practice about 270px from the topic name at 985px wide, and about 550px at 1280. The eye loses which row a button belongs to. | At 60rem, put the weak list in two columns (`.tile .list:has(.weak-item) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-xl) }`), so each row is about 470px. Or keep the actions right after the text (`justify-content: flex-start; gap: var(--space-lg)`). |

### Finish (answer, never blocks)

| # | Where | Finding | Fix |
|---|---|---|---|
| F1 | `app.css:1-9`, `tokens.css:45` | **The stamp is out of date.** Its signature says the Today card is the inverted mass, and the F7 answer says everything shares one card recipe. Now each of three screens has one inverse tile, and surfaces follow a ladder. Gate 20 and later polish runs read the stamp. | Signature: "one inverse tile per screen holding its figure: Today (Home), the projected rating (Progress), the score (Mock results)". F7: "tiles (16px), cards and choices (12px) and wells follow one surface ladder". Update the tokens.css comment the same way. |
| F2 | `MockResults.tsx` "Time is up"; `EditQuestion.tsx:174` flag notice | **One radius per nesting level (F15).** Notices on the page ground keep 8px corners, while every other page-level surface (tiles, lists, bento notes) is now 16px. | Give page-level notices tile corners: `.stack-lg > .notice { border-radius: var(--radius-tile); padding: var(--pad-card) }`. |
| F3 | `EditQuestion.tsx` four tiles | The tiles group the fields visually, but they have no heading or group name. The rule in `app.css` says each tile is one topic under its own heading, and screen readers get no grouping. | Give each tile a short `h2 className="label"` ("The question", "Key and status", "Explanation", "Filed under"), or make each tile a `fieldset` with a `legend`. |
| F4 | `app.css` `.option` | The option cards have rest, checked and focus states, but no hover or press state, unlike the other controls (26b). | `.option:hover { background: var(--color-paper-3) }`, plus a `scale: 0.99` press guarded like `.btn`. |
| F5 | Home at 1280 with the backup note showing | The Today tile spans three rows (about 490px), so a dark band of about 250px sits between the figure and its buttons. | Accept it: the mass is the signature, and `space-between` puts the actions at the bottom on purpose. Or let the tile end at the rating row when the note shows (`grid-row: 1 / 3`). |
| F6 | Mock setup, not caused by this change | Two filled primary buttons on one screen ("Continue" in Not finished, and "Start exam") go against the stamp's own F4 answer of one primary per screen. | Make "Continue" secondary when the new-exam form is on screen. |

### Judged and dismissed

- **Option cards inside the Mock setup tile**: a chosen radio control with a ring and no shadow. A control, not a card.
- **Wells inside tiles** (rating warnings, the time on Results): flat tint with no ring or shadow. This is the intended rung, not a nested card.
- **23, dark footprint**: one inverse surface per screen on Home, Progress and Results. Nothing else uses the inverse.
- **11, hover**: only `.tile-action` reacts to the pointer, with one signal (the background). Plain tiles stay still.
- **Motion**: the press scale and background change on `.tile-action` are guarded by `prefers-reduced-motion`. Nothing animates on load.
- **Contrast** (worked out from the OKLCH lightness of the greys):

| Pair | Light | Dark |
|---|---|---|
| Quiet tile: muted text on paper-2 | 5.4:1 | 7.6:1 |
| Inverse: muted on inverse | 8.2:1 | 7.9:1 |
| Well inside inverse: ink on inverse-tint | 14.6:1 | 12.2:1 |
| Inverse muted on inverse-tint | 6.7:1 | 6.1:1 |

## Depth

A **polish** settles every finding:
- the two nested surfaces, F2 and F4, which are CSS;
- R2 and R3, each one line or one rule;
- R1, a changed tally in Progress;
- F1, the stamp text;
- F3, four headings.

No layout decision needs reopening.

## Outcome (applied)

Lint reports **0 FAIL, 0 WARN**, and **81 tests pass**: the 80 that existed, plus one new test for the Progress window.

- **Floor 11, Settings**: inside a tile, the chosen avatar option is marked with a 2px inset ink ring on a grey fill, with no card shadow. The options left unchosen keep a 1px inset line. Confirmed in the computed style.
- **Floor 11, Mock setup**: the shortage message is a `.well`. In general, any `.notice` inside a tile now drops its ring and becomes a well.
- **R1**: a new `recentByArea` in `scoring.ts` feeds both `recentPartScores` and the sub-area tally, so a part tile's rows add up to its figure. A new test in `domain.test.ts` checks this: 151 answers, where the oldest one falls out of the window.
- **R2**: Practice waits for `useStats()` before it renders, so the Review tile no longer flashes its empty state.
- **R3**: at 60rem and up, Weakest topics runs in two columns. At 1280px, Practice sits 85px from the topic name instead of about 550px.
- **F1**: the stamp's signature and its F7 answer now describe the inverse tile on each screen and the surface ladder. The `tokens.css` comment matches.
- **F2**: every page-level `.notice` has tile corners.
- **F3**: the editor tiles are sections with headings: Question and choices, Grading, Explanation, and Filed under. The Explanation heading wraps the field's own label, so the word is not said twice.
- **F4**: option cards have hover and press states. The press is guarded by `prefers-reduced-motion`.
- **F5**: with a backup note, Home gives the note its own full-width row, and the Today tile ends at the rating row. At 1280px it is now 362px tall instead of 489px.
- **F6**: on Mock setup, "Continue" and "Enter answers" are secondary, so "Start exam" is the only primary.
