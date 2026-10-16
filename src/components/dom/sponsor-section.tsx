'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import AdmitOneTicket, { TICKET_LAYOUT, TICKET_TEXTURE, type TicketLayout, type TicketTexture } from '@/components/ui/admit-one-ticket'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** The ticket in LNMHACKS colours: royal-blue stock, cyan dither, lime watermark. */
const LNM_TEXTURE: TicketTexture = {
  ...TICKET_TEXTURE,
  colorBack: '#1e60ff',
  colorFront: '#63c4fd',
  colorHighlight: '#c0fe04',
}

const LNM_LAYOUT: TicketLayout = {
  ...TICKET_LAYOUT,
  inkColor: '#06102a',
  watermarkColor: '#c0fe04',
  watermarkOpacity: 0.5,
  labelFont: '"tronica-mono", "Courier New", monospace',
  nameFont: '"Rogient Block", "rogient-block", sans-serif',
}

const MAX_TICKET = 741

/**
 * Sponsor outreach, between Glimpses and the footer: an Admit One ticket with
 * the prospective sponsor's name on it, and an email box that posts to
 * /api/sponsor-interest.
 */
export function SponsorSection() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [ticketWidth, setTicketWidth] = useState(MAX_TICKET)
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  // the ticket is laid out in absolute units of its width, so it just needs
  // the width of the space it has
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setTicketWidth(Math.max(240, Math.min(MAX_TICKET, Math.floor(entry.contentRect.width))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    const honeypot = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/sponsor-interest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company, website: honeypot }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.')
      setStatus('sent')
      setMessage(`Thanks — we'll write to ${email} with the sponsor deck.`)
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  const input =
    'w-full rounded-xl border border-black/15 bg-white/85 px-4 py-3 text-base text-black outline-none transition placeholder:text-neutral-400 focus:border-[#1e60ff] focus:ring-2 focus:ring-[#1e60ff]/40 dark:border-white/15 dark:bg-black/30 dark:text-white dark:placeholder:text-neutral-500'

  return (
    <section id="sponsor-us" className="relative z-30 w-full pt-10 pb-24 sm:pt-16 sm:pb-32 pointer-events-auto" aria-labelledby="sponsor-us-title">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-14">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" style={{ fontFamily: '"tronica-mono", monospace' }}>
            Sponsor us
          </p>
          <h2
            id="sponsor-us-title"
            className="max-w-[18ch] text-3xl uppercase leading-[1.05] tracking-tight text-black transition-colors duration-200 sm:text-5xl md:text-6xl dark:text-white"
            style={{ fontFamily: '"Rogient Block", "rogient-block", sans-serif' }}
          >
            We&rsquo;d love to host you as a sponsor
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 sm:text-base" style={{ fontFamily: 'var(--font-manrope), "Manrope", sans-serif' }}>
            Put your name on the ticket, leave your email, and our partnerships team will send the sponsor deck.
          </p>
        </div>

        <div ref={wrapRef} className="mx-auto mt-10 flex w-full max-w-[741px] flex-col items-center gap-8 sm:mt-14">
          <AdmitOneTicket
            name={company.trim() || 'Your Company'}
            presenter="LNMHACKS presents"
            event="Sponsor pass · 9.0"
            venue="LNMIIT, Jaipur"
            dates="2026"
            stubText="Admit one"
            watermark="9.0"
            width={ticketWidth}
            texture={LNM_TEXTURE}
            layout={LNM_LAYOUT}
          />

          <form onSubmit={submit} noValidate className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                name="company"
                autoComplete="organization"
                maxLength={60}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                aria-label="Company name"
                className={input}
                style={{ fontFamily: '"tiktok", sans-serif' }}
              />
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle') setStatus('idle')
                }}
                placeholder="you@company.com"
                aria-label="Work email"
                className={input}
                style={{ fontFamily: '"tiktok", sans-serif' }}
              />
              {/* honeypot — hidden from people, filled by bots */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
              <button
                type="submit"
                disabled={status === 'sending' || !email}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1e60ff] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#fb3377] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e60ff]/60 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Reach out'} <span aria-hidden="true">→</span>
              </button>
            </div>
            <p
              role="status"
              aria-live="polite"
              className={`min-h-[1.25rem] text-sm ${status === 'error' ? 'text-[#fb3377]' : 'text-neutral-600 dark:text-neutral-400'}`}
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              {message || (status === 'idle' ? 'One reply from a human, with the deck. No newsletters.' : '')}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
