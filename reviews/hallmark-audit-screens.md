# Hallmark audit: every screen

**Date**: 2026-11-16
**Scope**: app screens (stamp: `shape: app screen · genre: modern-minimal · theme: Kumo components, monochrome`). The linter ran with `--scope app` on all 38 source files.
**How it was checked**:
- Static lint: **0 FAIL, 0 WARN**. There are 3 waivers on record (7b print ink), 3 answered checks (F4, F7, F7) and 1 dismissed check (41).
- The linter's render tier did not run, because puppeteer-core is not installed. Each route was measured and screenshotted in the browser pane at 375 x 812 and 1280 x 800, with data in place: the 16 sample questions plus clones, one practice session, and one submitted 25-item mock.
- No project files were changed.

## The read

- **What it is for**: a teacher candidate drills LET questions, takes timed mocks (on screen or on paper), and watches a projected rating. The daily job is "answer today's questions"; the weekly job is "sit a mock".
- **What works and stays**:
  - Nothing scrolls sideways on any route, at either width.
  - The Today card is the screen's anchor on Home.
  - Answer choices are proper radio groups. The screen reader name is "A. 1935"; the visible letter is `aria-hidden`.
  - Submitting a mock has a specific confirmation ("7 unanswered, 0 flagged"), and Restore backup asks before replacing data.
  - A crashed or closed mock comes back with a "restored, timer paused" note.
  - Errors are recoverable: a mock that is too long for the bank offers "Use 25 items".
  - Keyboard shortcuts are explained in place.
  - Loading shows a skeleton after 200ms.
- **What reads as generated**: almost nothing. The system is consistent: one card recipe, one primary per screen, sentence-case labels, no eyebrows.
- **What is broken or weak**:
  - **Phone**: table headings split in the middle of words on Progress.
  - **Practice setup**: the "All sub-areas" and "All topics" choices are drawn in placeholder grey, which looks disabled and fails contrast.
  - **Progress**: the weakest-topics list ends in "Copy prompt", with no way to practise the topic.
  - **Settings**: now opens on a 208px avatar, so the Exam settings that Home links to are below the first screen.

## Measurements (375 x 812)

| Screen | Route | Screens tall | Words | Under-size targets | Notes |
|---|---|---|---|---|---|
| Welcome | `/` (first run) | 1.2 | ~60 | 0 | Audited and fixed earlier |
| Home | `/` | 1.4 | 77 | 1: "Set your exam date" link, 132 x 22 | |
| Practice setup | `/drill` | 1.1 | 43 | 0 (the checkbox label wraps, 343 x 44) | Select values in grey |
| Session | `/session` | 1.0 | 91 | 0 | Eliminate buttons have an icon only |
| Session results | `/session` (end) | 1.0 | ~60 | 0 | |
| Mock setup | `/mock` | 1.3 | 75 | 0 | Defaults to 150 items with a 35-question bank |
| Mock exam | `/mock/:id` | 13.4 | 423 | 0 | All 25 items stacked (paper form; "One at a time" exists) |
| Mock print | `/mock/:id/print` | 14.3 | 2706 | 0 | Preview of the printed booklet |
| Mock entry | `/mock/:id/entry` | 1.0 | 62 | 1: "Whole sheet" summary, 343 x 20 | |
| Mock results | `/mock/:id/results` | 13.6 | 553 | 0 | |
| Progress | `/progress` | 2.1 | 161 | 0 | **Table headings split: "Weig / ht", "Answe / rs"** |
| Bank | `/bank` | 6.6 | 2788 | 0 | All 44 questions rendered at once |
| Import | `/bank/import` | 1.0 | 38 | 1: "Need new questions?" summary, 343 x 20 | |
| Edit question | `/bank/:id` | 1.9 | 37 | 0 | Choice inputs cut off long text |
| Settings | `/settings` | 2.7 | 125 | 0 | Profile fills the first screen |
| Not found | `*` | 1.0 | 10 | 0 | |
| States | `/states` | 3.2 | 196 | 0 | Developer gallery, linked from About |

