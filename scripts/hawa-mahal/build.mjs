/**
 * Builds the Hawa Mahal facade SVG from the architectural model.
 *
 *   node scripts/hawa-mahal/build.mjs                 writes public/hawa-mahal.svg,
 *                                                     the generated TS module and
 *                                                     the component inventory
 *   node scripts/hawa-mahal/build.mjs --compare DIR   also writes overlay pages for
 *                                                     checking against the reference
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AX, FLOORS, GROUND, PALETTE, RECESSES, TOWER, TURRETS, VIEW } from './model.mjs'
import {
  corniceSlab, cuspedArch, domeRibs, dotsBand, f, finial, g, largeBay, line, onionDome, path as p, pointedArch, rect, smallBay, tag, turret,
} from './elements.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const silhouette = JSON.parse(await readFile(path.join(ROOT, 'scripts/hawa-mahal-silhouette.json'), 'utf8'))

const inventory = { floors: [], windows: [], openings: [], niches: [], turrets: [], groups: [] }

// ─────────────────────────────────────────────── styles & defs

const css = `
svg#hawa-mahal{
  --hm-stone:${PALETTE.stone};--hm-stone-light:${PALETTE.stoneLight};--hm-stone-dark:${PALETTE.stoneDark};
  --hm-wall:${PALETTE.wall};--hm-shadow:${PALETTE.shadow};--hm-shadow-deep:${PALETTE.shadowDeep};
  --hm-cream:${PALETTE.cream};--hm-gold:${PALETTE.gold};--hm-gold-dark:${PALETTE.goldDark};
  --hm-pane:${PALETTE.pane};--hm-pane-deep:${PALETTE.paneDeep};
  --hm-lit-soft:${PALETTE.litSoft};--hm-lit-active:${PALETTE.litActive};--hm-lit-accent:${PALETTE.litAccent};
  --hm-transition:650ms;
}
.st{fill:var(--hm-stone)}.sl{fill:var(--hm-stone-light)}.sd{fill:var(--hm-stone-dark)}
.wl{fill:url(#hm-wall-grad)}.sh{fill:var(--hm-shadow)}.sh2{fill:var(--hm-shadow-deep)}
.cr{fill:var(--hm-cream)}.gd{fill:var(--hm-gold);stroke:var(--hm-gold-dark);stroke-width:.6}
.ln{fill:none;stroke:var(--hm-cream);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.ln2{fill:none;stroke:var(--hm-cream);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.mul{fill:none;stroke:var(--hm-cream);stroke-width:2.1}
.jali{fill:url(#hm-jali)}
.pane{fill:var(--hm-pane);transition:fill var(--hm-transition) ease}
.niche{fill:var(--hm-pane-deep);transition:fill var(--hm-transition) ease}
.blind .niche{fill:var(--hm-stone-dark)}
.glow{fill:url(#hm-lit-grad);opacity:0;transition:opacity var(--hm-transition) ease;pointer-events:none}
.opening[data-light="soft"] .pane{fill:var(--hm-lit-soft)}
.opening[data-light="soft"] .niche{fill:#5a4a1c}
.opening[data-light="soft"] .glow{opacity:.28}
.opening[data-light="active"] .pane{fill:var(--hm-lit-active)}
.opening[data-light="active"] .niche{fill:#8a6a24}
.opening[data-light="active"] .glow{opacity:.6}
.opening[data-light="accent"] .pane{fill:var(--hm-lit-accent)}
.opening[data-light="accent"] .niche{fill:#b58f3a}
.opening[data-light="accent"] .glow{opacity:.95;filter:url(#hm-glow)}
.blind[data-light="soft"] .niche{fill:#9c6a2a}.blind[data-light="active"] .niche{fill:#c9924a}.blind[data-light="accent"] .niche{fill:#e0ad62}
@media (prefers-reduced-motion:reduce){.pane,.niche,.glow{transition:none}}
`

function defs() {
  const w = 7
  const h = 6.06
  const hexAt = (cx, cy) => {
    const r = w / 2 / Math.cos(Math.PI / 6)
    let d = ''
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3
      d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`
    }
    return d + 'Z '
  }
  const hex = hexAt(w / 2, h / 2) + hexAt(w, h) + hexAt(0, h) + hexAt(w / 2, h * 1.5)
  const grad = (id, stops, attrs = {}) =>
    tag('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1, ...attrs }, stops.map(([o, c, op]) => tag('stop', { offset: o, 'stop-color': c, 'stop-opacity': op })).join(''))
  return tag(
    'defs',
    {},
    tag('pattern', { id: 'hm-jali', width: f(w), height: f(h), patternUnits: 'userSpaceOnUse' },
      p(hex, { fill: 'none', stroke: PALETTE.cream, 'stroke-width': 0.9, opacity: 0.9 })) +
      tag('radialGradient', { id: 'hm-lit-grad', cx: '50%', cy: '62%', r: '65%' },
        tag('stop', { offset: '0%', 'stop-color': '#fff1c4' }) +
          tag('stop', { offset: '60%', 'stop-color': '#ffcf7a', 'stop-opacity': 0.85 }) +
          tag('stop', { offset: '100%', 'stop-color': '#ff9f3c', 'stop-opacity': 0.35 })) +
      grad('hm-hood-grad', [['0%', PALETTE.stoneLight], ['55%', PALETTE.stone], ['100%', PALETTE.stoneDark]]) +
      grad('hm-dome-grad', [['0%', PALETTE.stoneLight], ['70%', PALETTE.stone], ['100%', PALETTE.stoneDark]]) +
      grad('hm-recess-grad', [['0%', PALETTE.shadow], ['100%', PALETTE.shadowDeep]], { x1: 0, y1: 0, x2: 1, y2: 0 }) +
      grad('hm-wall-grad', [['0%', PALETTE.wall], ['100%', PALETTE.wallDeep]]) +
      tag('filter', { id: 'hm-glow', x: '-40%', y: '-40%', width: '180%', height: '180%' },
        tag('feGaussianBlur', { stdDeviation: 4, result: 'b' }) +
          tag('feMerge', {}, tag('feMergeNode', { in: 'b' }) + tag('feMergeNode', { in: 'SourceGraphic' }))) +
      tag('clipPath', { id: 'hm-mass' }, p(massPath())),
  )
}

// ─────────────────────────────────────────────── silhouette

function massPath() {
  const pts = silhouette.top
  let d = `M0,${VIEW.h} L${pts[0][0]},${pts[0][1]}`
  for (const [x, y] of pts.slice(1)) d += ` L${x},${y}`
  d += ` L${VIEW.w},${VIEW.h} Z`
  return d
}

const silhouetteLayer = () => g({ id: 'building-silhouette' }, p(massPath(), { class: 'wl' }))

// ─────────────────────────────────────────────── ground storey & towers

function groundStorey() {
  const G = GROUND
  let s = ''
  // frieze with small brackets, continuous cream string courses, plinth and base
  s += rect(0, G.friezeTop, VIEW.w, G.lineY - G.friezeTop, { class: 'st' })
  let br = ''
  for (let x = 40; x < VIEW.w - 40; x += 11) br += `M${f(x)},${f(G.friezeTop + 3)} h3.2 v5.5 h-3.2 Z `
  s += p(br, { class: 'cr', opacity: 0.85 })
  s += rect(0, G.lineY, VIEW.w, 2.2, { class: 'cr' })
  s += rect(0, G.lineY + 2.2, VIEW.w, G.plinthLine - G.lineY - 2.2, { class: 'st' })
  s += rect(0, G.plinthLine, VIEW.w, 2.2, { class: 'cr' })
  s += rect(0, G.plinthLine + 2.2, VIEW.w, G.plinthLine2 - G.plinthLine - 2.2, { class: 'st' })
  s += rect(0, G.plinthLine2, VIEW.w, 2.2, { class: 'cr' })
  s += rect(0, G.plinthLine2 + 2.2, VIEW.w, G.baseBottom - G.plinthLine2, { class: 'sd' })

  const niches = []
  let niche = 0
  const panelH = G.panelBottom - G.panelTop
  const frame = (x, w) =>
    rect(x, G.panelTop, w, panelH, { class: 'ln' }) + rect(x + 3.5, G.panelTop + 3.5, w - 7, panelH - 7, { class: 'ln', opacity: 0.7 })
  const blind = (x, w) => frame(x, w) + (w > 26 ? p(pointedArch(x + w / 2 - 5, G.panelTop + 12, 10, G.panelBottom - 10, 8), { class: 'ln', opacity: 0.8 }) : '')
  const arched = (cx, w) => {
    niche++
    const id = `niche-f01-c${String(niche).padStart(2, '0')}`
    const x = cx - w / 2
    const aw = Math.min(w - 14, 40)
    const d = cuspedArch(cx - aw / 2, G.panelTop + 8, aw, G.panelBottom - 6, 2)
    niches.push({ id, cx, w })
    return (
      frame(x, w) +
      g({ id, class: 'opening blind', 'data-component': 'niche', 'data-floor': 1, 'data-index': niche, 'data-light': 'off' },
        p(d, { class: 'niche' }) + p(d, { class: 'ln2' }) + p(cuspedArch(cx - aw / 2 + 4, G.panelTop + 13, aw - 8, G.panelBottom - 10, 2), { class: 'ln', opacity: 0.6 }) + p(d, { class: 'glow' }))
    )
  }
  const plinthPanels = []
  const plinth = (x, w) => rect(x + 1.5, G.plinthTop, w - 3, G.plinthBottom - G.plinthTop, { class: 'ln' })

  const blocks = []
  for (const b of FLOORS[0].bays) for (const sgn of b.dx === 0 ? [1] : [-1, 1]) blocks.push({ ...b, cx: AX + sgn * b.dx })
  blocks.push({ kind: 'tower', cx: AX - TOWER.dx, half: TOWER.half }, { kind: 'tower', cx: AX + TOWER.dx, half: TOWER.half })
  blocks.sort((a, b) => a.cx - b.cx)
  const used = []
  for (const b of blocks) {
    if (b.kind === 'large') {
      const [n1, wide, n2] = G.large[b.cls]
      const gap = G.largeGap
      const total = n1 + wide + n2 + gap * 2
      let x = b.cx - total / 2
      s += blind(x, n1)
      x += n1 + gap
      s += arched(x + wide / 2, wide)
      x += wide + gap
      s += blind(x, n2)
      used.push([b.cx - total / 2, b.cx + total / 2])
      const pw = G.plinthWide[b.cls]
      s += plinth(b.cx - pw / 2, pw)
      plinthPanels.push([b.cx - pw / 2, b.cx + pw / 2])
    } else {
      const w = b.kind === 'small' ? G.small : G.tower
      s += arched(b.cx, w)
      used.push([b.cx - w / 2, b.cx + w / 2])
      s += plinth(b.cx - 17, 34)
      plinthPanels.push([b.cx - 17, b.cx + 17])
    }
  }
  // narrow blind panels in every remaining gap of the ground wall
  used.sort((a, b) => a[0] - b[0])
  let cursor = AX - TOWER.dx - TOWER.half + 4
  const end = AX + TOWER.dx + TOWER.half - 4
  for (const [x0, x1] of used.concat([[end, end]])) {
    const span = x0 - cursor
    if (span >= 22) {
      const n = Math.max(1, Math.round(span / 40))
      const w = span / n
      for (let i = 0; i < n; i++) s += blind(cursor + i * w + 5, w - 10)
    }
    cursor = Math.max(cursor, x1)
  }
  plinthPanels.sort((a, b) => a[0] - b[0])
  cursor = AX - TOWER.dx - TOWER.half
  for (const [x0, x1] of plinthPanels.concat([[end + 4, end + 4]])) {
    const span = x0 - cursor
    if (span > 18) {
      const n = Math.max(1, Math.round(span / G.plinthUnit))
      const w = span / n
      for (let i = 0; i < n; i++) s += plinth(cursor + i * w, w)
    }
    cursor = Math.max(cursor, x1)
  }
  inventory.niches = niches
  return g({ id: 'floor-01', 'data-floor': 1 }, s)
}

function tower(side) {
  const T = TOWER
  const cx = side === 'l' ? AX - T.dx : AX + T.dx
  const id = `tower-${side}`
  const x = cx - T.half
  let s = ''
  // shaft with facets and a tall cusped blind arch
  s += rect(x, T.shaftTop, T.half * 2, T.shaftBottom - T.shaftTop, { class: 'st' })
  s += rect(x, T.shaftTop, 13, T.shaftBottom - T.shaftTop, { class: 'sd', opacity: 0.75 })
  s += rect(cx + T.half - 13, T.shaftTop, 13, T.shaftBottom - T.shaftTop, { class: 'sd', opacity: 0.75 })
  s += line(x + 13, T.shaftTop, x + 13, T.shaftBottom, { class: 'ln2' })
  s += line(cx + T.half - 13, T.shaftTop, cx + T.half - 13, T.shaftBottom, { class: 'ln2' })
  s += line(x + 1, T.shaftTop, x + 1, T.shaftBottom, { class: 'ln' })
  s += line(cx + T.half - 1, T.shaftTop, cx + T.half - 1, T.shaftBottom, { class: 'ln' })
  s += p(cuspedArch(cx - 19, T.shaftTop + 18, 38, T.shaftBottom - 12, 3), { class: 'ln2' })
  s += p(cuspedArch(cx - 14, T.shaftTop + 26, 28, T.shaftBottom - 18, 3), { class: 'ln', opacity: 0.75 })
  for (const sx of [x + 16, cx + T.half - 24]) s += p(pointedArch(sx, T.shaftTop + 22, 8, T.shaftBottom - 24, 7), { class: 'ln', opacity: 0.7 })
  // cornice between shaft and pavilion; bracket band at the base
  s += corniceSlab(x - 5, cx + T.half + 5, T.corniceTop, T.shaftTop - T.corniceTop)
  s += dotsBand(x - 4, cx + T.half + 4, T.shaftBottom, 7, 7)
  s += corniceSlab(x - 6, cx + T.half + 6, T.shaftBottom + 7, 7)
  s += rect(x, T.shaftBottom + 14, T.half * 2, T.baseBottom - T.shaftBottom - 14, { class: 'st' })
  s += rect(x, T.shaftBottom + 14, 13, T.baseBottom - T.shaftBottom - 14, { class: 'sd', opacity: 0.75 })
  s += rect(cx + T.half - 13, T.shaftBottom + 14, 13, T.baseBottom - T.shaftBottom - 14, { class: 'sd', opacity: 0.75 })
  // pavilion with three cusped openings
  const ph = T.half - 6
  s += rect(cx - ph, T.pavilionTop, ph * 2, T.corniceTop - T.pavilionTop, { class: 'st' })
  s += rect(cx - ph, T.pavilionTop, 10, T.corniceTop - T.pavilionTop, { class: 'sd', opacity: 0.75 })
  s += rect(cx + ph - 10, T.pavilionTop, 10, T.corniceTop - T.pavilionTop, { class: 'sd', opacity: 0.75 })
  const arches = [[cx, 20], [cx - 27, 12], [cx + 27, 12]]
  arches.forEach(([ax, aw], i) => {
    const d = cuspedArch(ax - aw / 2, T.pavilionTop + 5, aw, T.corniceTop - 3, 2)
    const oid = `${id}-arch-${i + 1}`
    s += g({ id: oid, class: 'opening', 'data-component': 'opening', 'data-part': 'tower', 'data-light': 'off' },
      p(d, { class: 'niche' }) + p(d, { class: 'ln' }) + p(d, { class: 'glow' }))
    inventory.openings.push({ id: oid, floor: 3, parent: id, part: 'tower' })
  })
  // flared eave, ribbed onion dome, finials
  s += rect(cx - T.domeHalf - 6, T.domeBase + 2, T.domeHalf * 2 + 12, 4, { class: 'sh', opacity: 0.55 })
  s += corniceSlab(cx - T.domeHalf - 6, cx + T.domeHalf + 6, T.domeBase - 4, 6)
  const dome = onionDome(cx, T.domeHalf, T.domeBase - 4, T.domeTop)
  s += p(dome, { fill: 'url(#hm-dome-grad)' }) + domeRibs(cx, T.domeHalf, T.domeBase - 4, T.domeTop, 9) + p(dome, { class: 'ln' })
  s += finial(cx, T.finialTop, T.domeTop + 1, 0.95)
  for (const sx of [cx - T.domeHalf + 4, cx + T.domeHalf - 4]) s += finial(sx, T.domeTop + 12, T.domeTop + 24, 0.55)
  inventory.groups.push({ id, kind: 'tower' })
  return g({ id, 'data-component': 'tower' }, s)
}

// ─────────────────────────────────────────────── floors

function floorLayer(floor) {
  const fn = String(floor.n).padStart(2, '0')
  const bays = []
  for (const b of floor.bays) for (const sgn of b.dx === 0 ? [1] : [-1, 1]) bays.push({ ...b, cx: AX + sgn * b.dx })
  bays.sort((a, b) => a.cx - b.cx)
  let s = ''
  if (floor.cornice) s += corniceSlab(floor.cornice.x0, floor.cornice.x1, floor.cornice.y, 7)
  const windows = []
  bays.forEach((b, i) => {
    const col = i + 1
    const built =
      b.kind === 'large'
        ? largeBay({ floor: floor.n, col, cx: b.cx, yL: b.yL, cls: b.cls })
        : smallBay({ floor: floor.n, col, cx: b.cx, yR: b.yR, half: b.half, roof: b.roof, hoodSpec: b.hood })
    s += built.markup
    windows.push({ id: built.id, floor: floor.n, col, kind: b.kind, cls: b.cls || b.roof, cx: b.cx })
    for (const o of built.openings) inventory.openings.push({ id: o, floor: floor.n, parent: built.id, part: o.slice(-1) })
  })
  inventory.windows.push(...windows)
  inventory.floors.push({ id: `floor-${fn}`, floor: floor.n, windows: windows.length })
  return g({ id: `floor-${fn}`, 'data-floor': floor.n }, s)
}

function recessLayer() {
  let s = ''
  // the recesses only read as deep shadow below the stepped upper storey; above
  // it the gaps are filled by turrets and hood tips
  const top = 330
  for (const r of RECESSES) {
    for (const cx of [AX - r.dx, AX + r.dx]) {
      s += rect(cx - r.w / 2, top, r.w, GROUND.friezeTop - top, { fill: 'url(#hm-recess-grad)' })
    }
  }
  return g({ id: 'recesses' }, s)
}

function turretLayer(layer) {
  let s = ''
  TURRETS.forEach((t, i) => {
    if (t.layer !== layer) return
    for (const [sgn, side] of [[-1, 'l'], [1, 'r']]) {
      const id = `turret-${i + 1}${side}`
      s += turret(id, AX + sgn * t.dx, t.w, t.finialTop, t.domeTop, t.bottom)
      inventory.turrets.push({ id, cx: AX + sgn * t.dx })
    }
  })
  return g({ id: `turrets-${layer}`, 'data-component': 'turrets' }, s)
}

// ─────────────────────────────────────────────── assemble

function buildSvg() {
  const floors = FLOORS.map(floorLayer)
  const body =
    silhouetteLayer() +
    g({ id: 'architectural-structure', 'clip-path': 'url(#hm-mass)' }, recessLayer() + groundStorey() + tower('l') + tower('r')) +
    floors[0] + floors[1] + floors[2] +
    g({ id: 'architectural-details' }, turretLayer('upper')) +
    floors[3] +
    turretLayer('apex') +
    g({ id: 'lighting-overlays' })
  return (
    `<svg id="hawa-mahal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="Hawa Mahal facade">` +
    `<style>${css}</style>` +
    defs() +
    body +
    `</svg>`
  )
}

/**
 * The SVG's <style> is document-global once the markup is inlined, so every
 * class is prefixed with `hm-` here rather than in the builders.
 */
