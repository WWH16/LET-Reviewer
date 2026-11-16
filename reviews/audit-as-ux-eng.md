# UX Audit: Profile avatar (uncommitted work) and a move to DiceBear Avataaars

**Perspective**: UX Engineer
**Date**: 2026-11-16
**Plan**: The uncommitted profile work (`src/ui/Avatar.tsx`, `src/features/settings/ProfileEditor.tsx`, `src/features/home/Welcome.tsx`, `App.tsx`, `Home.tsx`, `Settings.tsx`, `app.css`), plus the proposal to draw avatars with https://www.dicebear.com/styles/avataaars/

## Plan Summary

On first launch, a Welcome screen asks for a name and an avatar before the app opens. The avatar then shows in the header (where it replaces the word "Settings"), on Home next to "Today, <name>", and in a Profile section at the top of Settings. Today the avatar comes from three line-drawn DiceBear styles shown in grayscale. The proposal is to use Avataaars, a full-colour cartoon style with many more parts.

### What Avataaars actually offers (from `@dicebear/avataaars@9.4.3`)

| Kind | Options |
|---|---|
| Parts (enum) | `top` (34 options, including hijab, turban, hats; `topProbability` lets it be bald), `accessories` (7 options, glasses or eyepatch, optional), `facialHair` (5, optional), `eyebrows` (13), `eyes` (12), `mouth` (12), `clothing` (9), `clothingGraphic` (10), `style` (circle/default), plus single-value `base` and `nose` |
| Colours (hex lists) | `skinColor` (7), `hairColor` (10), `facialHairColor` (10), `clothesColor` (14), `hatColor` (15), `accessoriesColor` (15), `backgroundColor` (default `65c9ff` blue) |
| Licence | The art is "free for personal and commercial use" (Pablo Stanley). The code is MIT. Attribution is not required, but a credit line is courteous. |
| Version | The DiceBear website now documents v10 (`@dicebear/styles`, core 10.7.0). This app uses v9 per-style packages. Install `@dicebear/avataaars@^9.4.3` to match `@dicebear/core@^9.4.3`, and do not mix majors. |

The three styles used now are line art with very few colour options. Avataaars is different: who you are comes mostly from **skin tone and hair colour**. That changes what the editor must offer, as the findings below show.

## User Journey Map

1. **Trigger: the app opens for the first time.** Welcome blocks the shell. OK.
2. **Trigger: an existing user updates the app.** `getSettings` merges `DEFAULT_SETTINGS`, so `onboarded` is `false`. A returning user who already has a question bank sees "Welcome to LET Reviewer" as if they were new. WARN.
3. **Type a name.** Each keystroke saves, and the name is optional. OK.
4. **Pick "Start from: Girl / Boy".** The labels are for children, but these users are adult teacher candidates. The binary choice is also the first thing asked about identity. WARN.
5. **Pick a drawing style** (Sketch / Portrait / Doodle). The choice resets every part already customized, with no warning and no undo. FAIL.
6. **Open "Change hair, eyes and other parts".** Each part is stepped through with ‹ ›, and the counter shows "3 of 34" with no name and no preview of the options. With Avataaars, `top` alone takes up to 34 clicks to see every option. WARN.
7. **The first ‹ or › on a part that is still "Default".** The seed already picked one variant. If that variant is `choices[0]`, the face does not change, and the click looks broken. WARN.
8. **Choose a skin tone or hair colour.** This is not offered. `avatarParts()` reads only `items.enum`, so Avataaars colour options (`items.pattern`) are dropped. The `.avatar { filter: grayscale(1) }` rule would hide them anyway. FAIL (for Avataaars).
9. **Press Shuffle or "Back to default".** All custom parts are replaced at once, with no undo. WARN.
10. **Press "Start reviewing".** Home opens with FirstRun ("Add your first questions"). OK.
11. **Later: find Settings.** The header link now shows the avatar and the name, and the word "Settings" is screen-reader-only. Sighted users must guess that their own name opens Settings. WARN.
12. **Feedback after a change.** The large avatar redraws at once, so the edit is visible. OK. The live counters say "3 of 34" without the part name. WARN (screen reader).

## Verdict: APPROVE WITH CHANGES

The flow is short and saves as you go, which is good. Two gaps block an Avataaars switch: there are no colour choices (skin tone matters most for a colour cartoon style), and the grayscale filter would cancel the reason for choosing Avataaars. One gap hurts today with any style: customizations are wiped silently.

## Critical Issues (Must Fix)

| # | Issue | Step in Journey | Impact on User | Fix |
|---|-------|----------------|----------------|-----|
| 1 | Colour options are never offered: `avatarParts()` keeps only `items.enum` keys, so `skinColor`, `hairColor`, and the other colour lists disappear | 8 | With Avataaars, a user cannot make the face look like them. Skin tone is decided by the seed. This is a representation problem, not cosmetic. | Read colour keys too (items with `pattern`, choices = `schema[key].default`). Show them as swatch radio groups (radio buttons with a visible colour and an `aria-label` such as "Skin tone 3"). Put **Skin tone** and **Hair colour** at the top level, not inside `<details>`. |
| 2 | `.avatar { filter: grayscale(1) }` plus the white `--print-paper` disc | 8, all views | Avataaars in grayscale looks muddy, and skin tones turn into the same grey. | Remove the grayscale filter for Avataaars, or for all styles if Avataaars replaces them. Pass `backgroundColor: ['transparent']` (or a paper tone) so the default `65c9ff` blue disc does not clash with the monochrome palette. The ring stays. |
| 3 | Changing the style or base runs `avatarParts: {}`, and nothing warns about it or can undo it | 5 | A user customizes hair, eyes, and glasses, then taps another style "to see". All of the work is gone. | With Avataaars as the only style, the style picker goes away and so does the problem. Otherwise store parts per style (`avatarParts[style]`) so switching back restores them. Also announce "Parts reset. Undo" through `useAnnounce` with an undo action. |

