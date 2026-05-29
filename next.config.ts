import type { NextConfig } from 'next'

// Supabase host derived at runtime so CSP allows the project's
// specific subdomain rather than `*.supabase.co`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHost = (() => {
  if (!supabaseUrl) return ''
  try {
    return new URL(supabaseUrl).host
  } catch {
    return ''
  }
})()

const connectSources = [
  "'self'",
  'https://api.anthropic.com',
  'https://accounts.google.com',
  'https://oauth2.googleapis.com',
  'https://www.googleapis.com',
  'https://api.enablebanking.com',
  supabaseHost ? `https://${supabaseHost}` : '',
  supabaseHost ? `wss://${supabaseHost}` : '',
]
  .filter(Boolean)
  .join(' ')

// Next.js inlines small style/script blobs and uses runtime eval in
// dev only. `'unsafe-inline'` on style-src is needed for Tailwind's
// inlined utility styles; `'unsafe-eval'` is dev-only and stripped
// in production by the conditional below.
const isProd = process.env.NODE_ENV === 'production'

const scriptSrc = ["'self'", "'unsafe-inline'"]
if (!isProd) scriptSrc.push("'unsafe-eval'")

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
