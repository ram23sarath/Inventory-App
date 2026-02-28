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

/** Track whether realtime/WebSocket connection is available */
export let isRealtimeAvailable = true;

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
    // Reduced timeout from 15s to 5s: fail fast on blocked networks so app can fall back to polling.
    // Some carrier networks block WebSocket connections; we want to detect this quickly.
    timeout: 5000,
  },
}) as any;

/** Helper to check if realtime is currently available (used by useItems for polling fallback) */
export function getRealtimeStatus(): boolean {
  return isRealtimeAvailable;
}

/** Track realtime connection status */
export function setRealtimeStatus(available: boolean): void {
  if (available !== isRealtimeAvailable) {
    console.log(`[Realtime] Status changed: ${available ? 'connected' : 'disconnected'}`);
    isRealtimeAvailable = available;
  }
}
