# Flat cream look (after DESIGN-claude.md)

**Why:** the owner picked a calm, editorial style (DESIGN-claude.md) for the app, keeping the palette we just settled.

**Goal:** go flat. Drop the clay look (2px chocolate outline and a solid chocolate shadow on every card) for cream colour blocks, and set page titles in a serif.

**Non-goals:** no colour changes beyond the whites, no layout changes, no Anthropic marks or names.

**Anti-goals:** text that fails contrast on the darker cream cards; white checks and crosses on the state fills that drop under 3:1.

**Constraints:**
- The palette stays: butter yellow `#FDD77A` header block, chocolate `#421E0E` ink and pills, cobalt `#0047AB` only on the primary button and the focus ring.
- Every text pair keeps passing `src/ui/contrast.test.ts`.
- The doc's fonts (Copernicus, StyreneB) are licensed, so a free serif stands in.

**Approaches:**
- Token-first (picked): change the whites, the radius and the three shadow tokens in `tokens.css`, so the 20 places using them follow, then remove the 4 hand-drawn ink edges in `app.css`. Smallest diff.
- Restyle each component to the doc's specs one by one. Same result with far more code.

**Design:**
- Whites, from the doc: ground `#faf9f5` (canvas), cards `#efe9de` (surface card) with no border and no shadow, wells and hover fills `#e8e0d2` (cream strong), soft hovers `#f5f0e8` (surface soft), lines `#e6dfd8` (hairline). Inputs sit in `#faf9f5` inside the cream cards and keep their visible brown edge (a faint hairline would fail 3:1 for a field's boundary). Answer choices sit on the page ground, so they are cream blocks like the cards.
- Tiles you tap get a faint soft shadow on hover only. Dialogs and menus get a soft blurred shadow so they float.
- Big tiles go from 20px to 16px corners. Cards (12px) and buttons (8px) stay.
- The side-menu pill, pressed toggles and the sign-in tab lose their outline; their chocolate or butter fill carries them.
- Page titles, the greeting and big figures use Newsreader (free, `@fontsource-variable/newsreader`) at a regular weight with slight negative tracking. Card headings and body stay in Instrument Sans; timers and scores stay in DM Mono.
- Hover effects stay (the doc drops them; they help in an app). Cobalt stays (the doc avoids blue; the owner chose it).
- The browser theme colour and the PWA manifest colour become `#faf9f5`.

**Left to the builder:** the exact soft-shadow values, the serif's weight and tracking per size, and what light colour carries the white checks on the state fills if the cream cards push them under 3:1.
