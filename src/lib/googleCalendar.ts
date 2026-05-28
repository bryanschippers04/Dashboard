// Google Calendar OAuth + REST wrapper. Raw fetch only (no extra deps).
// Read-only scope so we never mutate the user's calendar.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export const SYNC_BACK_DAYS = 7
export const SYNC_FORWARD_DAYS = 30

export interface CalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function readConfig(): CalendarConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google Calendar not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.'
    )
  }
  return { clientId, clientSecret, redirectUri }
}

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = readConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    // `consent` forces Google to return a refresh_token every time —
    // without it, subsequent connects only return an access_token and
    // we'd lose the ability to refresh.
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

export async function exchangeCodeForTokens(
  code: string
): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret, redirectUri } = readConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google token exchange failed (${res.status}): ${text}`)
  }
  return (await res.json()) as OAuthTokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  scope?: string
}> {
  const { clientId, clientSecret } = readConfig()
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google token refresh failed (${res.status}): ${text}`)
  }
  return (await res.json()) as {
    access_token: string
    expires_in: number
    scope?: string
  }
}

export interface GoogleEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  status?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

export interface ListEventsResult {
  events: GoogleEvent[]
}

export async function listEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<ListEventsResult> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Calendar list failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { items?: GoogleEvent[] }
  return { events: data.items ?? [] }
}

// Normalize a Google event into our DB shape. Handles all-day events
// (which use { date: 'YYYY-MM-DD' }) vs timed events ({ dateTime }).
export interface NormalizedEvent {
  google_event_id: string
  summary: string | null
  description: string | null
  location: string | null
  status: string | null
  start_at: string | null
  end_at: string | null
  all_day: boolean
}

export function normalizeEvent(e: GoogleEvent): NormalizedEvent {
  const allDay = !!e.start?.date && !e.start?.dateTime
  const startStr = e.start?.dateTime ?? e.start?.date ?? null
  const endStr = e.end?.dateTime ?? e.end?.date ?? null
  return {
    google_event_id: e.id,
    summary: e.summary ?? null,
    description: e.description ?? null,
    location: e.location ?? null,
    status: e.status ?? null,
    start_at: startStr,
    end_at: endStr,
    all_day: allDay,
  }
}
