const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function buildSupabaseUrl(event) {
  const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) environment variable');
  }

  const path = event.path.replace(/^.*\/supabase-auth\/?/, '');
  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const normalizedPath = path ? `/${path}` : '';
  return `${baseUrl}/auth/v1${normalizedPath}${query}`;
}

function buildForwardHeaders(event) {
  const headers = {};

  for (const [rawKey, value] of Object.entries(event.headers || {})) {
    const key = rawKey.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(key)) continue;
    if (key.startsWith('x-forwarded-')) continue;
    headers[key] = value;
  }

  headers['accept-encoding'] = 'identity';
  return headers;
}

function buildResponseHeaders(upstreamHeaders) {
  const responseHeaders = {
    'cache-control': 'no-store',
  };

  for (const [key, value] of upstreamHeaders.entries()) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
    responseHeaders[key] = value;
  }

  return responseHeaders;
}

exports.handler = async (event) => {
  const startMs = Date.now();
  const authEndpoint = event.path.replace(/^.*\/supabase-auth\/?/, '') || 'token';
  const method = event.httpMethod || 'GET';

  console.log(`[Netlify] AUTH PROXY REQUEST: ${method} /supabase-auth/${authEndpoint}`, {
    path: event.path,
    clientIp: event.headers['client-ip'] || 'unknown',
  });

  if (event.httpMethod === 'OPTIONS') {
    console.log(`[Netlify] AUTH PROXY PREFLIGHT: 204 No Content in ${Date.now() - startMs}ms`);
    return {
      statusCode: 204,
      headers: {
        'cache-control': 'no-store',
      },
      body: '',
    };
  }

  try {
    const targetUrl = buildSupabaseUrl(event);
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const headers = buildForwardHeaders(event);

    console.log(`[Netlify] Forwarding to Supabase: ${method} ${new URL(targetUrl).pathname}`);
    const fetchStartMs = Date.now();

    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? event.body : undefined,
    });

    const fetchElapsed = Date.now() - fetchStartMs;
    const body = await upstreamResponse.text();
    const totalElapsed = Date.now() - startMs;

    console.log(`[Netlify] AUTH PROXY RESPONSE: ${upstreamResponse.status} from Supabase (fetch: ${fetchElapsed}ms, total: ${totalElapsed}ms)`);

    return {
      statusCode: upstreamResponse.status,
      headers: buildResponseHeaders(upstreamResponse.headers),
      body,
    };
  } catch (error) {
    const elapsed = Date.now() - startMs;
    console.error(`[Netlify] AUTH PROXY ERROR after ${elapsed}ms:`, error instanceof Error ? error.message : error);

    return {
      statusCode: 502,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
      body: JSON.stringify({
        error: 'Auth proxy upstream request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
