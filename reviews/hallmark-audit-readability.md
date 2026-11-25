# Hallmark audit: Stats, Subjects and the sidebar, for reading (2026-11-25)

Scope: app screens, genre modern-minimal, polish depth, asked to make Stats' bento, the subjects and the
sidebar easy to read. Captured at 1440 x 900, 1280 x 860 and 375 x 812 in an isolated preview build (port
4173) with seven subjects, sample answers, a quiz take and a mock left midway.

## Findings and fixes

| Where | Finding | Fix | Commit |
| --- | --- | --- | --- |
| Everywhere | Reading text 15px, helper text, labels and the side menu 13px (the Floor asks body 16px or more) | Body 16px, helper text 14px through a new `--text-meta` step; Kumo's own 13px step untouched; names 17px | ef77bfc |
| Sidebar | Every label 13px on 34px rows; places and settings pages looked the same | Places at 16px on 40px rows; Settings heading and pages 14px regular on 32px rows, current page semibold, after a wider gap | 4068d06 |
| Stats | "Subject scores" showed parts and hid each part's subjects behind three toggles | The tile is **By part**: name, score, bar, its share of the rating | 5afd946 |
| Stats | "Weakest subjects" showed five, each row squeezed by two buttons (on a phone the text wrapped into a narrow column) | **By subject, weakest first**: every subject with 3+ answers, over the same recent window as its part; name and part on the left, score on the right, the row opens its quizzes | 5afd946 |
| Settings, Subjects | Every subject an always-open text field, so the list read as a form | Plain rows (name, question count) with Rename and Remove; Rename opens a field on that row only, Enter saves, Escape cancels | df68376 |

Kept: the Stats ring and rating on top, the streak across the bottom, the sidebar's order and the phone bar.

## After

`sloplint src --scope app`: 0 FAIL, 0 WARN. Typecheck and build pass; no screen scrolls sideways at 1280
or 375. Tests pass except `sync/boundary.test.ts`, which fails before and after because a local Supabase
`.env` is present.
