import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton — reuse the same client across requests in the same server process.
// createClient() builds a connection pool; recreating it on every request wastes
// time and connections.
let _client: SupabaseClient | null = null;

export function createServerSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        // Keep-alive header so the underlying HTTP connection is reused
        headers: { 'Connection': 'keep-alive' },
      },
    }
  );
  return _client;
}
