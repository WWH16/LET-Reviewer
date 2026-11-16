# Layout audit: surfaces, sections and bento

**Date**: 2026-11-16
**Brief**: audit each screen's layout, cards and sections; use bento where it helps; nothing should feel flat.
**Locked**: the monochrome Kumo palette (black, white and greys only), the faces (Schibsted Grotesk, Instrument Sans, DM Mono) and the one inverted surface per screen. This is a layout and depth pass, not a restyle.

## What reads as flat today

The app has three surfaces: paper ground, white cards and Home's inverted Today card. Most screens use only the first:

| Screen | Now | Why it reads flat |
|---|---|---|
| Home | Bento already: the Today card on the left, tiles on the right, the streak below | The two stat tiles are glued as one `.stat-row`, and the streak runs full width, so the bottom half is one long band. |
| Progress | One rating card, then a bare table, a list card and a bare table, all on paper | The headline figure (accuracy by part) is a table row. Nothing on the screen is heavier than anything else. |
| Mock results | A bare score block, a card, a bare table and a long list | The score, the one fact you came for, sits on the ground with no surface. |
| Practice setup | Two small buttons, then a long form on paper | The two one-tap actions (Quick 10, Review) look like secondary buttons, not choices. |
| Mock setup | A list card, a form on paper, a list card | The form, the main job, has the least structure. |
| Settings | Five sections on paper, split by `<hr>` | Rules, not surfaces: every section weighs the same. |
| Edit question | Ten fields in one column on paper | No grouping, so the question, the key and the classification run together. |
| Bank, Import, Session, Mock exam, Print, Entry | Lists in cards; the question on paper with choices as cards; paper sheets | These hold up. A task screen should stay quiet, so they are left as they are. |

## Plan

### Surfaces: a ladder, not one card recipe

| Rung | Look | Used for |
|---|---|---|
| Ground | `--color-paper` | Page titles, task screens, the long checking list |
| Tile | `--color-card`, `--shadow-card`, `--radius-tile` (16px) | One bento block: one topic and its own heading |
| Action tile | A tile with `--shadow-raised`, plus press and hover states | A whole-tile choice (Quick 10, Review mistakes) |
| Well | `--color-paper-2`, no border or shadow, `--radius-control` | Secondary facts inside a tile (the floor warnings, time and pace) |
| Inverse | `--color-inverse` | **One per screen**, carrying its headline figure: Today (Home), the projected rating (Progress), the score (Mock results) |

The radius follows nesting: tile 16px, then well and controls 8px. Never a card inside a card: a list inside a tile loses its own surface.

### Bento per screen (desktop at 60rem and up; phones stack in reading order, with pairs side by side)

```
HOME (6 columns)                      PROGRESS (6 columns)
+-------------------+-------+         +-------------------------------+
| TODAY (inverse)   | exam  |         | PROJECTED RATING (inverse)    |
|  28 answered      +-------+         |  figure     | floor rules     |
|  [Quick 10] [...] |rating |         +---------------+---------------+
|                   +-------+         | Gen Ed  21%   | Prof Ed  --   |
|                   |backup |         | meter, weight | meter, weight |
+-------------------+-------+         +---------------+---------------+
| streak heatmap    |longest|         | weakest       | by sub-area   |
+-------------------+-------+         | topics        | table         |
                                      +---------------+---------------+
MOCK RESULTS (6 columns)
+-----------------+-----------------+  PRACTICE (measure)
| SCORE (inverse) | projected       |  +-------------+-------------+
|  4/25  16.0%    | rating          |  | Quick 10    | Review      |
|  below floor    +-----------------+  | 10 mixed    | 3 due       |
|  time well      | pacing table    |  +-------------+-------------+
+-----------------+-----------------+  | Drill by topic (tile, form)|
| Checking the paper (ground, at the reading measure)            |  +---------------------------+
```

- **Settings and Edit question**: stacked tiles, one per group (Profile, Exam, Display and keys, Backup, About; Question and choices, Key and status, Explanation, Filed under). They replace the rules.
- **Mock setup**: the New exam form becomes a tile between the two list cards.

### Review against the brief

The default this could slide into is the SaaS card kit: identical rounded cards with the same shadow, in a uniform grid. What prevents it:
1. **Tiles differ in weight.** One inverse mass per screen holds the figure the screen exists for, the tiles around it are white, and secondary facts sit in flat wells.
2. **Spans follow the content**, not a fixed grid: Today is four columns and three rows; Exam is two columns.
3. **Not everything becomes a tile.** Task screens (Session, Mock exam) and the checking list stay on the ground.
4. **No new decoration**: no gradients, glows or colour. Depth comes only from the lightness steps and shadows the system already has, plus one deeper shadow for action tiles.

## Outcome (applied)

- **Surfaces**:
  - New tokens: `--radius-tile` (16px; 22px with squircle corners) and `--shadow-raised`.
  - New classes: `.tile`, `.tile-inverse`, `.tile-action`, `.tile-quiet`, `.well` and `.option`.
  - The inverse flips now live in one place, shared by `.tray` and `.tile-inverse`.
  - A list inside a tile gives up its own surface, and page-level lists take the tile radius.
  - The rating warnings are wells instead of ruled lines.
- **Bento grid** (`.bento`): two columns on phones, with `.pair` for side-by-side blocks; six columns from 60rem, with `.span-2`, `.span-3`, `.span-4` and `.rows-2`.
- **Home**: Today is the four-column mass. The exam and longest-streak figures pair up at the top right, over the rating and the backup note, and the activity grid runs the full width.
- **Progress** (now wide):
  - The projected rating is the inverse banner, with the figure on the left and the floor warnings in a well on the right.
  - Each part is a tile: its accuracy as the figure, a meter, its weight, then its sub-areas. This replaces the separate By part and By sub-area tables.
  - Weakest topics is a full-width tile whose rows put the actions on the right.
- **Mock results** (now wide):
  - The score is the inverse tile, two rows tall, with the time in a well.
  - The rating, now including where it is projected from, and the pacing sit beside it.
  - The checking list stays on the ground at the reading measure.
- **Practice**: Quick 10 is a raised action tile. Review mistakes is a raised tile when something is due, and a flat grey tile when nothing is. The drill form is a tile.
- **Mock setup**: the form is a tile, and Digital or Printed paper is a pair of option cards, each with a sentence.
- **Settings** and **Edit question**: stacked tiles, one per group. The `<hr>` rules are gone.
- **Left as they were**: Bank, Import, Session, Mock exam, Print and Entry. They are task screens, already set in list cards or on paper.
- **Checked**: at 375 and 1280px wide, plus dark mode on Results and Home. Nothing overflows; lint reports 0 FAIL and 0 WARN; all 80 tests pass, including the contrast test.
