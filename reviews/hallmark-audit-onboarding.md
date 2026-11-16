# Hallmark audit: onboarding (Welcome screen)

**Date**: 2026-11-16
**Target**: `/` while `settings.onboarded` is false. That route renders `src/features/home/Welcome.tsx`, which uses `src/features/settings/ProfileEditor.tsx` and `src/ui/Avatar.tsx`, styled by `src/ui/app.css`.
**Scope**: app screen (the existing stamp says `shape: app screen · genre: modern-minimal`). The linter ran with `--scope app`.
**How it was checked**: sloplint ran on the static code. Its render tier did not run, because puppeteer-core is not installed. Instead, the screen was measured in the browser pane at 375 x 812, 768 x 1024 and 1280 x 800, starting from a clean database. No project files were changed.

## The read

- **What it is for**: a new reviewer types a name and makes an avatar, then presses **Start reviewing**. Finishing is the one action.
- **What works and stays**:
  - The large avatar is the object people will remember from this screen.
  - Every change saves at once, so leaving halfway loses nothing.
  - Skin tone and hair colour are native radio groups, so the arrow keys work.
  - Nothing scrolls sideways at 375px (`scrollWidth` equals 375).
  - The face and the fields sit side by side from 768px.
  - Pressing Enter in the name field finishes onboarding, which is a quick exit for keyboard users.
- **What reads as generated**: little. Two glyph arrows (‹ ›) are used as button labels, and one colour value bypasses the tokens.
- **What is broken**:
  - On a phone, the finish button is below the first screen. On desktop, it is stranded under the avatar column.
  - Several controls are smaller than the 44px hit target that the app's own buttons keep.
  - The part steppers show "7 of 34" with no way to preview the options.

## Responsiveness: measurements

| Viewport | Name field top | Start reviewing top | Page height | Notes |
|---|---|---|---|---|
| 375 x 812 | 466px | **838px (below the screen)** | 994px, or 1462px with the parts open | Avatar 208px; ‹ › buttons **29px wide**; swatches 32px; `<summary>` **20px tall** |
| 768 x 1024 | 115px (right column) | 509px | 1024px | Two columns: face at x 56, fields at x 336 to 752 |
| 1280 x 800 | 142px (right column) | 544px, **at x 400, under the face** | 800px | `main` is capped at 768px; fields at x 704 to 1120 |

## Findings by tier

### Floor (must fix)

| Gate | Where | Finding | Fix |
|---|---|---|---|
| 48 | `src/ui/app.css:313` | `.swatch` ring uses the literal `rgb(0 0 0 / 0.15)` | Use `--color-line` (already used for the `.avatar` ring), or add a `--swatch-edge` token in `tokens.css` |
| 63 | `src/features/settings/ProfileEditor.tsx:101,106` | The ‹ and › glyphs are the visible button labels | Add `CaretLeftIcon` and `CaretRightIcon` from `@phosphor-icons/react` to `src/ui/Icon.tsx`. Keep the `aria-label`s. |

### Reflex (fix, or waive with a reason)

| # | Where | Finding | Fix |
|---|---|---|---|
| R1 | `Welcome.tsx:23-27`, `app.css` `.profile-face .avatar` | **Phone: the finish action is off screen.** The 208px avatar and the Shuffle row push the name field to the middle of the screen and Start reviewing below the bottom edge. Opening the parts section pushes it about 650px further. A new user cannot see how the step ends. | Under 48rem, shrink the face to about 8rem and put the Shuffle and Back to default buttons beside it rather than below it. Or keep the form tall and make the action bar sticky (`position: sticky; bottom: 0` on the submit wrapper, over a `--color-paper` band, with `--safe-bottom` padding). Sticky keeps the action one tap away while people customize. |
| R2 | `Welcome.tsx:23-27` | **Desktop: the action is on the wrong side.** Reading order ends at the bottom of the right column (the parts section), but Start reviewing sits at the bottom left under the avatar, about 300px away from the last field. | Render the button inside `.profile-fields`: let `ProfileEditor` take a `footer` child, or move the submit below the fields with `.profile-fields` as its container. On a phone, that also puts it right after the last field. |
| R3 | `ProfileEditor.tsx:101,106`, `app.css` `.avatar-parts li` | ‹ › buttons are 29 x 44px. **App screens need 44px hit targets**, and the page's other buttons have them. | `min-inline-size: 44px` on `.avatar-parts button`. The grid column (`auto`) grows with it. At 375px there is room: the counter column is 136px and can shrink to 7rem. |
| R4 | `app.css:309-315` `.swatch` | Swatches are 32px with no hit slop, so a thumb easily lands on the neighbour, especially in the 8-colour hair row. | Keep the 32px disc but give the label 6px of padding (`padding: 6px; background-clip: content-box`). Or make it 40px under `(pointer: coarse)`. Gap 4px. |
| R5 | `ProfileEditor.tsx:91` `<summary>` | "Change hair, eyes and other parts" is a 20px-tall target. It is the only way into most of the editor. | `min-block-size: 44px; display: flex; align-items: center` on `.profile summary`. |
| R6 | `ProfileEditor.tsx:96-109` | **"Hair 7 of 34" cannot be browsed.** The user has to press › up to 33 times and watch the large preview to compare options. This is the slowest part of onboarding. | Show a strip of thumbnails per part: radio cards drawn with `<Avatar size={48}>` that change only that part, in a horizontally scrolling row (`overflow-x: auto; scroll-snap-type: x mandatory`). The ‹ › stepper goes away. The pattern already exists in the Woman/Man picker, so this reuses the `.avatar-pick` style. |

