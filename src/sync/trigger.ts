// The only file in src/sync the rest of the app imports. It has no Supabase code: the client, the
// merge and the account calls load on demand, so a signed-out user never downloads them.

/** False when the build has no Supabase project: the Account section is hidden and nothing here runs. */
export const syncAvailable = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** This device's sync position. Kept in `meta` (key 'sync'), never synced. */
export interface SyncState {
  /** The account this device's data belongs to. Kept after sign-out, so a different account is noticed. */
  userId: string | null;
  signedIn: boolean;
  /** Pull cursor: the `updated_at` and id of the last row applied. */
  pulledAt: string;
  pulledId: string;
  /** Push cursor: device time when the last successful push started. */
  pushedAt: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

export const EPOCH = '1970-01-01T00:00:00.000Z';
export const EMPTY_STATE: SyncState = { userId: null, signedIn: false, pulledAt: EPOCH, pulledId: '', pushedAt: EPOCH, lastSyncAt: null, lastError: null };

/**
 * Starts a background sync and returns at once. Does nothing signed out or with no project set. Never throws.
 * `full` starts over from the beginning: for after a backup restore, when old records are new to the account.
 */
export function requestSync(opts: { full?: boolean } = {}): void {
  if (!syncAvailable) return;
  import('./auth').then((m) => m.syncNow(opts)).catch(() => {});
}
