import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in Client Components (browser).
 * Uses the public anon key — safe to expose.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}