At 1280 x 800, every screen holds its 768px measure: Home and Print use 1040px, centred in the area right of the sidebar. Nothing overflows. The only targets under 40px there are 36px Kumo buttons, which are fine for a mouse.

## Findings by screen

The tier follows Hallmark: **Floor** must be fixed; **Reflex** is fixed or waived with a reason; **Finish** is answered and never blocks. **Flow** marks a UX gap that no gate catches: a dead end, a wrong landing, or a missing next step.

### Home (`src/features/home/Home.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Flow | `Home.tsx:105` | "Set your exam date" goes to `/settings`. That page now opens on the Profile editor, so the exam date is about one and a half screens down, and the user has to hunt for it. | Link to Settings with `state: { focus: 'exam-date' }` and have Settings scroll to and focus `#set-exam`'s date field. Or put the date picker in the Home tile itself (a Kumo DatePicker popover). |
| Reflex | `Home.tsx:105` | The link is 22px tall, and it is the tile's only action. | Make the whole tile the link (`.stat-tile` as an `<a>` with min-block-size 44px), or put the link on its own line with padding. |

### Practice setup (`src/features/practice/DrillSetup.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex (contrast) | Sub-area and Topic selects | "All sub-areas" and "All topics" render as Kumo **placeholders** (oklch 70.8% on white, about 2.6:1). They are real choices, but they look disabled and fail the 4.5:1 text contrast. | Give "all" a real value (`'all'`) so it renders as a selected value in ink, and map it to `''` when building the URL. Or override the placeholder colour to `--color-muted` (49%, about 5.9:1). |
| Finish | `DrillSetup.tsx:155` | "Copy prompt" sits beside Start. It is a bank-building job on a practice screen, and the reason for it ("Choose a sub-area to copy a prompt") only shows when it is disabled. | Move it under the match count as a quiet link, "Need more on this topic? Copy a prompt for Claude", or leave it to Bank and Import. |
| Finish | Quick 10 and Review mistakes | Two buttons above the form have no heading or count. "Review mistakes" doesn't say how many are due. | Add the count ("Review mistakes, 3 due"), and disable it with a reason when nothing is due. |

### Session (`src/features/practice/Session.tsx`, `src/ui/ChoiceGroup.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex (discoverability) | `ChoiceGroup.tsx` eliminate button | The strike-through icon button beside each choice is explained only by `title` and `aria-label`. On touch devices there is no hover, and the keyboard hint (`Session.tsx:318`) is hidden on coarse pointers, so the feature is invisible on phones. | Add one line under the choices for coarse pointers: "Tap the strike button to cross out a choice you have ruled out." Or show the word "Cross out" beside the icon at 48rem and up. |
| Finish | Results | "2/3 correct, 67%" and the to-review list are clear. "Practice again" and "Home" are good exits. | Nothing to change. |

### Mock setup (`src/features/mock/MockSetup.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Flow | `MockSetup.tsx:34` | Length defaults to **Full: 150 items** even when the part has 35 questions, so the first thing a new user sees is a shortfall warning. "Use 25 items" recovers, but the default could avoid the problem. | Default `length` to the longest option the pool can fill (full, then half, then short). Keep the warning for when even Short can't be filled. |

### Mock exam (`src/features/mock/MockExam.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Finish | Bottom tab bar during an exam | The tab bar stays visible while the timer runs, so one tap on Home leaves the exam. State is saved and restored, but leaving by accident on a timed exam is still a scare. | Hide the tab bar on `/mock/:id` while the exam is in progress (the top bar keeps Submit), or confirm before leaving. |
| Finish | Phone, paper form | All 25 items are stacked (13 screens). "One at a time" exists in the top bar and in Settings. | Leave as is: it mirrors the paper booklet, which is the point. |

### Mock print and entry (`MockPrint.tsx`, `MockEntry.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex | `MockEntry.tsx:163` | The "Whole sheet" summary is 20px tall. | Use the 44px summary rule from `.profile summary` for every `summary` (move the rule to a plain `summary` selector). |
| Finish | Print | The A4 and margins advice sits above Print, which is right. The preview reads well on a phone. | Nothing to change. |

