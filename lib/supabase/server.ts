// This module holds the service-role key. The `server-only` import makes the
// build fail loudly if it is ever pulled into a Client Component.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads the first environment variable that is actually set.
 *
 * Supabase renamed its keys (service_role -> secret, anon -> publishable) and
 * the Vercel integration provisions different names depending on when the
 * project was linked, so we accept either spelling.
 */
function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  return undefined;
}

export function getSupabaseUrl(): string | undefined {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

export function getSupabaseServiceKey(): string | undefined {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
}

/** True when the server has everything it needs to talk to Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceKey());
}

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client authenticated with the service-role key.
 *
 * The service role bypasses Row Level Security, which is exactly why this key
 * must never reach the browser. `pending_members` therefore has RLS enabled
 * with no public policies: writes are only possible through this client, from
 * inside a Server Action.
 */
export function createServiceRoleClient(): SupabaseClient {
  if (cached) return cached;

  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      // No browser session to persist or refresh in a Server Action.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
