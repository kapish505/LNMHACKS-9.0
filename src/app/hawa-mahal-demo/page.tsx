'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HawaMahalFacade,
  HAWA_MAHAL_INVENTORY,
  LIGHT_STATES,
  type FacadePalette,
  type HawaMahalLights,
  type LightState,
  type SequenceOrder,
  type WindowTimeline,
} from '@/components/dom/hawa-mahal'

const ORDERS: SequenceOrder[] = ['up', 'down', 'left', 'right', 'centre-out', 'edges-in', 'ripple', 'random']
const FLOORS = [1, 2, 3, 4, 5] as const

const btn =
  'rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/85 transition hover:bg-white/15 disabled:opacity-40'

/**
 * Minimal demonstration of the facade and its lighting API: individual
 * windows, whole floors, sequences, a per-window time map, and reset.
 */
export default function HawaMahalDemoPage() {
  const lightsRef = useRef<HawaMahalLights | null>(null)
  const [palette, setPalette] = useState<FacadePalette>('night')
  const [selected, setSelected] = useState<string>('window-f05-c01')
  const [part, setPart] = useState<'' | '-c' | '-l' | '-r'>('')
  const [selectedState, setSelectedState] = useState<LightState>('off')
  const [status, setStatus] = useState('Ready')
  const [log, setLog] = useState<string[]>([])

  const targetId = selected + part
  const windows = useMemo(() => HAWA_MAHAL_INVENTORY.windows, [])

  const say = useCallback((msg: string) => {
    setStatus(msg)
    setLog((l) => [msg, ...l].slice(0, 8))
  }, [])

  const refreshSelected = useCallback(() => {
    const l = lightsRef.current
    if (l) setSelectedState(l.getWindowLight(targetId))
  }, [targetId])

  useEffect(refreshSelected, [refreshSelected])

  const setWindow = (state: LightState) => {
    const l = lightsRef.current
    if (!l) return
    l.setWindowLight(targetId, state)
    say(`setWindowLight('${targetId}', '${state}')`)
    refreshSelected()
  }

  const setFloor = (floor: (typeof FLOORS)[number], state: LightState) => {
    const l = lightsRef.current
    if (!l) return
    const n = l.setFloorLight(floor, state)
    say(`setFloorLight(${floor}, '${state}') → ${n} openings`)
    refreshSelected()
  }

  const run = (order: SequenceOrder) => {
    const l = lightsRef.current
    if (!l) return
    l.runLightingSequence({ order, stepMs: 70, state: 'active', holdMs: 900, settleTo: 'soft', seed: 42, onDone: () => say(`sequence '${order}' finished`) })
    say(`runLightingSequence({ order: '${order}', stepMs: 70, holdMs: 900 })`)
  }

  /** Every window lit on its own time: delay grows with floor and distance from the axis. */
  const runTimeMap = () => {
    const l = lightsRef.current
    if (!l) return
    l.runLightingSequence({
      order: 'up',
      state: 'accent',
      settleTo: 'active',
      timing: (w) => ({ delay: (w.floor - 2) * 650 + Math.abs(w.cx - 1004) * 0.9, hold: 500 + (w.kind === 'large' ? 400 : 0) }),
      onDone: () => say('time map finished'),
    })
    say('runLightingSequence({ timing: (w) => ({ delay: f(floor, cx), hold: g(kind) }) })')
  }

  /** Explicit per-window timeline: three windows blink on their own clocks. */
  const runTimeline = () => {
    const l = lightsRef.current
    if (!l) return
    const tl: WindowTimeline = {
      'window-f05-c01': [{ at: 0, state: 'accent' }, { at: 1200, state: 'soft' }, { at: 2400, state: 'accent' }],
      'window-f02-c07-c': [{ at: 300, state: 'active' }, { at: 900, state: 'off' }, { at: 1500, state: 'active' }],
      'window-f03-c07': [{ at: 600, state: 'soft' }, { at: 2000, state: 'active' }],
    }
    l.playTimeline(tl, { loop: true })
    say('playTimeline({ … }, { loop: true })')
  }

  const reset = () => {
    lightsRef.current?.clearLights()
    say('clearLights()')
    refreshSelected()
  }

  // click a window in the facade to cycle its state
  const onFacadeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const opening = (e.target as Element).closest<Element>('.hm-opening')
    const l = lightsRef.current
    if (!opening || !l) return
    const cur = l.getWindowLight(opening.id)
    const next = LIGHT_STATES[(LIGHT_STATES.indexOf(cur) + 1) % LIGHT_STATES.length]
    l.setWindowLight(opening.id, next)
    say(`click → setWindowLight('${opening.id}', '${next}')`)
    const bay = opening.closest<Element>('.hm-bay')
    if (bay) {
      setSelected(bay.id)
      setPart(`-${opening.id.slice(-1)}` as '-c' | '-l' | '-r')
    }
  }

  return (
    <main className="min-h-screen bg-[#070a1f] text-white">
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-6 pt-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ fontFamily: '"tiktok", sans-serif' }}>
            Hawa Mahal — interactive facade
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {HAWA_MAHAL_INVENTORY.windows.length} jharokhas · {HAWA_MAHAL_INVENTORY.openings.length} addressable openings ·{' '}
            {HAWA_MAHAL_INVENTORY.niches.length} ground niches. Click any window to cycle its state.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={btn} aria-pressed={palette === 'night'} onClick={() => setPalette('night')}>Night</button>
          <button className={btn} aria-pressed={palette === 'day'} onClick={() => setPalette('day')}>Day</button>
        </div>
      </header>

      <section className="mx-auto mt-6 max-w-7xl px-6">
        <div
          className="overflow-hidden rounded-xl border border-white/10"
          style={{ background: palette === 'night' ? 'linear-gradient(#050816, #0b1a4a)' : 'linear-gradient(#5ea7e6, #bfe0ff)' }}
          onClick={onFacadeClick}
        >
          <HawaMahalFacade ref={lightsRef} palette={palette} style={{ width: '100%', cursor: 'pointer' }} />
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#63c4fd]">Individual window</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <select className="rounded-md border border-white/15 bg-[#0b1024] px-2 py-1.5 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {windows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} · floor {w.floor} · {w.kind} {w.cls}
                </option>
              ))}
            </select>
            <select className="rounded-md border border-white/15 bg-[#0b1024] px-2 py-1.5 text-sm" value={part} onChange={(e) => setPart(e.target.value as typeof part)}>
              <option value="">whole jharokha</option>
              <option value="-c">centre opening</option>
              <option value="-l">left opening</option>
              <option value="-r">right opening</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-white/60">
            <code>{targetId}</code> is <b className="text-white">{selectedState}</b>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LIGHT_STATES.map((s) => (
              <button key={s} className={btn} onClick={() => setWindow(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#fb3377]">Whole floor</h2>
          <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
            {FLOORS.map((fl) => (
              <div key={fl} className="contents">
                <span className="text-xs text-white/70">Floor {fl}{fl === 1 ? ' (niches)' : ''}</span>
                <div className="flex flex-wrap gap-1.5">
                  {LIGHT_STATES.map((s) => (
                    <button key={s} className={btn} onClick={() => setFloor(fl, s)}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#f2c232]">Sequences &amp; time control</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ORDERS.map((o) => (
              <button key={o} className={btn} onClick={() => run(o)}>{o}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} onClick={runTimeMap}>per-window time map</button>
            <button className={btn} onClick={runTimeline}>explicit timeline (loop)</button>
            <button className={`${btn} border-[#fb3377]/60`} onClick={reset}>reset all</button>
          </div>
          <p className="mt-3 text-xs text-white/60">{status}</p>
          <ol className="mt-2 space-y-1 text-[11px] text-white/45">
            {log.map((l, i) => (
              <li key={i}><code>{l}</code></li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
