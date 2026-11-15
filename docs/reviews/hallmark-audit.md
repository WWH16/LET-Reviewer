# Hallmark Audit: LET Reviewer UI

**Date**: 2026-11-15
**Target**: the whole app (`src/ui/*.css`, `src/features/**`), dev server at localhost
**Scope**: app screens · genre modern-minimal (from the stamp) · theme Dose
**Method**: `sloplint --scope app --render` on 4 routes, plus screenshots of the filled screens (sample questions loaded) at 375 and 1280, walked against `gates.md` § 1, § 4 and § 5

## The read

- **What it is for:** one person studying for the LET every day. The one action is answering questions: drills, reviews, and mock exams.
- **What works and stays:** the answer keys. They are moulded keys that turn mint when chosen, with a grey wrong pick and a green stamp after checking. The type ladder and the copy are also clean. The Progress tables, the bubble sheet and the one-row mock bar are familiar and dense in the right way.
- **What reads as generated:** everything around the keys. Dose's material never arrived: no pharmacy labels, no DM Mono times, no plastic compartments. What remains is the stock product kit: a grotesk at 700 on cream, one green, soft-shadow white cards, mint wells, a centred column, and a big number over a small label.
- **What is broken:** nothing mechanical. sloplint reports 0 FAIL, 0 REFLEX, 0 WARN. The generic feel comes entirely from the judged gates and the composition.

## Findings by tier

### Floor
None open. The 7b waiver (pure black only in print) stands.

### Reflex (judged)

| # | Gate | Where | The tell | Lightest depth that settles it |
|---|---|---|---|---|
| R1 | Product chrome erasing the theme (`flow.md` § Harnesses, model tics) | `app.css:118` `.card`, `:124` `.notice`, `:802` `.tray`, `tokens.css:11,27` | This is the tic that list names: a tight grotesk at 700 on near-white, one accent, white cards under a soft shadow. Dose's own surfaces are only hinted at, once, in the Home tray: paper labels on tinted plastic, a tear-off stub, DM Mono for times and doses, the stamp. Everywhere else it is a generic SaaS kit in green. | **restyle**: put the label material on the things that carry it (exam IDs, timer, due dates, the rating) and retire the soft card |
| R2 | The hero-metric template (`craft-floor` refuse list, `flow.md` § App screens "not a greeting above four stat cards") | `Home.tsx:36-104` | The Home screen runs: big "0" over "reviews due", then a notice, then a card with a label and a sentence, then two stat columns. That is the default dashboard, and it says nothing about this product. | **full**: Home should open on the next thing to answer (a review question or the drill to resume), not on a count |
| R3 | 9, section rhythm (applies to screens here) | Home, Mock, Settings | Each screen is a single 48rem column of blocks, each in a different container: a tinted tray, a mint well, a white card, a hairline row. Each seam climbs a different rung, but the stacking order and widths are the same on every screen, so it reads as a template. At 1280 two thirds of the width is empty. | **full**: a two-column composition at 60rem and up (task on the left, the sheet, filters or context on the right), as the mock exam already has |
| R4 | 23, accent footprint by eye | `--color-paper-2`, `--color-paper-3`, `--color-accent-soft`: 26 uses in `app.css` | Mint sits under the current nav item, the notice, the feedback panel, chips, the current bubble row, the tray, the meter track and the checked key. When every tint is green the screen reads as a "wellness pastel", which the Dose theme file names as a do-not. Mint should mean one thing: chosen or correct. | **restyle**: neutral wells (a grey step off the paper), mint kept for checked and correct only |
| R5 | 1 / 37, faces that do not separate (finding from the earlier typography review) | `tokens.css:19` | Schibsted and Instrument are both neo-grotesks, so headings and body read as one voice and the pairing adds a font load and no character. DM Mono, the one face with character, is used almost nowhere. | **restyle**: a display face with a real voice, or one family; DM Mono for every time, count, ID and due date |
| R6 | 47c, imitation material | `app.css:802` `.tray` | The tray is a mint gradient with an inner shade: a physical surface drawn in CSS with nothing about it being plastic. Alone on the page it reads as a gradient card, not a material. | **restyle**: commit to the material across the app, or drop it for a flat field |
| R7 | 42 / chrome by reflex | `app.css:152` `.top`, `:175` `.brand-mark` | The nav is the AI nav: wordmark left, inline links, settings right, hairline under. The logo is a green rounded square, a stand-in app icon. App scope allows familiar chrome; the mark is the part that reads as unfinished. | **restyle**: a real wordmark (type only is fine); keep the nav pattern |

### Finish

| # | Check | Where | Note |
|---|---|---|---|
| F1 | Eliminate controls | `app.css:615` `.eliminate` | A row of "—" squares beside every key reads as form clutter. Hide them until a long-press or an "Eliminate" mode, or set them as a quiet strike glyph inside the key. |
| F2 | Booklet without the paper feel | `app.css:974` `.booklet .item` | The plan asks for print-like on-screen paper. The digital booklet reuses the practice keys, so a mock exam looks the same as a drill. |
| F3 | Empty states as plain text | Review, Progress, Bank queues | "No reviews due" and the rest teach nothing about the product. Each could show what will appear there, in the label material. |
| F4 | Milk-white paper | `tokens.css:11` | The paper is cream (oklch 97.6% 0.011, hue 88), which reads as milk. **Fixed in this run as requested:** paper is now a near-dirty white, cards are pure white. |

## What only a deeper redesign settles

A restyle (R1, R4, R5, R6, R7, F1, F4) changes how the app looks screen by screen. R2 and R3 are composition: what Home leads with, and using the desktop width. Only a full redesign of Home and the setup screens settles those. On the evidence, the lightest depth that removes the generic feel is a **restyle with a full pass on Home**.

## Paper change applied in this run

- `--color-paper`: was oklch(97.6% 0.011 88), a warm cream. Now oklch(96.6% 0.004 165), a near-white pulled slightly grey toward the ink.
- `--color-card`: was oklch(99.3% 0.005 88). Now oklch(100% 0 0), pure white. White surfaces on dirty-white paper give the layers a clean step.
- `paper-2` and `paper-3` are re-stepped against the new paper. The browser theme colour and the PWA manifest colour now match it.
