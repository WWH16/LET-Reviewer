# Plan: rebuild LET Reviewer on the Pocket Prep model

**Date**: 2026-11-16
**Reference**: the Pocket Prep NCLEX-RN App Store screenshots (the Study home, the quiz, Stats and Review), the Pocket Prep Fitness walkthrough on ScreensDesign, and pocketprep.com.
**What we take**: its structure, flows, layouts and visual language.
**What we do not take**: its name, logo, mascot, illustrations or exact brand colours. The app keeps its own name and avatar, and a palette from the same family, so it is never mistaken for Pocket Prep.
**What changes in our system**: the monochrome look goes. The user asked for Pocket Prep's styling, which is colour-coded (green right, red wrong, amber flag, blue actions). The faces stay (Schibsted Grotesk and Instrument Sans).

## What Pocket Prep does that we will copy

| Pocket Prep | What it looks like | Ours today |
|---|---|---|
| **Study** home | A greeting ("Good evening"), a week-strip calendar with streak dots, then **Quiz modes** as one list: an icon, a name, a line of text and a chevron per row. | Home (bento), Practice and Mock are three places to start. |
| **Quiz** | A segmented progress bar on top, a close ✕, "Question 5 / 10", a bold question, choices as outlined rows, a green ring and ✓ for right, a red ring and ✕ for wrong, and a blue "Show explanation" link. | Session: monochrome rings. |
| **Quiz results** | The score, then the questions filtered by Correct, Incorrect and Flagged. | The Session results list. |
| **Stats** | A navy header with a **ring gauge** (84%), "840 / 1000 answered correctly", then white cards: Study progress, then **Subject scores** with a bar per subject (green high, amber middle, red low). | Progress (bento). |
| **Review** | Tabs with counts (All 1000, Flagged 13, Incorrect 160, Correct 840), search, then cards: the subject in small type, the question in bold, and a status icon. | Bank lists every question you have, not what you answered. |
| **Mock exam** | A quiz mode with a timer. | Mock setup, exam, print, entry and results. |

## New structure

**Tabs: Study, Stats, Review, Settings.** On phones they sit in the bottom bar; on laptops, in the side menu.

| Ours now | Becomes | Route |
|---|---|---|
| Home `/` | **Study**: the greeting, the week strip, the exam countdown and the quiz-mode list | `/` |
| Practice `/drill` | The **Build your own** mode (the topic drill form) | `/drill` (kept) |
| Mock `/mock` | The **Mock exam** mode | `/mock` (kept) |
| Progress `/progress` | **Stats** | `/progress` (kept) |
| Bank `/bank` | **Review**: answered questions with filters; your whole bank sits under an "All questions" filter, with **Import** in its header | `/bank` (kept) |
| Settings | **Settings**, now a tab | `/settings` |

No route is removed. Only the tab labels, the icons and what each screen leads with change.

### Quiz modes on Study (each one is a row)

| Mode | What it does | Logic |
|---|---|---|
| Question of the Day | One question, the same one all day | **New**, small: a pick seeded by the date from gradable questions |
| Quick 10 | Due reviews first, then a random mix | Exists (`mode=quick`) |
| Missed questions | Your wrong answers that are due | Exists (`/review`) |
| Weakest subject | 10 questions from your weakest topic | Exists (`weakestTopics` and `drillUrl`) |
| Timed quiz | 10 questions with LET pacing | **New**, small: the Session with a countdown (`mode=timed`) |
| Build your own | Pick a part, sub-area, topic and count | Exists (DrillSetup) |
| Mock exam | A full or short timed exam, on screen or printed | Exists (MockSetup) |

## Look (our palette, in Pocket Prep's family)

| Role | Token | Value |
|---|---|---|
| Ground | `--color-paper` | `#F3F5F9`, a cool light grey |
| Surface | `--color-card` | `#FFFFFF`, with a 1px `#E3E8EF` border and a soft shadow |
| Ink and header blocks | `--color-ink`, `--color-navy` | `#16233A` |
| Action | `--color-accent` | `#2F6FED` (links, primary buttons, the current tab) |
| Right | `--color-success` | `#1E9E6A` |
| Wrong | `--color-error` | `#D64545` |
| Flag and middle scores | `--color-warning` | `#E09B1A` |

- **Mode icons**: each sits in a 36px rounded square with a soft tint of its own colour. This is the one place colour is decorative.
- **Radius**: cards 12px, controls 8px. Header blocks are navy with white text: one per screen, the Stats gauge or the quiz top bar.
- **Dark mode**: a navy ground (`#0E1726`), cards one step lighter, and the same green, red and amber, lightened for contrast.
- `contrast.test.ts` is updated to the new pairs and stays the gate.

## Wireframes (phone)

