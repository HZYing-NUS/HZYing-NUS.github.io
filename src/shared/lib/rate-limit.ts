import { md5 } from '@/shared/lib/hash';

type MinIntervalOptions = {
  /**
   * Minimum interval between requests for the same key.
   */
  intervalMs: number;
  /**
   * Optional namespace to avoid key collisions across endpoints.
   */
  keyPrefix?: string;
  /**
   * Extra key material if you want to scope more granularly.
   */
  extraKey?: string;
};

type Store = Map<string, number>;

type FixedWindowOptions = {
  limit: number;
  windowSeconds: number;
  keyPrefix?: string;
  key?: string;
};

declare global {
  var __minIntervalRateLimitStore: Store | undefined;
}

function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be "client, proxy1, proxy2"
    return xff.split(',')[0]?.trim() || '';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    ''
  );
}

function getStore(): Store {
  if (!globalThis.__minIntervalRateLimitStore) {
    globalThis.__minIntervalRateLimitStore = new Map();
  }
  return globalThis.__minIntervalRateLimitStore;
}

function buildKey(request: Request, opts: MinIntervalOptions): string {
  const url = new URL(request.url);
  const ip = getClientIpFromRequest(request);
  const cookie = request.headers.get('cookie') || '';
  const cookieHash = cookie ? md5(cookie) : 'no-cookie';
  const prefix = opts.keyPrefix || 'min-interval';
  const extra = opts.extraKey ? `|${opts.extraKey}` : '';
  return `${prefix}|${request.method}|${url.pathname}|${ip}|${cookieHash}${extra}`;
}

/**
 * Enforce a minimum interval for the same endpoint + identity.
 *
 * Returns a 429 Response when the request is too frequent, otherwise null.
 */
export function enforceMinIntervalRateLimit(
  request: Request,
  opts: MinIntervalOptions
): Response | null {
  const intervalMs = Math.max(0, Number(opts.intervalMs) || 0);
  if (!intervalMs) return null;

  const now = Date.now();
  const store = getStore();
  const key = buildKey(request, opts);
  const last = store.get(key);

  if (typeof last === 'number') {
    const delta = now - last;
    if (delta >= 0 && delta < intervalMs) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((intervalMs - delta) / 1000)
      );
      return rateLimitResponse(retryAfterSeconds);
    }
  }

  store.set(key, now);
  return null;
}

export async function enforceFixedWindowRateLimit(
  request: Request,
  opts: FixedWindowOptions
): Promise<Response | null> {
  const limit = Math.max(1, Number(opts.limit) || 1);
  const windowSeconds = Math.max(1, Number(opts.windowSeconds) || 60);
  const key = opts.key || buildKey(request, { intervalMs: 0, keyPrefix: opts.keyPrefix || 'fixed-window' });
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(windowSeconds), 'NX'],
        ]),
      });
      const result = await response.json();
      const count = Number(result?.[0]?.result);
      if (Number.isFinite(count)) {
        return count > limit ? rateLimitResponse(windowSeconds) : null;
      }
    } catch {
      // The in-memory fallback keeps the endpoint usable if optional Redis is unavailable.
    }
  }

  const store = getStore();
  const bucketKey = `${key}|${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const count = (store.get(bucketKey) || 0) + 1;
  store.set(bucketKey, count);
  return count > limit ? rateLimitResponse(windowSeconds) : null;
}

function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      error: 'too_many_requests',
      message: `Please retry after ${retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfterSeconds),
      },
    }
  );
}
