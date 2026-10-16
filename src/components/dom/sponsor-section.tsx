'use client'

import { useId, useState, type FormEvent } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const PERKS = [
  { accent: '#fb3377', title: 'Brand presence', text: 'Across the venue, the livestream, the swag and every channel the hackers live on for 72 hours.' },
  { accent: '#63c4fd', title: 'Meet the builders', text: 'First look at the teams and the projects they ship — mentor them, judge a track, hire them.' },
  { accent: '#c0fe04', title: 'Host something', text: 'Run a track, a workshop, an API bounty or a prize in your name. We shape it with you.' },
]

/**
 * Sponsor outreach — sits between Glimpses and the footer on the page's own
 * background, so the scroll flow is unchanged. The email box posts to
 * /api/sponsor-interest.
 */
export function SponsorSection() {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const emailId = useId()
  const companyId = useId()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    const form = e.currentTarget
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value
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
      setCompany('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  return (
    <section
      id="sponsor-us"
      className="relative z-30 w-full pt-10 pb-24 sm:pt-16 sm:pb-32 pointer-events-auto"
      aria-labelledby="sponsor-us-title"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-14">
        {/* pitch */}
        <div className="lg:col-span-6">
          <span
            className="mb-2 block text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            [ SPONSOR US ]
          </span>
          <h2
            id="sponsor-us-title"
            className="text-3xl font-black uppercase tracking-tight text-black transition-colors duration-200 sm:text-5xl md:text-6xl dark:text-white"
            style={{ fontFamily: '"tiktok", sans-serif', fontVariationSettings: '"wght" 850, "wdth" 110', letterSpacing: '-0.03em' }}
          >
            We&rsquo;d love to host you
            <br />
            <span className="text-[#1e60ff] dark:text-[#63c4fd]">as a sponsor</span>
          </h2>
          <p
            className="mt-4 max-w-xl text-base tracking-tight text-[rgba(54,54,48,0.6)] transition-colors duration-200 sm:text-lg md:text-xl dark:text-neutral-400"
            style={{ fontFamily: '"tiktok", sans-serif' }}
          >
            Put your brand in front of India&rsquo;s largest student-run hackathon community — the builders, the mentors, the
            next hires. Leave your email and our partnerships team will get back with the deck.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {PERKS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: p.accent, boxShadow: `0 0 12px ${p.accent}` }} aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-black dark:text-white" style={{ fontFamily: '"tiktok", sans-serif' }}>
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[rgba(54,54,48,0.6)] dark:text-neutral-400" style={{ fontFamily: '"tiktok", sans-serif' }}>
                    {p.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* email box */}
        <div className="lg:col-span-6">
          <form
            onSubmit={submit}
            noValidate
            className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-md sm:p-8 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, #fb3377 0%, #63c4fd 50%, #1e60ff 100%)' }}
              aria-hidden="true"
            />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1e60ff] dark:text-[#63c4fd]" style={{ fontFamily: '"tronica-mono", monospace' }}>
              Partnerships · LNMHACKS 9.0
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-black dark:text-white sm:text-2xl" style={{ fontFamily: '"tiktok", sans-serif' }}>
              Get the sponsor deck
            </p>

            <div className="mt-6 grid gap-4">
              <div>
                <label htmlFor={emailId} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
                  Work email
                </label>
                <input
                  id={emailId}
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
                  className="w-full rounded-xl border border-black/15 bg-white/85 px-4 py-3 text-base text-black outline-none transition placeholder:text-neutral-400 focus:border-[#1e60ff] focus:ring-2 focus:ring-[#1e60ff]/40 dark:border-white/15 dark:bg-black/30 dark:text-white dark:placeholder:text-neutral-500"
                  style={{ fontFamily: '"tiktok", sans-serif' }}
                />
              </div>
              <div>
                <label htmlFor={companyId} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
                  Company <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  id={companyId}
                  type="text"
                  name="company"
                  autoComplete="organization"
                  maxLength={120}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-xl border border-black/15 bg-white/85 px-4 py-3 text-base text-black outline-none transition placeholder:text-neutral-400 focus:border-[#1e60ff] focus:ring-2 focus:ring-[#1e60ff]/40 dark:border-white/15 dark:bg-black/30 dark:text-white dark:placeholder:text-neutral-500"
                  style={{ fontFamily: '"tiktok", sans-serif' }}
                />
              </div>
              {/* honeypot — hidden from people, filled by bots */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />

              <button
                type="submit"
                disabled={status === 'sending' || !email}
                className="group mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e60ff] px-5 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#fb3377] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e60ff]/60 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Reach out'}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>

            <p
              role="status"
              aria-live="polite"
              className={`mt-4 min-h-[1.25rem] text-sm ${status === 'error' ? 'text-[#fb3377]' : 'text-neutral-600 dark:text-neutral-400'}`}
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              {message || (status === 'idle' ? 'No newsletters — one reply from a human, with the deck.' : '')}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
