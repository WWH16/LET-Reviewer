# Accounts and sync: design

**Date:** 2026-11-17
**Status:** Approved 2026-11-17, with sign-in changed to email and password
**Builds on:** `docs/plans/let-reviewer-plan.md` §9 (Phase 2b) and `docs/reviews/audit-as-structural-eng.md` (R4–R10). Where this document and the plan differ, this document wins; the differences are listed under "Changes from the plan".

## Intent

A reviewee signs in and sees the same questions, answers, mock exams and settings on every device. The app keeps working with no account and no internet, exactly as it does today. Anyone can create an account.

## Goals

- Optional sign-in from Settings. Signed out, nothing changes.
- After sign-in, data on the device and data in the account merge into one set, with no "which copy do you want" question.
- Sync runs in the background and never blocks or slows an answer. A failed sync is silent during practice and visible in Settings.
- One user can never read or change another user's rows.
- A user can delete their account and its cloud data.
- The app builds and runs with no Supabase project configured (sync is simply absent).

## Non-goals

- Google or other social sign-in.
- Live updates between two open devices (no realtime channel).
- Sharing questions between users, or any admin screen.
- Syncing device-only values (`meta` table: last backup, last drill, sync cursors) or sample answers.

## Anti-goals

- A screen that reads from the network. Every screen keeps reading Dexie.
- Losing an answer because a sync failed, ran twice, or ran on two devices at once.
- `@supabase/supabase-js` in the first-load bundle of a signed-out user.

## Constraints

- Existing data shapes are already sync-safe: `Question`, `MockExam` and `Settings` carry `updatedAt` and `deleted`; `Attempt` is append-only with a device-made UUID; question IDs come from content, so the same handout imported on two devices is one set.
- Supabase's built-in email sender is rate-limited to a few emails an hour. That is enough to build and test. Public launch needs a custom SMTP sender set in the Supabase dashboard (a setup step, no code).
- Only the project URL and the publishable key reach the browser. The secret key is never used by this project.
- The PWA service worker precaches the app shell only; Supabase requests are never cached.

## Approaches

1. **Supabase, row-by-row sync (chosen).** One row per record, owner-locked by row-level security. The app pushes what changed and pulls what is new. Most code of the three, least data moved, and the standard shape if the user base grows. This is also what the original plan specified.
2. **Supabase, whole-backup sync.** One stored backup file per user: download, merge, upload. Least code, but every sync moves the whole bank and history, which is slow and costly on mobile data after a few thousand answers.
3. **Dexie Cloud.** Sign-in and sync as an add-on to the database the app already uses, almost no code. Free for 3 users only, then billed per user, which does not fit open sign-up.

The owner picked 1.

## Design

### Sign-in (decided with the owner: optional account, open sign-up)

