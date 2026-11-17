// The one sync file the rest of the app may import. It holds no Supabase code: the client, the sync run
// and the account calls load on demand, so a signed-out user never downloads them.

/** Sync state for this device. Lives in the `meta` table under 'sync' and is never synced itself. */
export interface SyncState {
  /** The account this device's data belongs to. Kept after sign-out, so another account cannot mix in unasked. */
  userId: string | null;
  signedIn: boolean;
  /** Pull cursor: the server time and id of the last row applied. */
  pulledAt: string;
  pulledId: string;
  /** Push cursor: device time when the last successful push started. */
  pushedAt: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

const EPOCH = '1970-01-01T00:00:00.000Z';
export const EMPTY_STATE: SyncState = { userId: null, signedIn: false, pulledAt: EPOCH, pulledId: '', pushedAt: EPOCH, lastSyncAt: null, lastError: null };

/** False when the build has no Supabase project: the Account section is hidden and nothing here runs. */
export const syncAvailable = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Starts a sync in the background. Safe to call anywhere: signed out or offline, it does nothing. */
export function requestSync(): void {
  if (!syncAvailable) return;
  import('./auth').then((m) => m.syncNow()).catch(() => {});
}
