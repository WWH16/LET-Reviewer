# Hallmark audit: Stats on big screens, and the streak (2026-11-25)

Scope: Stats, app screen, genre modern-minimal, polish depth. Captured at 1920 x 1080, 1280 x 860 and
375 x 812 in an isolated preview build with seven subjects and six weeks of sample answers.

| Finding | Fix | Commit |
| --- | --- | --- |
| At 1920 the By part tile ended well above the subject list beside it, leaving an empty half under it | The subject list runs two rows tall and the streak takes the half under the parts; Stats fits one 1080px screen | 91b1394 |
| The streak took a whole row, its grid crowded into the right half and the left half empty | Same move: the streak is a half beside the subject list | 91b1394 |
| A general rule stretched any lone last half across the row, even beside a two-row tile | A half that follows a two-row tile keeps its half | 91b1394 |
| The streak could only be read as the year grid of small squares | A Year / Month choice; Month is a calendar with each day's date on its shade, today ringed, days ahead blank, stepping back to the first study month; remembered on the device | 3d37479 |
| Ink on the darkest activity shade measured 4.40:1, under 4.5:1 for the calendar's numbers | Darkest shade lightened from 62% to 63% lightness; ink on every shade is now in `contrast.test.ts` | 3d37479 |

Also found and fixed: the streak and date tests had gone out with the review schedule's tests in c813960;
3d37479 restores them and adds one for the month layout.

After: `sloplint src --scope app` 0 FAIL, 0 WARN; typecheck and build pass; tests pass except
`sync/boundary.test.ts` (a local Supabase `.env`, as before).

Not committed, not mine: sidebar edits in `src/app/App.tsx` and `src/ui/app.css` (a foldable Settings
group) were in the working copy throughout; these commits carry none of their lines.