### Mock results (`src/features/mock/MockResults.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Finish | `MockResults.tsx:129` | The pacing table's "LET pace" column has no explanation. A first-time user won't know it means "where the real exam's clock would be at this item". | Add a caption under the Pacing heading: "LET pace is where you would be at the real exam's speed." |
| Finish | The "Projected LET rating" card | The same card appears on Home, Progress and Results. On Results it repeats the rating-floor warning that the score block already gives. | On Results, keep only the projected figure line and drop the repeated floor warning. |

### Progress (`src/features/progress/Progress.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| **Reflex (broken text)** | `app.css:928-930` | `table { overflow-wrap: anywhere }` in the phone query splits headings in the middle of words: "Weig / ht", "Answe / rs", "Accura / cy". | Scope the rule to cells: `td { overflow-wrap: anywhere }`, plus `th { overflow-wrap: normal; white-space: nowrap }`. The Part column has the slack to give. |
| **Flow** | `Progress.tsx:98-120` | **Weakest topics is a dead end.** Each row offers only "Copy prompt" (to make more questions). The obvious next step, practising that topic, is missing, even though `drillUrl` exists. | Make each row's primary action **Practice** (`drillUrl({ area, sub, topic })`), and demote Copy prompt to a quiet secondary action. |
| Finish | Weakest topics rows | On a phone, the "Copy prompt" button sits beside the name in some rows and wraps below it in others, so the rows don't line up. | Put the actions on their own line under the meta text, aligned the same in every row. |

### Bank (`src/features/bank/Bank.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex (labels) | `Bank.tsx:73` | "Copy Template A" is jargon. Nothing on Bank says what Template A is. The explanation lives on Home's first-run guide. | Rename it to what it does: "Copy photo prompt", with the hint "For turning a handout photo into questions with Claude." Keep "Template A" only in the prompt text itself. |
| Finish | List | All 44 questions render at once (6.6 screens, 2788 words). This is fine now, but a real bank of 1,500 will be slow and long. | Render the first 50 with a "Show 50 more" button, or virtualize later. Search and the filter chips already narrow the list. |

### Import (`src/features/bank/Import.tsx`, `PromptBuilder.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex | `PromptBuilder.tsx:30` | The summary is 20px tall (same fix as Mock entry). | Use the shared `summary` rule. |
| Finish | Empty state | The paste box and two buttons are clear, and the instructions are specific ("tap Copy on the code block"). | Nothing to change. |

### Edit question (`src/features/bank/EditQuestion.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| Reflex | `EditQuestion.tsx:74-76` | Choices A to D are single-line `<input type="text">`. Long choices (statute names, sentences) are cut off, so the user can't check the whole text they are fixing. | Use `<textarea rows={1}>` with `field-sizing: content` (it grows to fit; a fixed 2-row height is the fallback). |
| Reflex | `EditQuestion.tsx:69` | The stem textarea has a fixed small height. A four-sentence stem scrolls inside a box about 3 lines tall. | Add `field-sizing: content; min-block-size: 6lh` to `textarea.prose`. |
| Finish | `EditQuestion.tsx:57` | "AI-generated: AI from: The Teaching Profession notes". The label prefix repeats what the sample data's `sourceRef` already says. | Drop the prefix when `sourceRef` already names the source, or fix the sample data's `sourceRef`. |

### Settings (`src/features/settings/Settings.tsx`)

| Tier | Where | Finding | Fix |
|---|---|---|---|
| **Flow** | `Settings.tsx:75` Profile | The full avatar editor (a 208px face, then name, starting face, swatches and parts) now fills Settings' first screen and a half. People come to Settings for the exam date, theme or backup, and those are now all below it. | In Settings, show a compact profile row: a 56px avatar, the name, and an **Edit profile** disclosure that opens the editor in place. The Welcome screen keeps the full editor. |
| Finish | `Settings.tsx:207` | "Visual states" (the developer gallery at `/states`) is linked in About for every user. | Render it only when `import.meta.env.DEV` is true, or rename it to "Design reference" if it is meant to stay. |

