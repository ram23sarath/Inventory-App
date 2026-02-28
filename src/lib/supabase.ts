import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_PROXY_PATH = '/supabase-auth';
const REST_PROXY_PATH = '/supabase-rest';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

/** Track whether realtime/WebSocket connection is available */
export let isRealtimeAvailable = true;

function shouldProxyRequests(): boolean {
  return import.meta.env.PROD && typeof window !== 'undefined';
}

function isSupabaseAuthRequest(url: URL): boolean {
  const supabaseOrigin = new URL(supabaseUrl).origin;
  return url.origin === supabaseOrigin && url.pathname.startsWith('/auth/v1/');
}

function isSupabaseRestRequest(url: URL): boolean {
  const supabaseOrigin = new URL(supabaseUrl).origin;
  return url.origin === supabaseOrigin && url.pathname.startsWith('/rest/v1/');
}

function buildAuthProxyUrl(url: URL): string {
  const authPath = url.pathname.replace(/^\/auth\/v1\/?/, '');
  const normalizedPath = authPath.length > 0 ? `/${authPath}` : '';
  return `${AUTH_PROXY_PATH}${normalizedPath}${url.search}`;
}

function buildRestProxyUrl(url: URL): string {
  const restPath = url.pathname.replace(/^\/rest\/v1\/?/, '');
  const normalizedPath = restPath.length > 0 ? `/${restPath}` : '';
  return `${REST_PROXY_PATH}${normalizedPath}${url.search}`;
}

async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input, init);
  const requestUrl = new URL(request.url);
  const method = (request.method || 'GET').toUpperCase();

  if (!shouldProxyRequests()) {
    console.log(`[Supabase] Direct fetch (dev): ${method} ${requestUrl.pathname}`);
    return globalThis.fetch(request);
  }

  // Route auth requests through /supabase-auth proxy
  if (isSupabaseAuthRequest(requestUrl)) {
    const proxyUrl = buildAuthProxyUrl(requestUrl);
    const headers = new Headers(request.headers);
    const startMs = Date.now();
    const authEndpoint = requestUrl.pathname.replace(/^.*\/auth\/v1\/?/, '') || 'token';

    console.log(`[Supabase] AUTH PROXY START: ${method} /supabase-auth/${authEndpoint}`);

    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : await request.clone().arrayBuffer();

    try {
      const response = await globalThis.fetch(proxyUrl, {
        method,
        headers,
        body,
        credentials: 'same-origin',
      });
      const elapsed = Date.now() - startMs;
      console.log(`[Supabase] AUTH PROXY COMPLETE: ${response.status} in ${elapsed}ms`);
      return response;
    } catch (error) {
      const elapsed = Date.now() - startMs;
      console.error(`[Supabase] AUTH PROXY FAILED after ${elapsed}ms:`, error);
      throw error;
    }
  }

  // Route REST API requests through /supabase-rest proxy
  if (isSupabaseRestRequest(requestUrl)) {
    const proxyUrl = buildRestProxyUrl(requestUrl);
    const headers = new Headers(request.headers);
    const startMs = Date.now();
    const restEndpoint = requestUrl.pathname.replace(/^.*\/rest\/v1\/?/, '') || '(root)';

    console.log(`[Supabase] REST PROXY START: ${method} /supabase-rest/${restEndpoint}`);

    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : await request.clone().arrayBuffer();

    try {
      const response = await globalThis.fetch(proxyUrl, {
        method,
        headers,
        body,
        credentials: 'same-origin',
      });
      const elapsed = Date.now() - startMs;
      console.log(`[Supabase] REST PROXY COMPLETE: ${response.status} in ${elapsed}ms`);
      return response;
    } catch (error) {
      const elapsed = Date.now() - startMs;
      console.error(`[Supabase] REST PROXY FAILED after ${elapsed}ms:`, error);
      throw error;
    }
  }

  // Non-Supabase requests pass through normally
  console.log(`[Supabase] External API fetch: ${method} ${requestUrl.origin}${requestUrl.pathname}`);
  return globalThis.fetch(request);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
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
    // Make heartbeat less aggressive and allow more time for flaky mobile networks
    heartbeatIntervalMs: 30000,
    // Increase timeout to tolerate transient carrier hiccups before falling back
    timeout: 15000,
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