## Recommendations

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | The ‹ › stepper with unnamed "3 of 34" | Browsing 34 tops, 13 eyebrows, and 12 eyes one at a time is slow. The user cannot see what the next option is. | Show a thumbnail grid per part: a small avatar drawn with that one variant, used as radio options. Group the parts in tabs or sections: Face (eyes, eyebrows, mouth), Hair (top, hair colour, facial hair), Extras (accessories, clothing). Keep the stepper only for keyboard users who want it, or rely on the arrow keys of the radio group. |
| 2 | Curate the part lists for Avataaars | `mouth: vomit, screamOpen`, `eyes: xDizzy, cry, hearts`, `accessories: eyepatch`, and `clothingGraphic: skull, resist` are odd for a study profile and add choices nobody needs. `style` would appear as a part called "Style" next to "Drawing style". `clothingGraphic` cannot be seen at 24 to 40 px. | Keep an allow-list per part, or a deny-list: hide `style`, `clothingGraphic`, and the extreme eyes and mouths. Set `style: ['circle']` in code. Fewer choices are faster to scan. |
| 3 | "Girl / Boy" base | It sounds juvenile for adult examinees and frames identity as a binary choice. | Avataaars does not need a gender base: hair, facial hair, and clothing cover it. Replace the choice with 4 to 6 ready-made starting faces ("Pick a starting face") that differ in skin tone and hair. Then refine the parts. |
| 4 | A returning user sees Welcome after the update | It is confusing ("Did I lose my data?") and one more step before studying. | In `getSettings`, if no stored `onboarded` key exists but stored settings exist, treat it as `true`. Or change the copy for this case to "Add your name and avatar" with a "Skip" button. |
| 5 | The header link replaces the word "Settings" with the name | The Settings link is harder to find for sighted users who already know where Settings is. | Keep the name and avatar and add a small gear icon or the text "Settings" beside them. Or put a `title` on the link and add the avatar to the Command Menu result for "Settings". |
| 6 | Shuffle and "Back to default" have no undo | One tap loses a carefully built face. | Keep the previous `avatarParts` in memory, and show "Undo" next to the buttons for about 10 seconds, or announce it. Rename "Back to default" to "Reset parts" to say what it resets. |
| 7 | The first ‹ › may show no change | The click looks broken. | Resolve the seed's actual variant (render once, or start the index from the seeded pick) so "Default" shows the real option name. Or skip forward past the variant the seed already shows. |
| 8 | Live region text has no part name | Screen readers hear "3 of 34" without knowing which part. | Change the text to `Hair 3 of 34`. Or, with the thumbnail grid, use radio labels and remove `aria-live`. |

## Nice-to-Haves

| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Credit line in Settings → About: "Avatars: Avataaars by Pablo Stanley, drawn with DiceBear" | Courtesy credit for the artist. The style's licence allows use without it. |
| 2 | Use a different avatar expression on Home by state (`mouth: smile` when the due queue is empty, `default` otherwise) | It costs little and makes the Today card feel responsive. Use it only if it stays subtle. |
| 3 | Keep the editor inside `<details>` in Settings, but open it on Welcome | Progressive disclosure: in Settings the profile is rarely changed, and on Welcome it is the whole task. |
| 4 | Show the large preview sticky beside the parts on wide screens | The user sees each change without scrolling back up. |

## Interaction Consistency Check

- **Saves at once**: matches the rest of Settings (each `Select` and toggle saves immediately). Consistent.
- **Radio cards with `.avatar-pick`**: consistent with a native radio group, and the keyboard focus ring works. Consistent.
- **Destructive changes without confirmation**: elsewhere the app announces outcomes through `useAnnounce` (for example "Template A copied" and "Loaded N sample questions"). The profile editor resets parts silently. Deviates. Use the same announcer.
- **Blocking first-run screen**: the app's other first-run guidance (`FirstRun`) is inline and never blocks. Welcome is the only screen that blocks. That is acceptable for one time, but it is not acceptable for existing users (Recommendation 4).
- **Monochrome palette**: the current line styles fit it. Avataaars does not fit it unless the colour is kept inside the avatar disc. Decide this on purpose: the avatar becomes the one place with colour, which can work as the user's own mark.

## Verdict Details

- Discoverability: CONCERNS (Settings is hidden behind the name; skin tone and hair colour are absent)
- Flow Completeness: CONCERNS (colour choices are missing; returning users are sent back to Welcome)
- Error Recovery: CONCERNS (style or base switches, Shuffle, and reset wipe parts with no undo)
- Feedback & Status: PASS (the preview redraws at once), with a screen reader gap in the counters
- Consistency: CONCERNS (silent destructive changes; grayscale versus a colour style)