```
STUDY                         QUIZ                         STATS
+-------------------------+   +-------------------------+   +-------------------------+
| Good evening, Ana   (o) |   |== == == ## -- -- -- -- |   | ####### navy ########## |
| Mo Tu We Th Fr Sa Su    |   | x      Question 5 / 10  |   |      .-~~~~~-.          |
|  o  o  @  .  .  .  .    |   | Which law ...?          |   |     (  62.4%  )  rating |
| LET in 42 days          |   | +---------------------+ |   |      '-.___.-'          |
|                         |   | | RA 4670             | |   |  412 / 660 correct      |
| Quiz modes              |   | +---------------------+ |   | ######################## |
| [*] Question of the Day>|   | | RA 7836         ok  | |   | Subject scores          |
| [*] Quick 10           >|   | | Show explanation v  | |   | Gen Ed      ======  58% |
| [*] Missed questions 3 >|   | +---------------------+ |   | Prof Ed     ====    41% |
| [*] Weakest subject    >|   | | RA 9155          x  | |   | ...                     |
| [*] Timed quiz         >|   | +---------------------+ |   +-------------------------+
| [*] Build your own     >|   |              [ Next ]   |
| [*] Mock exam          >|   +-------------------------+   REVIEW
+-------------------------+                                 All 44 | Flagged 0 | Incorrect 9 | Correct 19
```

## Files

| File | Change |
|---|---|
| `src/ui/tokens.css` | New palette (light and dark); the monochrome notes go |
| `src/ui/app.css` | Restyle surfaces, the choices (green and red), buttons (blue primary), the tab bar and side menu, plus the new mode list, week strip, ring gauge, segmented progress bar and review tabs. The bento rules go where screens stop using them. The Hallmark stamp is rewritten. |
| `src/ui/contrast.test.ts` | New pairs |
| `src/ui/Icon.tsx` | Icons for the modes and the tabs (Phosphor, already installed) |
| `src/app/App.tsx` | Tabs become Study, Stats, Review and Settings |
| `src/features/home/Home.tsx` | Becomes Study: the greeting, the week strip and the mode list. The bento and RatingCard leave Home. |
| `src/features/home/StreakCard.tsx` | Becomes a week strip, with the full activity grid moving to Stats |
| `src/features/practice/Session.tsx` | The quiz look: segmented bar, ✕, "Question n / N", show-explanation. Adds the `qotd` and `timed` modes. |
| `src/ui/ChoiceGroup.tsx` | Green and red states with icons (CSS mostly) |
| `src/features/progress/Progress.tsx` | Becomes Stats: the navy gauge header, subject-score cards, weakest topics, the activity grid |
| `src/features/bank/Bank.tsx` | Becomes Review: the All, Flagged, Incorrect, Correct and Unanswered tabs with counts (from each question's latest attempt), search, status icons and Import in the header |
| `src/features/practice/DrillSetup.tsx`, `src/features/mock/*` | Restyled only; the logic is unchanged |
| `src/domain/*` | `questionOfTheDay(date, questions)` and the last-attempt status per question, each with a test |

## Order of work

1. Tokens, surfaces, buttons and choices: the whole app turns over at once.
2. The tabs and the Study home with the mode list.
3. The quiz look, Question of the Day and the Timed quiz.
4. Stats.
5. Review.
6. Mock screens, Settings and the empty states.
7. Lint, tests (contrast included) and a browser pass at 375 and 1280px, light and dark.

Each step is checked in the browser before the next one.

## Outcome (built)

All seven steps are done. Lint reports **0 FAIL, 0 WARN** across 40 files, and **84 tests pass**, including the contrast test and new tests for Question of the Day and each question's latest result.

- **Palette**:
  - The new light and dark palette is in `tokens.css`, written in OKLCH with contrast tuned per pair, plus tinted tones for the mode icons.
  - The answer states pick up green and red through the existing state tokens.
- **Tabs**: Study, Stats, Review and Settings. A tab stays lit on the screens it leads to: Study on a quiz, Build your own and Mock exam; Review on an edit or an import. The header's separate Settings link is gone.
- **Study**:
  - Opens with a greeting (with the name and avatar), the exam countdown, and a week strip with streak dots.
  - When an exam is open, a navy "continue" card sits under the greeting, and the backup note follows when one is due.
  - Then seven quiz modes in one list, each with a tinted icon, a name, a line of text and a chevron. Missed questions shows a red count badge.
- **Quiz**:
  - A navy bar with one segment per question (green right, red wrong, white the current one), ✕ to end, and "Question n / N".
  - The **Timed quiz** clock counts down at the LET's pace per item and turns amber in the last minute.
  - **Question of the Day** is new: one gradable question per day, picked from the date.
  - Results show the score as a percentage in a navy block.
- **Stats**:
  - A navy ring gauge for overall accuracy (green from 75%, amber from 50%, red under 50%), with the count answered correctly.
  - Then the projected rating, subject scores with coloured bars and sub-areas under a toggle, weakest topics, and the activity grid.
- **Review**:
  - Tabs with counts: All, Incorrect, Correct, Flagged, Not answered and To check.
  - Each question shows a status icon from its latest answer (`lastResults`).
  - Import and Copy photo prompt sit at the top.
- **Sub-screens**: Build your own (now only the topic form), Mock exam, Import, Edit question, Print and Entry have a "‹ Study", "‹ Review" or "‹ Mock exam" link above their title.
- **Selections** are blue, and label toggles draw their own chevron.
- The Hallmark stamp, `btn.ts` and the comments describe the new system.
