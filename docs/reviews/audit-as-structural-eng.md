# Structural Audit: LET Reviewer

**Perspective**: Systems/Structural Architect
**Date**: 2026-11-15
**Plan**: plans/let-reviewer-plan.md (Draft v1.2, with a Vercel + Supabase stack introduced as v1.3)

## Plan Summary
The plan describes a single-device, local-only PWA. This audit introduces a stack that deploys on Vercel and uses Supabase, and checks what that does to the shape of the system. Adding Supabase gives the app a second place where data lives, so the main structural work is deciding which copy is in charge and keeping the Supabase dependency in one corner of the code.

## Files Reviewed
This is a greenfield plan with no code yet. The table lists the plan sections and the modules they imply.

| File (planned) | Structural Role | Layer | Risk |
|---|---|---|---|
| §4 data model (Question, Attempt, ReviewCard) | Shared types used by every feature | Domain | **High** |
| §8.5 `MockExam` record | Mutable record, created per device | Domain | **High** |
| §5 Import rules, validator, ID assignment | Contract between Claude chat and the app | Domain | Medium |
| §7 Leitner, §8.1 exam draw, §8.4 scoring | Pure logic with no I/O | Domain | Medium |
| §3 LET config | Taxonomy and weights read by draw, progress, and import | Domain | Medium |
| §4 Storage (Dexie), backup envelope | Local persistence, the only store in v1.2 | Data | **High** |
| Sync module (new) | Only code that talks to Supabase | Sync | **High** |
| Supabase `docs` table + RLS (new) | Cloud replica | Remote | **High** |
| §6 screens | React features | UI | Low |
| §9 Tech choice | Hosting and framework | Platform | Medium |

## Verdict: APPROVE WITH CHANGES

The recommended stack is **Vite + React + TypeScript PWA, Dexie, static deploy on Vercel, Supabase Auth + one Postgres table, no server code**. It fits Vercel and Supabase with almost no configuration. It only stays simple if the five Critical items below are settled before Phase 1, because four of them change the data model, and the data model is the one thing that is expensive to change once the user has three months of answers in it.

## Critical Issues (Must Fix)

| # | Issue | Files Involved | Structural Impact | Fix |
|---|---|---|---|---|
| S1 | **Two stores, no stated owner.** The plan's goals are offline use and no account. Supabase is online and needs an account. If screens read from Supabase, offline breaks. If some read Dexie and some read Supabase, there are two answers to "what is her score". | §2, §4 Storage, §9, every feature | Data flow has two masters. Every feature has to handle "loading", "offline", and "signed out". | **Local-first.** Features read and write Dexie only. Supabase is a replica that one sync module updates in the background. Sign-in is optional and is turned on in Settings. A failed or paused sync never blocks a screen. |
| S2 | **The data model cannot be replicated as written.** `Attempt` has no ID, so a retried upload creates duplicates. Nothing has `updatedAt` or a deleted marker, so edits and removals cannot travel. `ReviewCard` is mutable state that two devices will disagree on. `MockExam.id` (`GE-1115-A`) is generated per device, so a phone and a laptop can both create the same key on the same day. | §4, §7, §8.5 | Sync bolted on later means a migration of all history. Conflicts would be silent. | (a) `Attempt.id` is a client UUID, and attempts are append-only. (b) Every synced record carries `updatedAt` and `deleted`. (c) `ReviewCard` and `Attempt.correct` are **derived** from attempts and the current answer key. They are a local cache, rebuilt after a pull, and never synced. (d) `MockExam.id` is a UUID. `GE-1115-A` becomes a display `label`. (e) Question IDs are already content-derived (v1.2, Import rules), so the same handout imported on two devices merges cleanly. Keep that. |
| S3 | **No module boundaries.** The plan lists screens and records but no layers. Without a rule, `supabase-js` calls end up inside React components, and scoring or Leitner logic ends up inside components or Dexie hooks. | All planned modules | Removing or replacing Supabase would touch every feature. The Phase 0 validator could not run outside the app. | Four layers with one-way imports: `domain` (pure TypeScript) ← `db` (Dexie) ← `sync` (Supabase) and `features` (React). `@supabase/supabase-js` is imported only inside `src/sync/`. Enforce it with ESLint `no-restricted-imports`. See the Dependency Map. |
| S4 | **Three schemas that must change together.** A new field would touch the TypeScript type, the validator, the Dexie version, the backup `schemaVersion`, a Postgres migration, and a row mapper. | §4, backup envelope, Supabase schema | Six edits per field. The Postgres copy drifts first, because it is the one nobody looks at. | Supabase stores documents, not columns: one table `docs (user_id, collection, id, data jsonb, deleted, updated_at)`. A new field then needs no Postgres migration and no mapper. The backup envelope and the sync payload are the same record shape. Known ceiling: no server-side queries over question fields. Move to typed columns only if a server feature needs them. |
| S5 | **The browser talks to the database directly, so Row Level Security is the only wall.** There is no server layer in this stack. The review-center material, which the plan says must not be public, would sit in a hosted database. | Supabase `docs` table, Vercel environment variables | One missing policy exposes her bank and history to anyone with the publishable key. | RLS on from the first migration. Policies use `to authenticated` with `(select auth.uid()) = user_id` on select, insert, and update, and the update policy has both `using` and `with check`. No delete policy, since removal is the `deleted` flag. Anonymous sign-ins stay off. Only the **publishable** key goes in `VITE_` variables. The secret key is never added to the Vercel project. Run `supabase db advisors` before the first real import. |

