/**
 * Lighting API for the Hawa Mahal facade SVG.
 *
 * The SVG (see scripts/hawa-mahal/build.mjs) marks every addressable opening
 * as `<g class="hm-opening" data-light="off">`. Lighting is purely a matter of
 * setting `data-light` on those groups; the SVG's own stylesheet turns the
 * state into pane colours and glow overlays, so the architectural geometry is
 * never touched.
 *
 * Addressable ids:
 *   window-fNN-cMM       a whole jharokha (floor NN, column MM, left → right)
 *   window-fNN-cMM-c/-l/-r   its centre, left and right openings
 *   niche-f01-cMM        a blind niche on the ground storey
 *   tower-l-arch-N, tower-r-arch-N, turret-Nl-arch-N …  pavilion/turret arches
 *
 * Everything is deterministic: the same calls (and the same `seed`) always
 * produce the same timeline.
 */
import { HAWA_MAHAL_INVENTORY } from './facade.generated'

export type LightState = 'off' | 'soft' | 'active' | 'accent'
export const LIGHT_STATES: readonly LightState[] = ['off', 'soft', 'active', 'accent'] as const

export type FloorNumber = 1 | 2 | 3 | 4 | 5

export interface WindowInfo {
  id: string
  floor: number
  col: number
  kind: 'large' | 'small'
  cls: string
  /** Horizontal centre in SVG units (viewBox 0 0 2022 778). */
  cx: number
}

export interface TimelineEvent {
  /** Milliseconds from the start of the timeline. */
  at: number
  state: LightState
  /**
   * Optionally change how fast panes fade from this event on (sets the SVG's
   * `--hm-transition`). Use a short value for crisp pattern frames and restore
   * the default (650) afterwards.
   */
  transitionMs?: number
}

/** Per-window schedule: each window (or opening) gets its own list of events. */
export type WindowTimeline = Record<string, TimelineEvent[]>

export interface WindowTiming {
  /** Delay before this window lights, ms. */
  delay: number
  /** How long it holds the `state` before settling, ms. 0 or undefined = hold forever. */
  hold?: number
  /** State to reach; defaults to the sequence's `state`. */
  state?: LightState
  /** State after the hold; defaults to the sequence's `settleTo`. */
  settleTo?: LightState
}

export type SequenceOrder = 'up' | 'down' | 'left' | 'right' | 'centre-out' | 'edges-in' | 'random' | 'ripple'

export interface SequenceOptions {
  /** Which order the windows light in. Default 'up' (ground storey to apex). */
  order?: SequenceOrder
  /** State each window reaches. Default 'active'. */
  state?: LightState
  /** Gap between successive windows, ms. Default 90. */
  stepMs?: number
  /** How long a window holds `state` before settling. 0 = hold forever. Default 0. */
  holdMs?: number
  /** State after the hold. Default 'soft'. */
  settleTo?: LightState
  /** Also run through the ground-storey niches. Default false. */
  includeNiches?: boolean
  /** Also run through tower and turret arches. Default false. */
  includeTurrets?: boolean
  /** Restart when finished. Default false. */
  loop?: boolean
  /** Seed for the 'random' order so a sequence can be reproduced. */
  seed?: number
  /** Origin for the 'ripple' order, in SVG units. Defaults to the apex finial. */
  origin?: { x: number; y: number }
  /**
   * Full per-window control: return the timing for each window and the
   * sequence will use it instead of `stepMs`/`holdMs`. Return a number to set
   * only the delay.
   */
  timing?: (win: WindowInfo, index: number, total: number) => WindowTiming | number
  /** Called when the whole sequence has played (not called when looping). */
  onDone?: () => void
}

export interface PlaybackController {
  /** Stops the timeline; already-applied states are left as they are. */
  stop(): void
  /** Resolves when the timeline finishes (or is stopped). */
  readonly finished: Promise<void>
}

const FLOOR_Y: Record<number, number> = { 1: 720, 2: 593, 3: 395, 4: 230, 5: 168 }

