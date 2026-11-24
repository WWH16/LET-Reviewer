# Hallmark audit: every screen after the quizzes rework (2026-11-24)

Scope: app screens, genre modern-minimal (from the stamp), depth asked for: polish plus removal of what the
rework left behind. Screenshots: preview pane at 1280 x 860 with the sample questions, sample answers and one
test mock (sloplint's headless profile only renders the Welcome screen).

## The read

- **For:** one LET taker making quizzes by subject and topic with Claude, retaking them, and sitting part mocks.
- **Works and stays:** the yellow-block signature per screen, the bento on Study and Stats, the quiz bar,
  the booklet and bubble sheet, the subject breakdown on mock results, the nested Subjects editor.
- **Reads as generated:** repeated primary buttons down a list (Missed questions, a subject's quizzes),
  a link that underlines its whole two-line row, headings that repeat the page title.
- **Broken:** nothing functional. The CSS stamp still describes the old app (four tabs, a Review rail, a
  Quick 10 tile), and several pieces only made sense with the question bank.

`sloplint src --scope app`: **0 FAIL, 0 WARN** (12 waived, 4 answered, 3 dismissed, all still true).

## Findings by screen

| Screen | Finding | Tier | Where |
| --- | --- | --- | --- |
| Shell | Stamp describes four tabs, the Review rail, Quick 10 on butter | Floor 20 (stale) | `src/ui/app.css:1-3` |
| Shell | Old-route redirects `/review` and `/bank/*` kept for links nothing makes anymore | leftover | `src/app/App.tsx` |
| Shell | Dead styles: `.top-settings`, `.bank-layout`, `.bank-rail`, `.bank-filters`, `.review-tabs`, `.review-status.is-flag`, `.review-status.is-new`, `.profile-summary` | leftover | `src/ui/app.css` |
| Shell | 9 icons no screen uses: arrow, home, progress, bank, sun, sliders, printer, key, copy | leftover | `src/ui/Icon.tsx` |
| Welcome | "add your first questions" (questions now come from a quiz) | copy | `src/features/home/Welcome.tsx:11` |
| Quizzes | A New quiz button on every subject row, beside the one on top | F4, density | `src/features/quizzes/Quizzes.tsx` |
| Quizzes | Each row underlines its name and its meta line | Finish | `src/features/quizzes/Quizzes.tsx` |
| Subject | Take is a primary button on every row; Questions repeats the row's own link | F4 | `src/features/quizzes/Subject.tsx` |
| Missed | Review is a primary button on every row; Major's heading lacks the major's name | F4 | `src/features/practice/Missed.tsx` |
| Mock setup | Back link to Study on a screen the sidebar now holds; title "Mock exam" vs nav "Mock exams" | leftover | `src/features/mock/MockSetup.tsx` |
| Mock results | Retake shows a checkbox list for a single subject | density | `src/features/mock/MockResults.tsx` |
| Stats | Disclosure still says "Sub-areas"; "Copy my weak topics" was for pasting into Claude, now each topic has New quiz | leftover | `src/features/progress/Progress.tsx:102,150` |
| Settings | Profile repeats the avatar and name above the editor; Exam, Account and About repeat the page title as the tile heading | leftover | `Settings.tsx`, `AccountSection.tsx` |
| Domain | `longestStreak` is only used by its test; `weakTopicsText` goes with the copy button | leftover | `src/domain/dates.ts`, `scoring.ts` |
| States (dev) | Chips "Review center" and "AI" show labels the app no longer has | leftover | `src/features/states/States.tsx:70` |

Lightest depth that settles all of it: **polish** plus removals. Nothing here asks for a new composition.

## Plan (one commit per step)

- **Files** · edit: App.tsx, app.css, Icon.tsx, Welcome.tsx, Quizzes.tsx, Subject.tsx, Missed.tsx, MockSetup.tsx,
  MockResults.tsx, Progress.tsx, scoring.ts, dates.ts, domain.test.ts, Settings.tsx, AccountSection.tsx, States.tsx
  · create: none · **delete: no files; two routes (`/review`, `/bank/*` redirects)**
- **Keeps** · every link, field and handler a screen still uses · the palette, faces and bento

1. Shell: drop the two redirects, the dead styles and the unused icons; restamp the CSS for the app as it is.
2. Welcome: say "make your first quiz".
3. Quizzes: one New quiz on top; rows as plain list links.
4. Subject: Take as secondary; drop Questions (the row opens the quiz).
5. Missed questions: Review as secondary; Major heading with the major's name.
6. Mock setup: drop the back link; title "Mock exams".
7. Mock results: no checkbox for a one-subject retake.
8. Stats: "Subjects" for the disclosure; drop Copy my weak topics and `weakTopicsText`.
9. Settings: drop the repeated profile row and the repeated headings.
10. Leftovers: drop `longestStreak` and its test, and the stale chips on the dev States page.

## Outcome

All ten steps applied, one commit each (71f5e04 to f17a3a2). Step 10 also trimmed `src/ui/Chip.tsx` to the
plain chip it still uses and dropped `.chip-accent`, which the plan's Files row did not name.

- **After** · `sloplint src --scope app`: 0 FAIL, 0 WARN · typecheck and build pass · tests pass except
  `sync/boundary.test.ts` ("is off when the env is missing"), which fails before and after because a local
  Supabase `.env` is present.
- **Dropped** · the `/review` and `/bank/*` redirects, the bank and review styles, nine icons, the Questions
  button on quiz rows, the repeated New quiz and profile row, four repeated headings, Copy my weak topics with
  `weakTopicsText`, `longestStreak`.
- **Checked** · every screen renders in the preview with sample data; no console errors.
