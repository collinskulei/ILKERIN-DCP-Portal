import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for background jobs (cron routes, webhooks) that have
 * no user session to read RLS policies against. Never import this into
 * anything reachable from a user-facing request without its own auth check.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