### Not found

| Tier | Finding | Fix |
|---|---|---|
| Finish | "This page does not exist. Go to Home" is clear, and the shell stays. | Nothing to change. |

## Cross-screen

| Tier | Finding | Fix |
|---|---|---|
| Reflex | **Every `<summary>` except the profile one is 20px tall** (Import, Mock entry, Session's disclosure). | Move `.profile summary { min-block-size: 44px; display: flex; align-items: center }` to a plain `summary` selector in `app.css`. |
| Finish | The "Projected LET rating" card appears on three screens. | It belongs on Progress. On Home, keep the figure only; on Results, keep the line only. |
| Not checked | Dark mode was only checked on Settings. | Sweep Home's inverted Today card and the Progress bars in dark mode next time. |

## Depth

A **polish** settles everything here:
- the table heading wrap, the select contrast, the summary heights, the editor fields and the exam-date link target, which are CSS and single elements;
- the four Flow items, which are each a small change inside one component: a Practice action on weak topics, a compact profile row in Settings, the Mock default length, and a focus target for the exam-date link.

No restyle or full redesign is needed. The system is consistent across screens, and the gaps are next steps and landings, not looks.

## Outcome (2026-11-16, applied)

Every finding is fixed except the one changed on purpose (below). Lint reports **0 FAIL, 0 WARN** across 38 files, and all 80 tests pass. Each fix was checked in the browser at 375 x 812.

- **Progress**:
  - Column headings no longer split: `td` keeps `overflow-wrap: anywhere`, and `th[scope=col]` is `nowrap`. Each heading is now one 38px line.
  - Each weak topic leads with **Practice**, a drill of that topic: from review-center questions when the topic has any, else from the AI ones. **Copy prompt** sits beside it as a quiet button, and the hover-only `.row-action` rule is gone.
- **Practice setup**:
  - The shared `Select` passes `''` under a stand-in value, so "All sub-areas", "All topics" and "No key yet" are drawn in ink on every screen.
  - "Review mistakes" shows how many are due, or "No mistakes due for review."
  - Copy prompt moved under Start as "Need more questions here? Copy a prompt for Claude", shown once a sub-area is chosen.
- **Session**: the first question explains the strike (Eliminate) button, for touch and mouse alike.
- **Mock setup**: the length defaults to the longest one the bank can fill. With 35 questions, that is Short (25).
- **Mock exam**: the phone tab bar is hidden on `/mock/:id` (`.in-exam .nav`).
- **Mock results**:
  - The pacing table has a caption explaining LET pace.
  - `RatingCard` takes `warned`, so the results page does not repeat the floor warning for the part it just graded.
- **Bank**:
  - "Copy Template A" is now **Copy photo prompt** (`CopyPhotoPrompt`), and the first-run steps use the same words.
  - The 100-item cap gained a **Show N more** button, and the cap resets when the search or queue changes.
- **Edit question**:
  - The stem, explanation and choices grow with their text (`field-sizing: content`). Choices are one-row textareas where Enter still saves.
  - The source line reads "AI-generated from The Teaching Profession notes".
- **Settings**:
  - The profile folds to one row: the avatar, the name and "Edit name and avatar". On a phone, Exam now starts at y 274.
  - "Set your exam date", "Update it" and "Back up now" on Home carry `state.focus`, and Settings scrolls to and focuses that control.
  - "Visual states" shows only in development builds.
- **Home**: the exam-date link is a 44px target (`.stat-link`).
- **Disclosures**: `details > summary` is 44px everywhere; Import and Mock entry were checked at 44px.
- **Dark mode**: checked on Home (the inverted Today card) and Progress (the bars). Both read well.

**Changed on purpose**: the "Projected LET rating" card stays whole on Home. Home is the only place most people see the floor warning, so trimming it there would hide the rule. It is trimmed only on Results, where the score block already states it.
