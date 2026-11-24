# Yellow Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolour the light theme by the 60-30-10 rule: 60 white, 30 yellow, 10 near-black.

**Architecture:** Every colour is a role token in `src/ui/tokens.css`, and Kumo's tokens point at them. The work swaps token values and keeps the role names. One small rule in `app.css` darkens the state colours on the yellow block.

**Tech Stack:** CSS custom properties in OKLCH, Kumo 2.18.1, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-24-yellow-palette-design.md`

## Global Constraints

- Text pairs ≥ 4.5:1. Rings, icons and arcs ≥ 3:1. Checked in `src/ui/contrast.test.ts`.
- Every value must be inside the sRGB gamut.
- Light only. No new files and no new token names.

## Review Focus

- **The low-time quiz timer on the yellow bar:** orange text on golden yellow must stay readable. Test pair: `color-warning` on `color-inverse` ≥ 4.5.
- **Right and wrong segments and the Stats ring arcs on yellow:** green, red and orange fills wash out on yellow. Test pairs: `color-success`, `color-error` and `color-warning` on `color-inverse` ≥ 3, plus the `app.css` remap.
- **White check, cross and flag icons on the state fills:** Test pairs: `color-card` on each `*-fill` ≥ 3.
- **Links in the current tab:** golden brown on butter. Test pair: `color-accent-text` on `color-accent-soft` ≥ 4.5.

---

### Task 1: Tokens and contrast

**Files:**
- Modify: `src/ui/tokens.css`, the `:root` colour block (lines 28-65)
- Modify: `src/ui/app.css`, `.tile-inverse` (around line 174) and `.brand-mark` (around line 375)
- Test: `src/ui/contrast.test.ts`

- [ ] **Step 1:** Add the Review Focus pairs to `pairs` in `contrast.test.ts`.
- [ ] **Step 2:** Run `npx vitest run src/ui/contrast.test.ts`. Expected: some new pairs FAIL against today's navy and amber values.
- [ ] **Step 3:** Set the values from the spec in `tokens.css`:
  - paper `#fbfaf6` = oklch(98.5% 0.005 95), card white
  - golden `--color-inverse` = oklch(86% 0.16 88), `--color-inverse-tint` = oklch(80% 0.15 84)
  - `--color-inverse-ink` = ink, `--color-inverse-muted` = oklch(38% 0.05 75)
  - butter `--color-accent-soft` = oklch(95.5% 0.06 95)
  - near-black ink, accent, button and focus = oklch(24% 0.015 80)
  - link `--color-accent-text` = oklch(45% 0.09 70)
  - orange `--color-warning*`, heat steps from butter to gold, warm neutrals
- [ ] **Step 4:** In `app.css`, make `.tile-inverse, .quiz-bar` map `--color-{success,error,warning}-fill` to the text-strength tokens. Make `.brand-mark` use `--color-inverse`.
- [ ] **Step 5:** Run `npx vitest run src/ui/contrast.test.ts`. Expected: all pairs PASS.

### Task 2: Shell colours and wording

**Files:**
- Modify: `index.html:6`, `vite.config.ts:19-20` (set both to `#FBFAF6`)
- Modify: comments that name navy or blue in `src/ui/app.css`, `src/ui/btn.ts`, `src/features/practice/Session.tsx:189` and `src/features/progress/Progress.tsx:53`, and the Hallmark stamp (`app.css:1-3`)

- [ ] **Step 1:** Make the edits.
- [ ] **Step 2:** Run `npm run build` and `npm test`. Expected: the build passes, and only the existing `boundary.test.ts` env failure remains.
- [ ] **Step 3:** Check Study, a quiz, Stats and Settings in the browser at 375 px and 1280 px.
