// The Supabase client, and the sync run's view of the `docs` table. Loaded on demand (see trigger.ts).

import { createClient } from '@supabase/supabase-js';
import type { PushRow, Row } from './merge';
import type { Remote } from './run';

// Only the project URL and the publishable key reach the browser. Row-level security does the guarding.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

/** A value inside a PostgREST `or(...)` filter: quoted, so the colons and dots of a timestamp are literal. */
const quoted = (v: string) => `"${v.replace(/[\\"]/g, '\\$&')}"`;

export const remote: Remote = {
  async pull(after, limit) {
    // Rows from one push share an `updated_at` (the transaction's time), so the id breaks the tie.
    const { data, error } = await supabase
      .from('docs')
      .select('collection,id,data,deleted,updated_at')
      .or(`updated_at.gt.${quoted(after.at)},and(updated_at.eq.${quoted(after.at)},id.gt.${quoted(after.id)})`)
      .order('updated_at')
      .order('id')
      .limit(limit);
    if (error) throw new Error(error.message);
    return data as Row[];
  },
  async push(rows: PushRow[]) {
    // The owner is filled in by the column default (auth.uid()), `updated_at` by the trigger.
    const { error } = await supabase.from('docs').upsert(rows, { onConflict: 'user_id,collection,id' });
    if (error) throw new Error(error.message);
  },
};
