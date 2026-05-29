import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Bucket =
  | 'assistant'
  | 'insights_weekly'
  | 'insights_daily'
  | 'journal'
  | 'finance_sync'
  | 'calendar_sync'

interface RateLimitConfig {
  /** Max requests allowed within the window. */
  limit: number
  /** Rolling window length in seconds. */
  windowSeconds: number
}

/**
 * Defaults are deliberately generous for a single-user app but
 * tight enough that a runaway loop can't burn through hundreds of
 * Claude calls overnight. Env vars override per bucket; values are
 * `"<limit>/<windowSeconds>"`, e.g. "60/3600".
 */
const DEFAULTS: Record<Bucket, RateLimitConfig> = {
  assistant: { limit: 60, windowSeconds: 3600 },
  insights_weekly: { limit: 5, windowSeconds: 86400 },
  insights_daily: { limit: 20, windowSeconds: 86400 },
  journal: { limit: 100, windowSeconds: 86400 },
  finance_sync: { limit: 30, windowSeconds: 3600 },
  calendar_sync: { limit: 30, windowSeconds: 3600 },
}

function parseEnvOverride(envValue: string | undefined): RateLimitConfig | null {
  if (!envValue) return null
  const [l, w] = envValue.split('/')
  const limit = Number(l)
  const windowSeconds = Number(w)
  if (!Number.isInteger(limit) || limit <= 0) return null
  if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) return null
  return { limit, windowSeconds }
}

function configFor(bucket: Bucket): RateLimitConfig {
  const envKey = `RATE_LIMIT_${bucket.toUpperCase()}`
  return parseEnvOverride(process.env[envKey]) ?? DEFAULTS[bucket]
}

function windowStartIso(now: Date, windowSeconds: number): string {
  // Tumbling window aligned to epoch — simple, deterministic, no
  // skew between concurrent requests.
  const bucketMs = windowSeconds * 1000
  const start = Math.floor(now.getTime() / bucketMs) * bucketMs
  return new Date(start).toISOString()
}

export interface RateLimitOk {
  ok: true
  limit: number
  remaining: number
  reset: number // unix seconds when the current window ends
}

export interface RateLimitHit {
  ok: false
  response: NextResponse
}

export type RateLimitResult = RateLimitOk | RateLimitHit

/**
 * Increment-and-check for one bucket. Call at the top of any
 * Claude-billed (or otherwise abuse-prone) endpoint. On 429 the
 * caller should return `result.response` directly.
 */
export async function hitRateLimit(
  userId: string,
  bucket: Bucket
): Promise<RateLimitResult> {
  const cfg = configFor(bucket)
  const now = new Date()
  const windowStart = windowStartIso(now, cfg.windowSeconds)
  const resetSec = Math.floor(
    (new Date(windowStart).getTime() + cfg.windowSeconds * 1000) / 1000
  )

  const admin = createAdminClient()

  // Read the current count first. If there's headroom, increment.
  const { data: existing } = await admin
    .from('api_rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('bucket', bucket)
    .eq('window_start', windowStart)
    .maybeSingle()

  const current = existing?.count ?? 0

  if (current >= cfg.limit) {
    const retryAfter = Math.max(1, resetSec - Math.floor(now.getTime() / 1000))
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          bucket,
          limit: cfg.limit,
          retry_after_seconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(cfg.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetSec),
          },
        }
      ),
    }
  }

  // Upsert + increment. Two concurrent requests at the limit edge
  // could race here, but for a single-user app the simple read-
  // then-write is acceptable — the worst case is one extra call
  // through, not unbounded abuse.
  const { error: upsertErr } = await admin.from('api_rate_limits').upsert(
    {
      user_id: userId,
      bucket,
      window_start: windowStart,
      count: current + 1,
    },
    { onConflict: 'user_id,bucket,window_start' }
  )
  if (upsertErr) {
    // Fail-open: never break the user-facing flow because the
    // counter table is unhappy. Log + let the request through.
    console.error('rate limit upsert failed:', upsertErr.message)
  }

  return {
    ok: true,
    limit: cfg.limit,
    remaining: Math.max(0, cfg.limit - (current + 1)),
    reset: resetSec,
  }
}

/**
 * Attach the standard X-RateLimit-* headers to a successful response.
 */
export function withRateLimitHeaders(
  res: NextResponse,
  result: RateLimitOk
): NextResponse {
  res.headers.set('X-RateLimit-Limit', String(result.limit))
  res.headers.set('X-RateLimit-Remaining', String(result.remaining))
  res.headers.set('X-RateLimit-Reset', String(result.reset))
  return res
}