## Recommendations

| # | Issue | Why | Fix |
|---|---|---|---|
| R1 | Framework choice for Vercel | Next.js is the default answer for Vercel, but this app has no server rendering, no SEO, and must work offline. Next adds a server/client boundary and makes the service worker harder. | Stay on Vite. Vercel detects it and deploys the static build with no configuration. Revisit only if server-rendered pages are needed. |
| R2 | The site origin is the identity of her local data | IndexedDB and the service worker are tied to the exact domain. Every Vercel preview URL is a separate, empty app. Moving from `*.vercel.app` to a custom domain later orphans everything on her phone. | Choose the production domain before the user's first import. She only ever uses that URL. Previews are for you, with sample data. |
| R3 | Sign-in method inside an installed PWA | A magic link opens in the browser, which may not share storage with the home-screen app. Verify on her phone. | Use the email one-time **code** typed into the app. It works the same in a tab and in the installed app, and needs no redirect URLs. |
| R4 | When sync runs | Syncing on every answer couples the practice loop to the network | Sync on app open, on coming back online, at the end of a session (drill finished, exam submitted), and from a **Sync now** button. Mock exam answers auto-save locally and are pushed on submit. |
| R5 | Sync algorithm | Sync frameworks (PowerSync, RxDB, ElectricSQL) solve multi-user conflict problems this app does not have | Hand-write it, about 100 lines. Push: upsert local records marked dirty, then clear the mark. Pull: fetch rows with `updated_at` after the saved cursor, apply them, rebuild derived caches. `updated_at` is set by a database trigger so device clocks do not matter. Rule: last write wins per record, attempts never change. |
| R6 | First sign-in on a device that already has data | The risky moment is choosing between "use cloud" and "use this device" | Do neither. Pull, then push. Content-derived question IDs and UUID attempts make the merge a union with no prompt. |
| R7 | Device-local state mixed with synced state | The pull cursor, last-backup date, and storage-persist result belong to one device. Syncing them breaks the other device. | Two stores: `settings` (synced: level, major, exam date, timer) and `meta` (never synced: cursor, last backup, theme and text size if she wants them per device). |
| R8 | File backup after cloud sync exists | The cloud replica and the file export fail in different ways. Free-tier projects can be paused after inactivity (verify the current policy). | Keep Export/Import from v1.2. The reminder changes to "last synced 2 days ago" when sync is on. |
| R9 | Zero-config local development | A contributor, or you on a new machine, should not need a Supabase project to run the app | If `VITE_SUPABASE_URL` is missing, sync is disabled and the Settings row says so. Everything else runs. Commit `supabase/migrations/` and a `.env.example`. Pin the `@supabase/supabase-js` version and commit the lockfile. |
| R10 | Service worker scope | Caching API responses would serve stale sync results | Precache the app shell only. Supabase requests are never cached. Add one rewrite in `vercel.json` so deep links load `index.html`, or use hash routing and skip the file. |
| R11 | Where "Later" features attach | In-app generation and photo grading need an API key that cannot live in the browser | A Vercel Function under `/api`, which checks the Supabase session token and holds the key. Nothing in v1 depends on it, so the v1 non-goal stays true. |
| R12 | Proving sync converges | Sync bugs are silent and show up as missing history | One test: two in-memory devices each record attempts and edit a question, sync in both orders, and end with identical data. |

