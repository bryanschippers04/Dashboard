// Server-only DB helpers for Google Calendar integration. The browser
// never touches calendar_tokens — all access goes through these routes
// using the service-role admin client.

import { createAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForTokens,
  listEvents,
  normalizeEvent,
  refreshAccessToken,
  SYNC_BACK_DAYS,
  SYNC_FORWARD_DAYS,
  type NormalizedEvent,
} from '@/lib/googleCalendar'

interface TokenRow {
  access_token: string
  refresh_token: string | null
  expires_at: string
}

/**
 * Save a fresh token bundle from the OAuth callback.
 */
export async function storeTokens(
  userId: string,
  tokens: {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }
): Promise<void> {
  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
  // Don't blow away an existing refresh_token on re-auth — Google may
  // omit it if the user previously consented.
  const updates: Record<string, unknown> = {
    user_id: userId,
    access_token: tokens.access_token,
    expires_at: expiresAt.toISOString(),
    scope: tokens.scope ?? null,
    updated_at: new Date().toISOString(),
  }
  if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token

  const { error } = await admin
    .from('calendar_tokens')
    .upsert(updates, { onConflict: 'user_id' })
  if (error) throw new Error(`storeTokens: ${error.message}`)
}

/**
 * Get a valid access token for the user, refreshing if expired.
 * Returns null if the user has never connected.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`getValidAccessToken: ${error.message}`)
  if (!data) return null
  const row = data as TokenRow

  // 60-second buffer to avoid using a token that expires mid-request.
  const expiresAtMs = new Date(row.expires_at).getTime()
  if (expiresAtMs > Date.now() + 60_000) return row.access_token

  if (!row.refresh_token) {
    throw new Error(
      'Access token expired and no refresh_token on file. Re-connect Google Calendar.'
    )
  }

  const refreshed = await refreshAccessToken(row.refresh_token)
  await storeTokens(userId, {
    access_token: refreshed.access_token,
    expires_in: refreshed.expires_in,
    scope: refreshed.scope,
    // refresh_token rotation isn't standard for Google; existing one stays.
  })
  return refreshed.access_token
}

export async function deleteTokens(userId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('calendar_tokens').delete().eq('user_id', userId)
  await admin.from('calendar_events').delete().eq('user_id', userId)
}

export async function handleOAuthCallback(
  userId: string,
  code: string
): Promise<void> {
  const tokens = await exchangeCodeForTokens(code)
  await storeTokens(userId, tokens)
}

export interface SyncResult {
  fetched: number
  upserted: number
  window: { from: string; to: string }
}

export async function syncCalendarEvents(userId: string): Promise<SyncResult> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) {
    throw new Error('Calendar not connected.')
  }

  const now = new Date()
  const timeMin = new Date(now.getTime() - SYNC_BACK_DAYS * 86400000)
  const timeMax = new Date(now.getTime() + SYNC_FORWARD_DAYS * 86400000)

  const { events } = await listEvents(accessToken, timeMin, timeMax)
  const normalized: NormalizedEvent[] = events.map(normalizeEvent)

  if (normalized.length === 0) {
    return {
      fetched: 0,
      upserted: 0,
      window: { from: timeMin.toISOString(), to: timeMax.toISOString() },
    }
  }

  const admin = createAdminClient()
  const rows = normalized.map((e) => ({
    user_id: userId,
    google_event_id: e.google_event_id,
    calendar_id: 'primary',
    summary: e.summary,
    description: e.description,
    location: e.location,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,
    all_day: e.all_day,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('calendar_events')
    .upsert(rows, { onConflict: 'user_id,google_event_id' })
  if (error) throw new Error(`syncCalendarEvents: ${error.message}`)

  return {
    fetched: events.length,
    upserted: rows.length,
    window: { from: timeMin.toISOString(), to: timeMax.toISOString() },
  }
}

/**
 * Fetch events for the insights pipeline. Returns events overlapping
 * the given range, shaped for aggregateDay/aggregateWeek.
 */
export async function getEventsInRange(
  userId: string,
  from: Date,
  to: Date
): Promise<Array<{ start: string; title: string }>> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('calendar_events')
    .select('summary, start_at')
    .eq('user_id', userId)
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString())
    .order('start_at', { ascending: true })
  return ((data ?? []) as Array<{ summary: string | null; start_at: string }>)
    .filter((e) => !!e.start_at)
    .map((e) => ({
      start: e.start_at,
      title: e.summary ?? '(no title)',
    }))
}
