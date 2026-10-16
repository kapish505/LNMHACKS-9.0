import { NextResponse } from 'next/server'

/**
 * Sponsor interest form (the email box above the footer).
 *
 * POST { email, company? }  →  { ok, delivered }
 *
 * Delivery: set SPONSOR_WEBHOOK_URL to a Discord or Slack incoming webhook
 * (the payload carries both `content` and `text`, so either works) or any
 * endpoint that accepts JSON. Without it the submission is logged on the
 * server and the visitor still gets a confirmation, so the form never
 * dead-ends while the webhook is being set up.
 */

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Light in-memory rate limit: 5 submissions per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function allow(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) return false
  recent.push(now)
  hits.set(ip, recent)
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (!allow(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please try again in a few minutes.' }, { status: 429 })
  }

  const body = (await req.json().catch(() => null)) as { email?: unknown; company?: unknown; website?: unknown } | null
  // honeypot: real visitors never fill the hidden "website" field
  if (body?.website) return NextResponse.json({ ok: true, delivered: false })

  const email = String(body?.email ?? '').trim().toLowerCase()
  const company = String(body?.company ?? '').trim().slice(0, 120)
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const receivedAt = new Date().toISOString()
  const line = `New sponsor interest — ${email}${company ? ` (${company})` : ''}`
  const webhook = process.env.SPONSOR_WEBHOOK_URL

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: line, text: line, email, company, receivedAt, source: 'lnmhacks.in sponsor box' }),
      })
      if (!res.ok) throw new Error(`webhook responded ${res.status}`)
      return NextResponse.json({ ok: true, delivered: true })
    } catch (err) {
      console.error('[sponsor-interest] delivery failed', err)
      return NextResponse.json({ ok: false, error: "Couldn't send right now — please try again in a moment." }, { status: 502 })
    }
  }

  console.info('[sponsor-interest]', { email, company, receivedAt })
  return NextResponse.json({ ok: true, delivered: false })
}