- Email and password (the owner's choice over an emailed code). Password: 8 characters or more.
- **Create account:** `signUp`, then Supabase emails a 6-digit code; the user types it in the app (`verifyOtp`, type `signup`) and is signed in.
- **Sign in:** `signInWithPassword`. An account whose email was never confirmed gets the code step again (`resend`).
- **Forgot password:** `resetPasswordForEmail` emails a 6-digit code; the user types it and a new password (`verifyOtp`, type `recovery`, then `updateUser`).
- Every email carries a code, never a link: the app uses hash routes, and a Supabase redirect link puts its tokens in the same place. No redirect handling is needed.
- The session is kept by supabase-js in local storage and refreshed by it. Offline, the user stays signed in and sync waits.

### Cloud table (from the plan, unchanged)

`supabase/migrations/<timestamp>_docs.sql`:

```sql
create table public.docs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in ('questions','attempts','mockExams','settings')),
  id         text not null,
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),   -- set by a trigger on every insert and update
  primary key (user_id, collection, id)
);
create index docs_pull on public.docs (user_id, updated_at);
alter table public.docs enable row level security;
-- select, insert, update: to authenticated, (select auth.uid()) = user_id (update has using and with check).
-- No delete policy. Anonymous sign-ins stay off.
```

Whole records are stored as JSON, so a new field on a question needs no database migration.

Account deletion: a `security definer` function `public.delete_my_account()` that deletes the caller's row in `auth.users`; the cascade removes their `docs`. Execute is granted to `authenticated` only.

### Sync module (`src/sync/`, the only place that imports supabase-js)

- `client.ts`: creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Exports `syncAvailable` (both set).
- `merge.ts`: pure functions, no network. Given local records and pulled rows, returns what to write locally.
- `sync.ts`: `syncNow()`, sign-in, sign-out, delete account, and the triggers.

The module is loaded with a dynamic `import()` only when `syncAvailable` and either a session exists or the user opens the Account section.

**Device state** (in `meta`, never synced): `sync = { userId, pulledAt, pushedAt, lastSyncAt, lastError }`.

**One sync run** (single-flight: a second call while one runs waits for it):

1. **Pull.** Fetch rows with `updated_at > pulledAt`, ordered by `updated_at`, in pages of 1000. For each row: an attempt is added if its id is not on the device; any other record replaces the local one when the device has none or `row.data.updatedAt` is newer than the local `updatedAt`. Set `pulledAt` to the last row's `updated_at`.
2. **Push.** Upsert local questions, mock exams and settings with `updatedAt > pushedAt`, and attempts with `at > pushedAt`, in batches of 500. Sample answers (id starts with `demo-`) are skipped. Set `pushedAt` to the time the push started.
3. Record `lastSyncAt`, clear `lastError`. On any failure, record `lastError` and leave the cursors where they were; the next run repeats safely because every write is an upsert by id.

Conflicts: the newest `updatedAt` wins per record. Attempts never change, so they cannot conflict. Review cards, streaks and scores are derived, so they follow on their own.

**When it runs:** on app open, on the browser's `online` event, when a practice session or mock exam ends, and from Sync now. Never on each answer.

**Cases:**

- *First sign-in on a device with data:* cursors start at zero, so pull then push gives the union of both.
- *A different account signs in on a device that last synced as someone else:* a dialog says the device holds another account's data and offers Replace (clear the four tables, reset cursors, pull) or Cancel (sign out again). Data that never belonged to an account (no `sync.userId`) merges without asking.
- *Sign out:* data stays on the device; sync stops; `sync.userId` is kept so the case above still works.
- *Restore from a backup file while signed in:* reset both cursors after the restore, then run a sync, so the restored set and the account merge.
- *Delete account:* call `delete_my_account()`, sign out, clear `sync`. Device data stays.

### Settings: a new Account section, above Backup

Signed out:

```
Account
Sign in to keep your questions and answers on all your devices.
The app works the same without an account.
[ email ____________ ]
[ password _________ ]
[Sign in]  [Create account]        Forgot password?
→ after Create account:   [ 6-digit code from your email ____ ]  [Confirm]   Send a new code
→ after Forgot password:  [ 6-digit code ____ ]  [ new password ____ ]  [Save password]
What is stored: your questions, answers, mock exams and settings. Only you can read them.
```

Signed in:

```
Account
user@example.com
Last synced today, 2:14 pm.        (or: Could not sync. It will try again when you are online.)
[Sync now]  [Sign out]
Delete account…                    → dialog: deletes the cloud copy, keeps this device's data
```

If `syncAvailable` is false, the section is not shown. The Backup section stays as is; its "lives only on this device" line changes to mention the account when signed in.

### Changes from the plan

- Open sign-up instead of one user: adds the delete-account function and the different-account dialog.
- Email and password instead of an emailed one-time code.
- The Account section is its own tile, not part of Backup.

## Testing

- `merge.ts`: unit tests for newer-wins in both directions, attempts union, deleted records, and skipped sample answers.
- `sync.ts`: one test with a fake client for cursor handling and for a failed push leaving cursors unchanged.
- By hand, once the Supabase project exists: two browsers, answer in one, see it in the other; sign in as a second user and confirm the first user's data is not visible; delete account.

## Setup the owner does (I will walk through it after the code is in)

1. Create a free Supabase project.
2. Run the migration SQL in its SQL editor.
3. Auth settings: email provider on with "Confirm email" on, anonymous sign-in off, minimum password length 8, and the "Confirm signup" and "Reset password" email templates changed to show the code (`{{ .Token }}`) instead of a link.
4. Put the project URL and publishable key in `.env.local`, and later in the host's environment variables.
5. Before public launch: a custom SMTP sender, and the site URL set to the production domain.

## Left to the builder

- The exact trigger and policy SQL, checked against current Supabase docs and the dashboard's security advisor.
- A lint rule or test that keeps supabase-js imports inside `src/sync/`.
- Copy for error cases (wrong password, email already registered, wrong or expired code, too many emails).

## Calls I made (not decisions by the owner)

- Confirmation and password reset use a typed code, not an emailed link (see Sign-in).
- Sample answers never sync.
- Sign-out keeps the device's data.
- Questions sync along with answers (private to each user), so a second device is usable at once.