/** Small deterministic PRNG so 'random' sequences are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isLightState(v: unknown): v is LightState {
  return typeof v === 'string' && (LIGHT_STATES as readonly string[]).includes(v)
}

export class HawaMahalLights {
  readonly root: Element
  private readonly openings = new Map<string, Element>()
  private readonly groups = new Map<string, Element>()
  private playback: { stop: () => void } | null = null

  constructor(root: Element) {
    this.root = root
    for (const el of Array.from(root.querySelectorAll<Element>('.hm-opening[id]'))) this.openings.set(el.id, el)
    for (const el of Array.from(root.querySelectorAll<Element>('.hm-bay[id], [data-component="tower"][id], [data-component="turret"][id]'))) {
      this.groups.set(el.id, el)
    }
  }

  /** Whole jharokhas, in the SVG's floor/column order. */
  windows(): WindowInfo[] {
    return HAWA_MAHAL_INVENTORY.windows.map((w) => ({ ...w }))
  }

  /** Every independently addressable opening id. */
  openingIds(): string[] {
    return Array.from(this.openings.keys())
  }

  windowIds(): string[] {
    return HAWA_MAHAL_INVENTORY.windows.map((w) => w.id)
  }

  nicheIds(): string[] {
    return HAWA_MAHAL_INVENTORY.niches.map((n) => n.id)
  }

  /** Resolve any id (window, opening, niche, tower, turret) to its opening elements. */
  private resolve(id: string): Element[] {
    const opening = this.openings.get(id)
    if (opening) return [opening]
    const group = this.groups.get(id)
    if (group) return Array.from(group.querySelectorAll('.hm-opening'))
    const any = this.root.querySelector(`#${CSS.escape(id)}`)
    return any ? Array.from(any.querySelectorAll('.hm-opening')) : []
  }

  private apply(elements: Element[], state: LightState) {
    for (const el of elements) el.setAttribute('data-light', state)
  }

  /**
   * Set one window (or one of its openings, a niche, or a tower/turret arch).
   * Setting a whole window sets its three openings; setting an opening never
   * touches its siblings.
   */
  setWindowLight(windowId: string, state: LightState): boolean {
    if (!isLightState(state)) throw new Error(`Unknown light state "${state}"`)
    const els = this.resolve(windowId)
    if (!els.length) return false
    this.apply(els, state)
    const group = this.groups.get(windowId)
    if (group) group.setAttribute('data-light', state)
    return true
  }

  /** Light every jharokha on one floor (floor 1 = the ground-storey niches). */
  setFloorLight(floor: FloorNumber, state: LightState): number {
    if (!isLightState(state)) throw new Error(`Unknown light state "${state}"`)
    const floorEl = this.root.querySelector(`#floor-${String(floor).padStart(2, '0')}`)
    if (!floorEl) return 0
    const els = Array.from(floorEl.querySelectorAll('.hm-opening'))
    this.apply(els, state)
    for (const bay of Array.from(floorEl.querySelectorAll('.hm-bay'))) bay.setAttribute('data-light', state)
    return els.length
  }

  /** Light every opening in the facade, including niches, towers and turrets. */
  setAllLights(state: LightState): number {
    if (!isLightState(state)) throw new Error(`Unknown light state "${state}"`)
    const els = Array.from(this.openings.values())
    this.apply(els, state)
    for (const group of this.groups.values()) group.setAttribute('data-light', state)
    return els.length
  }

  clearLights(): void {
    this.stop()
    this.setAllLights('off')
  }

  getWindowLight(id: string): LightState {
    const els = this.resolve(id)
    const v = els[0]?.getAttribute('data-light')
    return isLightState(v) ? v : 'off'
  }

  /** Stops any running sequence or timeline. */
  stop(): void {
    this.playback?.stop()
    this.playback = null
  }

  /** How long panes take to change colour, in ms (the SVG's `--hm-transition`). */
  setTransition(ms: number): void {
    const style = (this.root as HTMLElement | SVGElement).style
    if (style) style.setProperty('--hm-transition', `${Math.max(0, ms)}ms`)
  }

  /**
   * Play a per-window timeline. Each key is any addressable id; each value is
   * that window's own list of `{ at, state }` events in ms. Events are applied
   * in time order on animation frames, so the browser never does more work
   * than one attribute change per event.
   */
  playTimeline(timeline: WindowTimeline, options: { loop?: boolean; onDone?: () => void } = {}): PlaybackController {
    this.stop()
    const events: Array<{ at: number; id: string; state: LightState; transitionMs?: number }> = []
    let duration = 0
    for (const [id, list] of Object.entries(timeline)) {
      for (const e of list) {
        if (!isLightState(e.state)) throw new Error(`Unknown light state "${e.state}" for ${id}`)
        events.push({ at: Math.max(0, e.at), id, state: e.state, transitionMs: e.transitionMs })
        duration = Math.max(duration, e.at)
      }
    }
    events.sort((a, b) => a.at - b.at)

    let resolve: () => void = () => {}
    const finished = new Promise<void>((r) => (resolve = r))
    let raf = 0
    let stopped = false
    let start = 0
    let cursor = 0

    const frame = (now: number) => {
      if (stopped) return
      if (!start) start = now
      const t = now - start
      while (cursor < events.length && events[cursor].at <= t) {
        const e = events[cursor++]
        if (e.transitionMs !== undefined) this.setTransition(e.transitionMs)
        this.setWindowLight(e.id, e.state)
      }
      if (cursor < events.length) {
        raf = requestAnimationFrame(frame)
      } else if (options.loop) {
        start = 0
        cursor = 0
        raf = requestAnimationFrame(frame)
      } else {
        this.playback = null
        options.onDone?.()
        resolve()
      }
    }
    raf = requestAnimationFrame(frame)
    const controller = {
      stop: () => {
        if (stopped) return
        stopped = true
        cancelAnimationFrame(raf)
        resolve()
      },
      finished,
    }
    this.playback = controller
    return controller
  }

  /** The windows a sequence will visit, in order. */
  sequenceOrder(options: SequenceOptions = {}): WindowInfo[] {
    const order = options.order ?? 'up'
    const list = this.windows()
    const y = (w: WindowInfo) => FLOOR_Y[w.floor] ?? 400
    const origin = options.origin ?? { x: 1004, y: 20 }
    switch (order) {
      case 'up':
        return list.sort((a, b) => a.floor - b.floor || a.col - b.col)
      case 'down':
        return list.sort((a, b) => b.floor - a.floor || a.col - b.col)
      case 'left':
        return list.sort((a, b) => a.cx - b.cx || a.floor - b.floor)
      case 'right':
        return list.sort((a, b) => b.cx - a.cx || a.floor - b.floor)
      case 'centre-out':
        return list.sort((a, b) => Math.abs(a.cx - 1004) - Math.abs(b.cx - 1004) || a.floor - b.floor)
      case 'edges-in':
        return list.sort((a, b) => Math.abs(b.cx - 1004) - Math.abs(a.cx - 1004) || a.floor - b.floor)
      case 'ripple':
        return list.sort((a, b) => Math.hypot(a.cx - origin.x, y(a) - origin.y) - Math.hypot(b.cx - origin.x, y(b) - origin.y))
      case 'random': {
        const rnd = mulberry32(options.seed ?? 9)
        return list
          .map((w) => ({ w, k: rnd() }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.w)
      }
    }
  }

  /**
   * Build the timeline a sequence would play, without playing it. Useful to
   * inspect or tweak per-window timings before `playTimeline`.
   */
  buildSequence(options: SequenceOptions = {}): WindowTimeline {
    const state = options.state ?? 'active'
    const settleTo = options.settleTo ?? 'soft'
    const stepMs = options.stepMs ?? 90
    const holdMs = options.holdMs ?? 0
    const ordered = this.sequenceOrder(options)
    const timeline: WindowTimeline = {}
    const add = (id: string, timing: WindowTiming) => {
      const events: TimelineEvent[] = [{ at: timing.delay, state: timing.state ?? state }]
      const hold = timing.hold ?? holdMs
      if (hold > 0) events.push({ at: timing.delay + hold, state: timing.settleTo ?? settleTo })
      timeline[id] = events
    }
    ordered.forEach((w, i) => {
      const custom = options.timing?.(w, i, ordered.length)
      const timing: WindowTiming = typeof custom === 'number' ? { delay: custom } : custom ?? { delay: i * stepMs }
      add(w.id, timing)
    })
    let extra = ordered.length
    if (options.includeNiches) {
      for (const n of HAWA_MAHAL_INVENTORY.niches) add(n.id, { delay: extra++ * stepMs })
    }
    if (options.includeTurrets) {
      for (const id of this.openings.keys()) {
        if (id.startsWith('tower-') || id.startsWith('turret-')) add(id, { delay: extra++ * stepMs })
      }
    }
    return timeline
  }

  /** Light the windows one after another. See `SequenceOptions` for per-window timing. */
  runLightingSequence(options: SequenceOptions = {}): PlaybackController {
    return this.playTimeline(this.buildSequence(options), { loop: options.loop, onDone: options.onDone })
  }
}

/** Convenience for non-React hosts: `attachHawaMahalLights(document.querySelector('svg'))`. */
export function attachHawaMahalLights(root: Element | null): HawaMahalLights | null {
  return root ? new HawaMahalLights(root) : null
}
