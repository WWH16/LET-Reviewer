# Flat Cream Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the clay look with flat cream colour blocks and set page titles and big figures in a serif.

**Architecture:** Token-first. The whites, the tile radius and the three shadow tokens change in `src/ui/tokens.css`, so every card, tile, dialog and choice follows. `src/ui/app.css` loses its four hand-drawn ink edges and gains a hover shadow on tappable tiles. Headings move to two families in `src/ui/base.css`.

**Tech Stack:** CSS custom properties, Kumo 2.18.1, Vite, Vitest, Fontsource.

**Spec:** `docs/superpowers/specs/2026-11-28-flat-cream-design.md`

## Global Constraints

- Palette stays: butter `#FDD77A` block, chocolate `#421E0E` ink and pills, cobalt `#0047AB` only on the primary button and focus ring.
- Every colour token stays in `oklch(L% C H)` form, because `contrast.test.ts` only reads that form.
- Creams (from the doc): canvas `#faf9f5` = `oklch(98.2% 0.005 95.1)`, surface soft `#f5f0e8` = `oklch(95.7% 0.012 79.8)`, surface card `#efe9de` = `oklch(93.6% 0.016 82.8)`, cream strong `#e8e0d2` = `oklch(90.9% 0.021 81.8)`, hairline `#e6dfd8` = `oklch(90.7% 0.012 67.7)`.
- Serif: Newsreader via `@fontsource-variable/newsreader`. No Anthropic marks or names.
- Commits go straight to main with no Co-Authored-By or Generated-with lines.

## Review Focus

- A text field inside a cream card must still show its edge at 3:1 (`--color-control` on `--color-card`).
- Meta text in the muted tone sits on cream cards, so it needs 4.5:1 there, not only on the ground.
- The white check and cross on the right and wrong fills must stay at 3:1 once "card" is cream, not white.
- Dialogs, toasts and the sheet drawer must still separate from the page with no ink outline.
- The printed-booklet preview page (`.paper .page`) is white on the canvas and needs its own edge.

---

### Task 1: Cream tokens and the contrast pairs that guard them

**Files:**
- Modify: `src/ui/tokens.css` (the 60 block, `--radius-tile`, the shadow tokens, the Kumo control token, the header comment)
- Modify: `src/ui/contrast.test.ts` (pairs list)
- Modify: `src/ui/app.css` (`.choice.is-correct … .choice-letter`, `.choice.is-wrong … .choice-letter`, `.review-status`: `color: var(--color-card)` becomes `var(--color-paper)`)
- Modify: `index.html`, `vite.config.ts` (theme and manifest colour `#FBFAF6` becomes `#faf9f5`)

**Interfaces:**
- Produces: `--color-paper` canvas, `--color-paper-soft` (new) surface soft, `--color-card` surface card, `--color-paper-2` cream strong, `--color-paper-3` one step darker for hovers on wells and heat-0, `--color-rule` hairline, `--shadow-card: none`, `--shadow-raised` (soft hover shadow), `--shadow-pop` (soft float shadow plus a 1px hairline ring), `--radius-tile: 16px`, `--color-kumo-control: var(--color-paper)`.

- [ ] **Step 1: Add the failing pairs** to `contrast.test.ts`: `['color-muted', 'color-card', 4.5]` (replacing the 3:1 one), `['color-control', 'color-card', 3]`, and change the three white-on-fill pairs from `color-card` to `color-paper`.
- [ ] **Step 2: Run** `npx vitest run src/ui/contrast.test.ts`. Expected: FAIL on `color-control on color-card` or `color-muted on color-card` only if the current values miss; the renamed fill pairs pass today because paper is near-white.
- [ ] **Step 3: Set the tokens** listed under Produces, with the Global Constraints values. `--color-paper-3`: `oklch(87.5% 0.025 80)`. `--shadow-raised`: `0 1px 3px oklch(28.3% 0.062 43.5 / 0.08), 0 4px 12px -6px oklch(28.3% 0.062 43.5 / 0.1)`. `--shadow-pop`: `0 0 0 1px var(--color-rule), 0 16px 48px -8px oklch(28.3% 0.062 43.5 / 0.16)`. Darken `--color-muted` or `--color-control` only as far as the new pairs need.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Commit** "Flat cream: the doc's creams, flat cards, softer corners".

### Task 2: Strip the ink edges and give tappable tiles a hover lift

**Files:**
- Modify: `src/ui/app.css`: `.auth-card` (drop `border` and the solid shadow; background `var(--color-card)`), `.seg …::before` (drop its `box-shadow`), `.btn[aria-pressed='true']` (drop its `box-shadow`), `.nav a[aria-current='page']` at 60rem (drop its `box-shadow`), `.resume` (rest shadow `var(--shadow-card)`), `.resume:hover` and `a.mode:hover` (background `var(--color-paper-soft)`, `box-shadow: var(--shadow-raised)`), `.paper .page` (`box-shadow: 0 0 0 1px var(--color-rule)`). Keep `.cal-grid td.is-today`'s inset ring: it marks today, it is not the clay look.
- Modify: `src/ui/app.css` header comments that name the clay look or white cards (lines 3, 7 and the `/* The clay look … */` token comment).

- [ ] **Step 1: Run** `grep -n "var(--color-ink)" src/ui/app.css`. Expected after the edits: only `.cal-grid td.is-today` and non-shadow uses (text, fills) remain.
- [ ] **Step 2: Check in the preview** (`let-reviewer-local`): Home, Stats, a quiz with a chosen answer, a dialog (Settings, sign-out or erase), the Year/Month toggle. Each card reads as a cream block, no chocolate outline anywhere, hovering a Home tile lifts it.
- [ ] **Step 3: Commit** "Flat cream: drop the ink outlines, lift tiles on hover".

### Task 3: Newsreader for titles and figures

**Files:**
- Modify: `package.json` (add `@fontsource-variable/newsreader`, remove `@fontsource-variable/schibsted-grotesk`)
- Modify: `src/app/main.tsx:4` (import `@fontsource-variable/newsreader/wght.css` in place of Schibsted's)
- Modify: `src/ui/tokens.css`: `--font-display: "Newsreader Variable", "Newsreader", ui-serif, Georgia, serif`; `--weight-title: 450`; `--weight-figure: 500`; `--tracking-display: -0.02em`; the font comment.
- Modify: `src/ui/base.css:13-16`: `h1` keeps `--font-display`; `h2, h3` take `var(--font-body)` with `letter-spacing: 0`.
- Modify: `src/ui/app.css`: `.brand` takes `var(--font-body)` (the wordmark stays sans) and `.subject-pct` keeps weight 600 explicitly if it reads thin at 500.

- [ ] **Step 1: Run** `npm uninstall @fontsource-variable/schibsted-grotesk && npm install @fontsource-variable/newsreader`. Expected: both succeed, `package.json` lists Newsreader.
- [ ] **Step 2: Make the edits** above.
- [ ] **Step 3: Run** `npm run build`. Expected: type check and build pass, no missing font import.
- [ ] **Step 4: Check in the preview**: page titles, the greeting, the Stats ring figure, the rating figure and the score render in the serif; card headings and the "LET Prep" wordmark stay sans.
- [ ] **Step 5: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 6: Commit** "Flat cream: Newsreader for titles and figures".
