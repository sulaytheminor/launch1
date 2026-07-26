import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. This reads SUPABASE_SERVICE_ROLE_KEY, which has full
// read/write access and bypasses row level security. Only ever import
// this file from app/api/**/route.ts handlers — never from a client
// component ('use client'), or the key would end up in the browser bundle.
let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
