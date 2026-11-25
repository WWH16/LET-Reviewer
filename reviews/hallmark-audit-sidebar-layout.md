# Hallmark audit: the sidebar and each screen's layout (2026-11-25)

Scope: app screens, genre modern-minimal, polish depth. Screenshots at 1280 x 860 and 375 x 812 in an
isolated preview build (port 4173) with test subjects, sample answers, one quiz take and one mock left midway.

Done first, as asked: **Missed questions is replaced by Unfinished** (c813960). Quiz takes save as she answers,
so a quiz left midway is continued from its next question; Unfinished lists those takes and every ungraded
mock. The wrong-answer review and its schedule are gone.

## The sidebar

| Finding | Fix | Commit |
| --- | --- | --- |
| The Settings heading and pages, which have no icons, started at the icons' edge, so the menu had two left edges | Labels all start at one edge (52px at 1280) | 7b8bc8c |
| Order and names (Study, Quizzes, Mock exams, Unfinished, Stats, then Settings) | Kept: Mock exams says Mock on the phone bar | none |
| Phone bar has five tabs and no Unfinished | Kept: five is the bar's limit; Study's Unfinished tile and resume card reach it | none |

## Each screen

| Screen | Finding | Fix | Commit |
| --- | --- | --- | --- |
| Study | The resume card only knew mocks, repeating the Unfinished tile and missing quizzes | It continues whichever quiz take or ungraded mock was touched last | f00db31 |
| Mock exams | Open exams were headed Not finished | Headed Unfinished, as everywhere else | 600b1b9 |
| Settings, Subjects | On wide screens each name field pushed its count and Remove to a second line | One line from 30rem up; phones still stack | 7808a9e |
| Unfinished, Quizzes, Subject, Quiz, New quiz, Mock results, Stats, other Settings pages | Read clean at both sizes; one primary per screen, one left edge per list | none | none |

## After

`sloplint src --scope app`: 0 FAIL, 0 WARN. Typecheck and build pass. Tests pass except
`sync/boundary.test.ts`, which fails before and after because a local Supabase `.env` is present.
