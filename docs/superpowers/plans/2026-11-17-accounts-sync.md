# Accounts and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional email-and-password accounts that keep a user's questions, answers, mock exams and settings the same on every device, with the app still working signed out and offline.

**Architecture:** Dexie stays the only store screens read. A new `src/sync/` module holds everything that touches Supabase: a pure merge, a sync run written against two small interfaces (`Remote`, `Store`) so it is tested without a network or IndexedDB, the Supabase and Dexie implementations of those interfaces, and auth calls. Screens reach it only through `src/sync/trigger.ts`, which has no Supabase import and loads the rest on demand.

**Tech Stack:** Vite, React 19, TypeScript, Dexie 4, Vitest 5, `@supabase/supabase-js` v2 (new), Supabase Postgres + Auth.

**Spec:** `docs/superpowers/specs/2026-11-17-accounts-sync-design.md`

## Global Constraints

- `@supabase/supabase-js` is imported only by files in `src/sync/`. Outside `src/sync/`, only `src/sync/trigger.ts` may be imported statically; everything else in the folder is reached with `import()`.
- Env names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. With either missing, `syncAvailable` is `false`, the Account section is not rendered, and no Supabase code loads.
- No screen reads from the network. A failed sync never throws into a screen and never shows a toast during practice.
- Sync never runs on a single answer. It runs on app open, the `online` event, the end of a practice session, a graded mock exam, after a backup restore, and from Sync now.
- Attempts whose id starts with `demo-` (`DEMO_PREFIX` in `src/domain/demo.ts`) are never pushed.
- The `meta` table is never synced.
- Pull page size 1000, push batch size 500, minimum password length 8, codes are 6 digits.
- Every Supabase email carries a typed code, never a link (the app uses `HashRouter`).
- Copy is sentence case, plain verbs, no apology; a button keeps one name through a flow.
- Commits go straight to `main` with no co-author or generated-with lines (owner's standing rule), and only when the owner asks.

## Review Focus

1. **Sync interrupted halfway** (tab closed, network drops after pull, before push): the next run must finish the job with no duplicate or lost record. Test in Task 3.
2. **The same record edited on two devices while both were offline:** the newer `updatedAt` wins on both devices after each syncs; the older edit never overwrites the newer. Test in Task 2.
3. **A second account signs in on a device holding the first account's data:** nothing of the first account is uploaded to the second. Test in Task 3 (`runSync` refuses when `state.userId` differs) and by hand in Task 6.
4. **A session that expired or an account deleted elsewhere:** sync records the error, the Account section shows signed out, practice is unaffected. Test in Task 4.
5. **More than 1000 changed rows in one pull** (a first sign-in on a second device): every page is applied, and rows sharing one `updated_at` across a page edge are not skipped. Test in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261117000000_docs.sql` | Table, trigger, policies, `delete_my_account()` |
| `.env.example` | The two variable names, empty |
| `src/sync/trigger.ts` | `syncAvailable`, `requestSync()`; no Supabase import |
| `src/sync/merge.ts` | Pure: pulled rows → local writes; local records → rows to push |
| `src/sync/run.ts` | `runSync(remote, store, userId)`: cursors, paging, batching |
| `src/sync/store.ts` | `Store` over Dexie |
| `src/sync/client.ts` | Supabase client, `Remote` over it |
| `src/sync/auth.ts` | Sign up, confirm, sign in, reset, sign out, delete account, `syncNow()` |
| `src/sync/boundary.test.ts` | Enforces the import rule |
| `src/features/settings/AccountSection.tsx` | The Account tile |
| `docs/setup-supabase.md` | Owner's setup steps |

---

### Task 1: Database migration, env plumbing, import boundary

**Files:**
- Create: `supabase/migrations/20261117000000_docs.sql`, `.env.example`, `src/sync/trigger.ts`, `src/sync/boundary.test.ts`
- Modify: `package.json` (add `@supabase/supabase-js` to dependencies)

**Interfaces:**
- Produces: `export const syncAvailable: boolean` and `export function requestSync(): void` from `src/sync/trigger.ts`. `requestSync` returns at once; it does nothing when `!syncAvailable`, otherwise `import('./auth').then((m) => m.syncNow()).catch(() => {})`. (`./auth` arrives in Task 4; until then make the import target a one-line stub `export const syncNow = async () => {}` in `src/sync/auth.ts`.)

- [ ] **Step 1: Write the failing test** `src/sync/boundary.test.ts`

```ts
// Walk src/ with node:fs (as domain.test.ts does), read every .ts/.tsx file.
it('keeps supabase-js inside src/sync', () => {
  expect(filesOutsideSync.filter((f) => /from ['"]@supabase\//.test(f.text)).map((f) => f.path)).toEqual([]);
});
it('lets the rest of the app import only the trigger statically', () => {
  // any static `from '…/sync/<name>'` outside src/sync must have <name> === 'trigger'
  expect(staticSyncImportsOutsideSync.filter((name) => name !== 'trigger')).toEqual([]);
});
it('is off when the env is missing', async () => {
  expect((await import('./trigger')).syncAvailable).toBe(false); // vitest runs with no VITE_SUPABASE_* set
});
```

- [ ] **Step 2: Run** `npx vitest run src/sync/boundary.test.ts` — expected: FAIL, `./trigger` not found.
- [ ] **Step 3: Install** `npm install @supabase/supabase-js`, then create `trigger.ts` (`syncAvailable = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`), the `auth.ts` stub, and `.env.example` with the two names and no values.
- [ ] **Step 4: Write the migration.** Exactly the table in the spec, plus:
  - `create index docs_pull on public.docs (user_id, updated_at, id);`
  - a `before insert or update` trigger setting `new.updated_at = now()`;
  - three policies (`select`, `insert`, `update`) `to authenticated` with `(select auth.uid()) = user_id` (`update` has both `using` and `with check`); no delete policy;
  - `public.delete_my_account()`: `language sql security definer set search_path = ''`, body `delete from auth.users where id = (select auth.uid())`; `revoke execute … from public, anon; grant execute … to authenticated`.
  Check the policy and `security definer` syntax against the current Supabase docs before finishing (load the `supabase` skill).
- [ ] **Step 5: Run** `npx vitest run src/sync/boundary.test.ts && npx tsc --noEmit` — expected: PASS, no type errors.
- [ ] **Step 6: Commit** (when the owner asks) `git commit -m "Add the sync table migration and the sync import boundary"`

---

### Task 2: Pure merge

**Files:**
- Create: `src/sync/merge.ts`, `src/sync/merge.test.ts`

**Interfaces:**
- Produces:

```ts
export type Collection = 'questions' | 'attempts' | 'mockExams' | 'settings';
/** A row as pulled. */
export interface Row { collection: Collection; id: string; data: unknown; deleted: boolean; updated_at: string }
/** A row to push: the server sets user_id and updated_at. */
export type PushRow = Omit<Row, 'updated_at'>;
export interface Records { questions: Question[]; mockExams: MockExam[]; settings: Settings | null; attempts: Attempt[] }
/** What the device holds, as far as merging needs: updatedAt by id, and which attempts exist. */
export interface LocalIndex { questions: Map<string, string>; mockExams: Map<string, string>; settingsUpdatedAt: string | null; attemptIds: Set<string> }

/** The pulled records that should be written to the device. */
export function applyPulled(rows: readonly Row[], local: LocalIndex): Records;
/** Local records changed after `since` (ISO), as rows. Skips demo attempts. */
export function toPush(all: Records, since: string): PushRow[];
```

- [ ] **Step 1: Write the failing tests** (build records with the `q()` helper pattern from `domain.test.ts`):

```ts
it('takes a pulled record the device does not have', …);            // applyPulled → questions has it
it('takes a pulled record newer than the local one', …);            // local '…T10:00', pulled data.updatedAt '…T11:00' → taken
it('keeps the local record when it is newer', …);                   // pulled '…T09:00' → questions is []
it('keeps the local record on a tie', …);                           // equal updatedAt → not taken
it('carries a remote removal', …);                                  // pulled deleted:true, newer → taken with data.deleted === true
it('adds only attempts the device lacks', …);                       // attemptIds has 'a1'; rows a1,a2 → attempts ids ['a2']
it('pushes only what changed after the cursor', …);                 // since '…T10:00': updatedAt 09:00 skipped, 10:00 skipped, 10:01 pushed
it('pushes attempts by their `at`', …);
it('never pushes sample answers', …);                               // id 'demo-3' newer than cursor → absent
it('sets row.deleted from the record', …);                          // question.deleted true → PushRow.deleted true; attempts always false
it('settings push under id "settings"', …);
```

- [ ] **Step 2: Run** `npx vitest run src/sync/merge.test.ts` — expected: FAIL, module not found.
- [ ] **Step 3: Implement** both functions. Comparison is plain string compare on ISO timestamps (as `leitner.ts` does). `toPush` uses `>` (strict).
- [ ] **Step 4: Run** the same command — expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add the pure merge for sync"`

---

### Task 3: The sync run

**Files:**
- Create: `src/sync/run.ts`, `src/sync/run.test.ts`, `src/sync/store.ts`
- Modify: `src/sync/trigger.ts` (add `SyncState` and `EMPTY_STATE`: screens read sync state, and may import only this file)

**Interfaces:**
- Consumes: `Row`, `PushRow`, `Records`, `LocalIndex`, `applyPulled`, `toPush` (Task 2).
- Produces (`SyncState` and `EMPTY_STATE` live in `trigger.ts`; the rest in `run.ts`):

```ts
export interface SyncState { userId: string | null; signedIn: boolean; pulledAt: string; pulledId: string; pushedAt: string; lastSyncAt: string | null; lastError: string | null }
export const EMPTY_STATE: SyncState; // userId null, signedIn false, cursors '1970-01-01T00:00:00.000Z' and '', nulls

export interface Remote {
  /** Rows after (updated_at, id), ordered by updated_at then id, at most `limit`. */
  pull(after: { at: string; id: string }, limit: number): Promise<Row[]>;
  push(rows: PushRow[]): Promise<void>;
}
export interface Store {
  getState(): Promise<SyncState>;
  setState(patch: Partial<SyncState>): Promise<void>;
  index(): Promise<LocalIndex>;
  write(records: Records): Promise<void>;   // one Dexie transaction, bulkPut
  all(): Promise<Records>;
  clear(): Promise<void>;                    // the four synced tables only
}
export const PAGE = 1000;
export const BATCH = 500;
/** One pull-then-push. Throws nothing: a failure lands in state.lastError. Returns true on success. */
export async function runSync(remote: Remote, store: Store, userId: string, now?: () => string): Promise<boolean>;
```

`store.ts` exports `export const dexieStore: Store` (state lives in `meta` under key `'sync'`, read with `getMeta('sync', EMPTY_STATE)`).

- [ ] **Step 1: Write the failing tests** with an in-memory `Remote` and `Store` defined in the test file:

```ts
it('pulls then pushes and moves both cursors', …);
it('pages through more than one page', …);                 // 2,500 rows, PAGE 1000 → all 2,500 written, 3 pull calls + 1 empty
it('does not skip rows sharing updated_at across a page edge', …); // rows 999..1001 same updated_at, distinct ids → all written
it('pushes in batches of 500', …);                         // 1,200 changed → push called with 500, 500, 200
it('leaves the cursors unchanged when push fails', …);     // remote.push rejects → returns false, pushedAt as before, lastError set, pulledAt advanced
it('finishes an interrupted run on the next call', …);     // fail once, run again → remote holds every local record exactly once
it('refuses to run for a different account', …);           // state.userId 'A', runSync(…, 'B') → false, remote.push never called, lastError set
it('adopts the account when the device has none', …);      // state.userId null → after run, userId === 'B'
it('running twice changes nothing the second time', …);    // second run: store.write called with empty Records, push with no rows or not at all
```

- [ ] **Step 2: Run** `npx vitest run src/sync/run.test.ts` — expected: FAIL.
- [ ] **Step 3: Implement `runSync`.** Order: check `userId` against state → pull loop (advance `pulledAt`/`pulledId` after each applied page) → take `pushStart = now()` → `toPush(await store.all(), state.pushedAt)` in batches → `setState({ pushedAt: pushStart, lastSyncAt: now(), lastError: null })`. Wrap in one `try`; on catch `setState({ lastError: String(message) })` and return `false`.
- [ ] **Step 4: Implement `dexieStore`** in `store.ts` over `db` (`src/db/db.ts`). `index()` reads ids and `updatedAt` only (`db.questions.toArray()` then map; attempts via `db.attempts.toCollection().primaryKeys()`).
- [ ] **Step 5: Run** `npx vitest run src/sync && npx tsc --noEmit` — expected: PASS.
- [ ] **Step 6: Commit** `git commit -m "Add the sync run with cursors, paging and batching"`

---

### Task 4: Supabase client and auth

**Files:**
- Create: `src/sync/client.ts`, `src/sync/auth.test.ts`
- Modify: `src/sync/auth.ts` (replace the stub)

**Interfaces:**
- Consumes: `Remote`, `runSync`, `dexieStore`, `EMPTY_STATE` (Task 3).
- Produces, from `client.ts`: `export const supabase: SupabaseClient` and `export const remote: Remote` (`from('docs').select('collection,id,data,deleted,updated_at')` filtered with `.or('updated_at.gt.<at>,and(updated_at.eq.<at>,id.gt.<id>)')`, ordered by `updated_at` then `id`, `.limit(n)`; `push` is `upsert(rows, { onConflict: 'user_id,collection,id' })`).
- Produces, from `auth.ts`:

```ts
export type AuthResult = { ok: true } | { ok: false; error: string };          // error is copy ready to show
export type SignInResult = AuthResult | { ok: false; needsCode: true } | { ok: false; otherAccount: true };
export function signUp(email: string, password: string): Promise<AuthResult>;          // then the code step
export function confirmSignUp(email: string, code: string): Promise<SignInResult>;
export function resendCode(email: string): Promise<AuthResult>;
export function signIn(email: string, password: string): Promise<SignInResult>;
export function requestReset(email: string): Promise<AuthResult>;
export function finishReset(email: string, code: string, password: string): Promise<SignInResult>;
/** After `otherAccount`: clear the device, reset cursors, adopt this account, sync. */
export function replaceDeviceData(): Promise<void>;
export function signOut(): Promise<void>;                                              // keeps data and state.userId; signedIn false
export function deleteAccount(): Promise<AuthResult>;                                  // rpc('delete_my_account'), then signOut, state → EMPTY_STATE
export function currentEmail(): Promise<string | null>;
/** Single-flight. No-op when signed out. Never throws. */
export function syncNow(): Promise<void>;
export function messageFor(error: { message?: string; code?: string; status?: number }): string;
```

Rules the signatures do not show:
- A successful sign-in (any path) compares the session's user id with `state.userId`: if `state.userId` is set and different, return `{ ok: false, otherAccount: true }` **without** syncing and leave the session in place; otherwise set `signedIn: true` and call `syncNow()`.
- `signIn` on an unconfirmed email (Supabase error code `email_not_confirmed`) calls `resendCode` and returns `needsCode`.
- `syncNow` on an auth failure from the server (401, or code `session_not_found` / `user_not_found`) sets `signedIn: false` and `lastError`.
- `messageFor` copy: `invalid_credentials` → "Wrong email or password."; `user_already_exists` → "This email already has an account. Sign in instead."; `otp_expired` or an invalid code → "That code is wrong or has expired. Send a new one."; `over_email_send_rate_limit` → "Too many emails sent. Try again in a few minutes."; `weak_password` → "Use 8 characters or more."; a fetch failure → "You are offline. Try again when you are connected."; anything else → "Could not reach the account service. Try again."

- [ ] **Step 1: Write the failing tests** `auth.test.ts` (pure parts only, `vi.mock('./client')` with a fake `supabase`):

```ts
it.each([...])('maps %s to its message', …);                         // the seven messageFor cases above, exact strings
it('asks before mixing two accounts', …);                            // state.userId 'A', sign-in returns user 'B' → { ok:false, otherAccount:true }, runSync not called
it('turns signed out when the server rejects the session', …);       // remote.pull rejects with status 401 → state.signedIn false, lastError set
it('runs one sync at a time', …);                                    // two syncNow() calls → remote.pull call count equals one run's
it('does nothing signed out', …);
```

- [ ] **Step 2: Run** `npx vitest run src/sync/auth.test.ts` — expected: FAIL.
- [ ] **Step 3: Implement `client.ts`** (`createClient(url, key)` with default auth options) and `auth.ts`. Check method names and error codes against the installed supabase-js version's types (`signUp`, `verifyOtp({ email, token, type: 'signup' | 'recovery' })`, `resend({ type: 'signup', email })`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser({ password })`).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — expected: all PASS.
- [ ] **Step 5: Commit** `git commit -m "Add account sign-in, reset, deletion and the Supabase remote"`

---

### Task 5: Account section and sync triggers

**Files:**
- Create: `src/features/settings/AccountSection.tsx`
- Modify: `src/features/settings/Settings.tsx` (render `<AccountSection />` above the Backup tile when `syncAvailable`; after `restoreBackup`, reset cursors then `requestSync()`; Backup's "No backup yet" line), `src/app/App.tsx` (on mount and on `window` `online`: `requestSync()`), `src/features/practice/Session.tsx` (when `done` turns true), `src/features/mock/MockExam.tsx` and `src/features/mock/MockEntry.tsx` (after `gradeExam`), `src/db/hooks.ts` (add `useSyncState`), `src/ui/app.css` (only if the form needs a rule the existing `.field`, `.row`, `.tile` do not give)

**Interfaces:**
- Consumes: `syncAvailable`, `requestSync` (Task 1); everything exported by `auth.ts` (Task 4), loaded with `import('../../sync/auth')` inside handlers; `SyncState`, `EMPTY_STATE` from `trigger.ts` (Task 3).
- Produces: `export const useSyncState = () => useMeta<SyncState>('sync', EMPTY_STATE)` in `src/db/hooks.ts`; `export function AccountSection()`.

Layout and copy, exactly as the spec's sketch. One tile, `aria-labelledby="set-account"`, heading "Account". Local state machine: `'form' | 'confirm' | 'reset' | 'other-account'`.

- Signed out, `form`: lead "Sign in to keep your questions and answers on all your devices. The app works the same without an account."; fields Email (`type="email"`, `autocomplete="email"`) and Password (`type="password"`, `autocomplete="current-password"`, `minLength={8}`); buttons "Sign in" (primary), "Create account" (secondary), "Forgot password?" (quiet); foot note "What is stored: your questions, answers, mock exams and settings. Only you can read them."
- `confirm`: "Enter the 6-digit code sent to {email}." field (`inputMode="numeric"`, `autocomplete="one-time-code"`, `maxLength={6}`), "Confirm" (primary), "Send a new code" (quiet).
- `reset`: code field plus New password (`autocomplete="new-password"`), "Save password" (primary).
- `other-account`: `Dialog` titled "This device has another account's data", body "Replace it with the data from {email}, or cancel and stay signed out.", buttons "Cancel" (primary, autofocus; calls `signOut`) and "Replace data on this device" (secondary; calls `replaceDeviceData`).
- Signed in: the email; a line "Last synced {date, time}." or, when `lastError`, "Could not sync. It will try again when you are online."; "Sync now" (secondary, `aria-busy` while running), "Sign out" (quiet); "Delete account" (quiet) opening a `Dialog` titled "Delete your account?", body "This removes the copy stored online. The data on this device stays.", buttons "Keep my account" (primary, autofocus) and "Delete account" (secondary).
- Errors render in the form with `role="alert"`; success uses `useAnnounce` ("Signed in", "Signed out", "Account deleted", "Synced").

- [ ] **Step 1: Write the failing test.** Extend `src/sync/boundary.test.ts`:

```ts
it('every sync trigger site calls requestSync', () => {
  for (const f of ['app/App.tsx', 'features/practice/Session.tsx', 'features/mock/MockExam.tsx', 'features/mock/MockEntry.tsx', 'features/settings/Settings.tsx'])
    expect(read(f)).toMatch(/requestSync\(\)/);
});
it('does not sync on each answer', () => {
  expect(read('db/repo.ts')).not.toMatch(/requestSync|sync\//);
});
```

- [ ] **Step 2: Run** `npx vitest run src/sync/boundary.test.ts` — expected: FAIL on the trigger sites.
- [ ] **Step 3: Build `AccountSection` and wire the triggers.**
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run build` — expected: PASS; in the build output, the supabase code is in its own chunk, not in the entry chunk (check the chunk list for `@supabase` only under a lazily loaded file).
- [ ] **Step 5: Verify in the preview with no env set:** Settings shows no Account section, no console errors, the app behaves as before.
- [ ] **Step 6: Commit** `git commit -m "Add the Account section and the sync triggers"`

---

### Task 6: Setup guide and end-to-end check

**Files:**
- Create: `docs/setup-supabase.md`
- Modify: `docs/plans/let-reviewer-plan.md` (§9: one line pointing to the spec for what changed)

- [ ] **Step 1: Write `docs/setup-supabase.md`**: the five setup steps from the spec, each with where to click and what to paste, including the two email templates' body (`Your code is {{ .Token }}`), "Confirm email" on, anonymous sign-ins off, minimum password length 8, where the URL and publishable key are found, the `.env.local` lines, and the pre-launch items (custom SMTP, site URL, host env vars).
- [ ] **Step 2: With the owner's project configured, check by hand** in two browser profiles: create an account and confirm by code; answer a Quick 10 in A, open B, sign in, see the answers; edit a question in B, sync both, see the edit in A; go offline in A, answer, come back online, see it reach B; forgot-password flow; sign in as a second account in A → the dialog, Cancel leaves A's data, Replace shows only the second account's data; delete the account → signed out, device data kept, rows gone in the dashboard; load sample answers in A, sync → no `demo-` rows in the dashboard.
- [ ] **Step 3: Run the Supabase security advisor** in the dashboard — expected: no warning for `public.docs` or `delete_my_account`.
- [ ] **Step 4: Commit** `git commit -m "Document the Supabase setup"`
