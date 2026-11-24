# Yellow palette (60-30-10)

**Why:** the person this app is for likes yellow. The app should feel like hers.

**Goal:** recolour the light theme by the 60-30-10 rule:

| Share | Colour | Where |
|---|---|---|
| 60 | White (`#ffffff` cards on a warm off-white ground `#fbfaf6`) | Page ground, cards, wells |
| 30 | Yellow: golden `#fdca3a` for blocks, pale butter `#fdf1c3` for tints | The one header block per screen (quiz bar, Stats ring, score), the current tab, the selected answer's fill, the activity grid |
| 10 | Warm near-black `#231f17` | Primary buttons, the selection ring, the focus ring, text |

**Non-goals:** no dark mode, no layout or component changes, no new tokens or files.

**Anti-goals:** yellow text on white, or white text on yellow (both fail contrast). Flags must not blur into the yellow.

**Constraints:**
- Every text pair passes 4.5:1 and every ring or icon passes 3:1, checked by `src/ui/contrast.test.ts`. All the values above are in the sRGB gamut and pass (ink on golden 10.7:1, ink on butter 14.5:1).
- Right answers stay green and wrong ones stay red, each with its check or cross.

**Approaches considered:**
- Yellow as 30% (picked): yellow blocks and tints, with near-black buttons. The app reads as yellow and white.
- Yellow as 10%: navy stays the 30% and yellow is only on buttons, the current tab and rings. This is a smaller change, but the app still reads as navy.

**Design:**
- All the change goes in `src/ui/tokens.css`. The roles keep their names: `--color-inverse*` becomes the golden block with dark text, `--color-accent*` and `--color-button*` become near-black, and `--color-accent-soft` becomes butter.
- Links (`--color-accent-text`) use a deep golden brown, `#754b10`, at 7.3:1 on the ground.
- Flagged and middling (`--color-warning*`) move from amber to orange (text `#a24e10`, fill `#ef7926`). They keep the flag icon.
- The neutrals (ink, muted, rules) shift from cool navy-grey to warm grey, so they sit well next to yellow.
- The activity grid steps from butter to deep gold.
- On the yellow block, the button is near-black with a yellow label. `.tile-inverse` already swaps these through its tokens.
- The browser theme colour (`index.html`) and the PWA manifest colour (`vite.config.ts`) become the ground colour.
- Comments that name navy or blue get updated, and so does the Hallmark stamp in `app.css`.

**Left to the builder:** the exact tints for the quiz-mode icon tiles (keep them distinct and passing contrast), and any hard-coded colour found outside `tokens.css`.