function namespaceClasses(markup) {
  const tokens = ['opening', 'blind', 'bay', 'pane', 'niche', 'glow', 'jali', 'mul', 'ln2', 'ln', 'sh2', 'sh', 'st', 'sl', 'sd', 'wl', 'cr', 'gd']
  const set = new Set(tokens)
  const withClasses = markup.replace(/class="([^"]+)"/g, (m, list) =>
    `class="${list.split(/\s+/).map((c) => (set.has(c) ? `hm-${c}` : c)).join(' ')}"`)
  return withClasses.replace(/<style>([\s\S]*?)<\/style>/, (m, body) =>
    `<style>${body.replace(new RegExp(`\\.(${tokens.join('|')})(?![\\w-])`, 'g'), '.hm-$1')}</style>`)
}

const svg = namespaceClasses(buildSvg())

// turret arches are generated inside elements.turret(); list them from the markup
for (const m of svg.matchAll(/ id="(turret-(\d)([lr])-arch-\d+)"/g)) {
  inventory.openings.push({ id: m[1], floor: m[2] === '1' ? 5 : 4, parent: `turret-${m[2]}${m[3]}`, part: 'turret' })
}

// ─────────────────────────────────────────────── checks

const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
if (dupes.length) {
  console.error('DUPLICATE IDS:', [...new Set(dupes)])
  process.exit(1)
}
const counts = {
  bytes: svg.length,
  ids: ids.length,
  paths: (svg.match(/<path/g) || []).length,
  rects: (svg.match(/<rect/g) || []).length,
  windows: inventory.windows.length,
  openings: inventory.openings.length,
  niches: inventory.niches.length,
  turrets: inventory.turrets.length,
  filters: (svg.match(/<filter/g) || []).length,
}
console.log(counts)