## Nice-to-Haves

| # | Suggestion | Rationale |
|---|---|---|
| N1 | Create the Supabase project in the Singapore region | Closest to the Philippines |
| N2 | Skip Supabase Realtime | One user on one device at a time. Pull on open is enough. |
| N3 | Skip Supabase Storage until a question needs an image | The plan prefers text over images |
| N4 | Show a "Delete my cloud data" button in Settings | `on delete cascade` from `auth.users` makes it one call, and it answers the content-ownership concern |
| N5 | Check `https://supabase.com/changelog.md` for breaking changes before writing the first migration | Key naming and Data API defaults have changed recently |

## Dependency Map

```
Claude chat ──(pasted JSON)──► features/bank (import screen)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│ src/domain/   pure TypeScript, no imports from other layers │
│   types, validator, ids, leitner, scoring, examDraw,        │
│   let-config                                                │
└───────────────▲──────────────────────▲──────────────────────┘
                │                      │
        ┌───────┴────────┐     ┌───────┴─────────┐
        │ src/db/        │◄────│ src/features/   │   React screens:
        │ Dexie schema,  │     │ drill, review,  │   read/write db only
        │ repositories,  │     │ mock, bank,     │
        │ backup export  │     │ progress,       │
        └───────▲────────┘     │ settings ───────┼──┐ status + "Sync now" only
                │              └─────────────────┘  │
        ┌───────┴────────┐                          │
        │ src/sync/      │◄─────────────────────────┘
        │ auth, push,    │   ONLY importer of @supabase/supabase-js
        │ pull           │
        └───────┬────────┘
                │ HTTPS, publishable key + user session
                ▼
        Supabase: Auth (email code) + public.docs (RLS per user)

Vercel: serves the static build (app shell). No runtime dependency after first load.
Later: Vercel Function /api/* ──► Claude API   (not in v1)
```

Arrows to watch:
- `features → sync` must stay limited to Settings (status, sign in, Sync now). Any other feature importing `sync` is the start of S1.
- `domain` must import nothing. The Phase 0 validator script and the sync test both depend on that.
- `db → domain` only. Derived caches (review cards, correctness) are computed by `domain` functions and stored by `db`.

## Boundary Crossing Analysis

| Crossing | From -> To | Clean? | Notes |
|---|---|---|---|
| Content import | Claude chat -> `features/bank` -> `domain` validator | Yes, after v1.2 | Explicit JSON contract, app-assigned IDs, preview before write |
| Practice loop | `features` -> `db` | Yes | Local only. No network on the hot path. |
| Derived state | `db` -> `domain` (Leitner, scoring) | Needs S2 | Clean once `ReviewCard` and `correct` are derived, not stored as truth |
| Replication | `sync` -> `db` | Needs S2, S3 | Requires `updatedAt`, `deleted`, UUIDs, and a dirty mark on records |
| Cloud | `sync` -> Supabase | Needs S4, S5 | One table, one policy set, document payload |
| Identity | `features/settings` -> `sync/auth` | Yes | Optional. Email code. No redirects. |
| Hosting | Browser -> Vercel | Yes | Static files. Origin choice is permanent (R2). |
| Backup file | `db` -> file / share sheet | Yes | Same record shape as the sync payload (S4) |
| Future server | `features` -> Vercel Function -> Claude API | Not built | Attachment point named (R11). No v1 code depends on it. |

## Verdict Details
- **Dependency Direction**: PASS, if the four-layer rule (S3) is adopted. The plan does not state any direction today.
- **Module Coupling**: CONCERNS. Without the import restriction, Supabase couples to every feature (S1, S3).
- **Cohesion**: PASS. Pure logic (validator, Leitner, draw, scoring) groups naturally into `domain`. Synced and device-local settings need separating (R7).
- **Layer Boundaries**: CONCERNS. The client-to-database boundary has no server in between, so RLS carries all of it (S5).
- **Change Propagation**: CONCERNS, reduced to PASS by the document table (S4). A new question field then touches the type, the validator, and a Dexie version, and nothing in Supabase.
