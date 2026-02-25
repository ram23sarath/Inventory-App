import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Detect stale WebSocket connections faster (Android drops connections silently).
    // Default heartbeat is 30 s — halving it means dead connections are found in ~15 s.
    heartbeatIntervalMs: 15000,
    // Channel reply timeout: how long to wait for a push/join ack before giving up.
    // Default is 10 s; 15 s gives slow mobile networks a bit more room.
    timeout: 15000,
  },
}) as any;