// ─────────────────────────────────────────────── outputs

await writeFile(path.join(ROOT, 'public/hawa-mahal.svg'), svg)
const outDir = path.join(ROOT, 'src/components/dom/hawa-mahal')
await mkdir(outDir, { recursive: true })
await writeFile(
  path.join(outDir, 'facade.generated.ts'),
  `// Generated by scripts/hawa-mahal/build.mjs — do not edit by hand.\n` +
    `export const HAWA_MAHAL_SVG = ${JSON.stringify(svg)}\n` +
    `export const HAWA_MAHAL_INVENTORY = ${JSON.stringify(inventory)} as const\n` +
    `export const HAWA_MAHAL_VIEWBOX = { width: ${VIEW.w}, height: ${VIEW.h} } as const\n` +
    `/** Traced roofline (x, y) in viewBox units, left to right. */\n` +
    `export const HAWA_MAHAL_ROOFLINE: ReadonlyArray<readonly [number, number]> = ${JSON.stringify(silhouette.top)}\n`,
)
await writeFile(path.join(ROOT, 'scripts/hawa-mahal-inventory.json'), JSON.stringify({ counts, ...inventory }, null, 1))

if (process.argv.includes('--compare')) {
  const outHtml = process.argv[process.argv.indexOf('--compare') + 1]
  const ref = path.join(ROOT, 'public/hawa-mahal-footer.png')
  const page = (mode) =>
    `<!doctype html><html><body style="margin:0;background:#000;width:${VIEW.w}px;height:${VIEW.h}px;position:relative">` +
    (mode !== 'svg' ? `<img src="file://${ref}" style="position:absolute;inset:0;width:${VIEW.w}px;height:${VIEW.h}px">` : '') +
    (mode !== 'ref' ? `<div style="position:absolute;inset:0;${mode === 'overlay' ? 'opacity:.55' : ''}">${svg.replace('<svg ', `<svg width="${VIEW.w}" height="${VIEW.h}" `)}</div>` : '') +
    `</body></html>`
  await writeFile(path.join(outHtml, 'svg.html'), page('svg'))
  await writeFile(path.join(outHtml, 'overlay.html'), page('overlay'))
  console.log('wrote compare pages to', outHtml)
}