### Finish (answer, never blocks)

| # | Where | Finding | Suggestion |
|---|---|---|---|
| F1 | `ProfileEditor.tsx:59-60` | The name field has no hint. The user doesn't know where the name appears. | Add "Shown on Home and in the top bar." as `aria-describedby` muted text. Add `maxLength={40}`: the header link (`app.css:211`, `white-space: nowrap`, no truncation) is likely to push the bar sideways on a phone with a long name (found by reading the code; not rendered). |
| F2 | `ProfileEditor.tsx:67-79` | The unselected Woman/Man option has no outline, only the selected one gets a card. It looks like a picture, not a choice. | A hairline ring (`box-shadow: 0 0 0 1px var(--color-line)`) on `.avatar-pick` at rest. The checked state keeps the card. |
| F3 | `ProfileEditor.tsx:55` | On a first visit, Back to default shows as a disabled grey word that does nothing. | Render it only when `Object.keys(s.avatarParts).length` is non-zero, so the Shuffle row starts with one button. |
| F4 | `Welcome.tsx:9-10` | The page heading and the lead are generic: "Welcome to LET Reviewer" over a muted line. This screen has no sense of what the app does. | Change the lead to name the outcome, from the app's own facts: "Set your name and avatar, then add your first questions." It is still one sentence. Leave the heading as it is. |
| F5 | `Welcome.tsx` | **Returning users** (with a question bank from before this update) see this screen, because `onboarded` defaults to false (from the previous UX audit). | In `getSettings`, treat stored settings without an `onboarded` key as onboarded. |
| F6 | `ProfileEditor.tsx:44-49` | Shuffle has no undo, and one tap replaces a face the user built carefully (from the previous UX audit). | Keep the previous parts in `useState`, and show **Undo** in the Shuffle row for 10 seconds. |
| F7 | dark mode | Not verified. A fresh profile renders light even when the browser prefers dark, because the app's own theme setting wins. | Check after onboarding with Theme set to Dark. |

## Depth

A **polish** settles all of the Floor and Reflex findings except R6. The changes are tokens, hit targets, the icon, sticky or reordered actions, and the summary size, all inside the existing system and layout. **R6** (thumbnail strips) is a small component change in `ProfileEditor.tsx`, not a redesign. No restyle or full redesign is needed: the screen's system and composition are sound, and the issues are reach and order.

## Outcome (2026-11-16, applied)

All findings were fixed, and sloplint reports **0 FAIL**.

- **48**: the swatch ring now uses `--color-line`.
- **63** and **R3**: the ‹ › steppers were removed. R6 replaces them.
- **R1** and **R2**: Start reviewing is now the footer of the fields column (`ProfileEditor`'s `footer` prop). Below 48rem it stays pinned to the bottom of the screen (`.welcome-action`). At 375 x 812 it sits at y 756 to 800, inside the screen. At 1280 it sits under the fields at x 704.
- **R4**: each swatch is a 32px disc inside a 40px target, and the 8 hair colours still fit on one row at 375px.
- **R5**: the summary is 44px tall.
- **R6**:
  - Each part is now a sideways-scrolling row of 56px faces. Eyes, eyebrows, mouth, glasses and facial hair are zoomed in on the face.
  - The rows are drawn only while the section is open. Opening it scrolls each row to the chosen option.
  - The thumbnails share the user's colours but not their other parts, and drawn faces are cached. A part change went from about 850ms to about 90ms.
  - The hidden radios are contained by `.part-strip { position: relative }`, which fixed a sideways overflow of 2361px.
- **F1**: the name field has a hint and a 40-character limit. The header name stops at 10rem with an ellipsis.
- **F2**: the Woman and Man options have a hairline ring at rest.
- **F3**: Back to default appears only when parts have been customized.
- **F4**: the lead now says what comes next.
- **F5**: stored settings without an `onboarded` value count as onboarded (`getSettings`).
- **F6**: Shuffle and Back to default use the app's existing Undo toast (`announce(message, undo)`: 10 seconds, and Ctrl+Z).
- **F7**: dark mode was checked in Settings and reads well.
