/**
 * Parametric SVG builders for the facade elements. Each builder returns markup
 * strings; geometry is computed in the reference pixel space (see model.mjs).
 *
 * Lighting contract: every addressable opening is a <g class="opening"> whose
 * children carry class "pane" (the lattice fill), optionally "niche" (the
 * deeper recess) and a trailing "glow" overlay. The lighting API only ever sets
 * data-light on the opening group; the CSS in build.mjs does the rest.
 */
import { AX, BASE, LARGE, SMALL } from './model.mjs'

export const f = (v) => (Math.round(v * 10) / 10).toString()

export function tag(name, attrs = {}, children = '') {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')
  return children ? `<${name}${a}>${children}</${name}>` : `<${name}${a}/>`
}
export const g = (attrs, children) => tag('g', attrs, children)
export const rect = (x, y, w, h, attrs = {}) => tag('rect', { x: f(x), y: f(y), width: f(w), height: f(h), ...attrs })
export const path = (d, attrs = {}) => tag('path', { d, ...attrs })
export const line = (x1, y1, x2, y2, attrs = {}) => tag('line', { x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), ...attrs })
export const circle = (cx, cy, r, attrs = {}) => tag('circle', { cx: f(cx), cy: f(cy), r: f(r), ...attrs })
export const ellipse = (cx, cy, rx, ry, attrs = {}) => tag('ellipse', { cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), ...attrs })
export const mirrorX = (x) => 2 * AX - x

// ───────────────────────────────────────────── curves

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/**
 * Bangla (curved-eave) hood profile, left tip → crown → right tip.
 * The curve domes at the crown, flattens into a shoulder at ~78 % of the
 * half-width (where the shoulder finials stand) and droops to the eave tips —
 * the proportions read off the reference's apex and tier hoods.
 */
export function hoodCurve(cx, hh, yCrown, yTip) {
  const d = yTip - yCrown
  const yS = yCrown + d * 0.7
  const L = [
    [cx - hh, yTip], [cx - hh, yTip - d * 0.12], [cx - hh * 0.9, yS + 1.5], [cx - hh * 0.78, yS],
    [cx - hh * 0.7, yCrown + d * 0.33], [cx - hh * 0.44, yCrown], [cx, yCrown],
  ]
  const R = L.map(([x, y]) => [2 * cx - x, y]).reverse()
  const seg = (a, b, c, e) => ` C${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1])} ${f(e[0])},${f(e[1])}`
  const dpath =
    `M${f(L[0][0])},${f(L[0][1])}` + seg(L[0], L[1], L[2], L[3]) + seg(L[3], L[4], L[5], L[6]) +
    seg(R[0], R[1], R[2], R[3]) + seg(R[3], R[4], R[5], R[6])
  const samples = []
  for (let i = 0; i <= 30; i++) samples.push(bez(L[0], L[1], L[2], L[3], i / 30))
  for (let i = 1; i <= 30; i++) samples.push(bez(L[3], L[4], L[5], L[6], i / 30))
  const yAt = (x) => {
    const u = cx - Math.abs(x - cx)
    if (u <= L[0][0]) return yTip
    for (let i = 1; i < samples.length; i++) {
      if (samples[i][0] >= u) {
        const [xa, ya] = samples[i - 1]
        const [xb, yb] = samples[i]
        return ya + ((u - xa) / (xb - xa || 1)) * (yb - ya)
      }
    }
    return yCrown
  }
  return { d: dpath, yAt }
}

/** Semicircular-headed opening. */
export function roundArch(x, yTop, w, yBottom) {
  const r = w / 2
  return `M${f(x)},${f(yTop + r)} A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(yTop + r)} V${f(yBottom)} H${f(x)} Z`
}

/** Pointed (lancet) opening; `p` is the height of the point. */
export function pointedArch(x, yTop, w, yBottom, p = w * 0.75) {
  const cx = x + w / 2
  return (
    `M${f(x)},${f(yTop + p)} Q${f(x)},${f(yTop + p * 0.3)} ${f(cx)},${f(yTop)}` +
    ` Q${f(x + w)},${f(yTop + p * 0.3)} ${f(x + w)},${f(yTop + p)} V${f(yBottom)} H${f(x)} Z`
  )
}

/** Multifoil (cusped) Mughal arch: `lobes` scallops each side of a pointed crown. */
export function cuspedArch(x, yTop, w, yBottom, lobes = 3) {
  const cx = x + w / 2
  const r = w / 2
  const spring = yTop + r * 0.95
  const n = lobes * 2 + 1
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (Math.PI * i) / n
    const lift = i === Math.floor(n / 2) || i === Math.ceil(n / 2) ? r * 0.1 : 0
    pts.push([cx + r * Math.cos(a), spring - r * 0.95 * Math.sin(a) - lift])
  }
  let d = `M${f(x)},${f(yBottom)} V${f(spring)}`
  for (let i = 1; i <= n; i++) {
    const [px, py] = pts[i]
    const lobeR = Math.hypot(px - pts[i - 1][0], py - pts[i - 1][1]) / 2 + 0.6
    d += ` A${f(lobeR)},${f(lobeR)} 0 0 1 ${f(px)},${f(py)}`
  }
  d += ` V${f(yBottom)} Z`
  return d
}

/** Bulbous (onion) dome between a base line and an apex. */
export function onionDome(cx, half, yBase, yTop) {
  const h = yBase - yTop
  return (
    `M${f(cx - half)},${f(yBase)} C${f(cx - half * 1.1)},${f(yBase - h * 0.48)} ${f(cx - half * 0.58)},${f(yTop + h * 0.04)} ${f(cx)},${f(yTop)}` +
    ` C${f(cx + half * 0.58)},${f(yTop + h * 0.04)} ${f(cx + half * 1.1)},${f(yBase - h * 0.48)} ${f(cx + half)},${f(yBase)} Z`
  )
}

/** Cream ribs radiating from a dome apex to its base. */
export function domeRibs(cx, half, yBase, yTop, n = 7) {
  let d = ''
  const h = yBase - yTop
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1
    if (Math.abs(t) > 0.999) continue
    const bx = cx + half * 0.92 * t
    d += `M${f(cx)},${f(yTop + 1.5)} Q${f(cx + half * 0.75 * t)},${f(yTop + h * 0.3)} ${f(bx)},${f(yBase - 0.5)} `
  }
  return path(d, { class: 'ln', opacity: 0.85 })
}

// ───────────────────────────────────────────── ornaments

/** Gold finial: base disc, stacked bulbs of decreasing size, spike, tip ball. */
export function finial(cx, yTop, yBase, s = 1) {
  const h = Math.max(10, yBase - yTop)
  const u = h / 26 // unit so an s=1 finial is 26 px tall
  let m = ''
  m += ellipse(cx, yBase - 0.5, 4.6 * s, 1.9 * s, { class: 'gd' })
  m += rect(cx - 1.3 * s, yTop + 6 * u, 2.6 * s, yBase - (yTop + 6 * u), { class: 'gd' })
  m += circle(cx, yBase - 7 * u, 4.1 * s, { class: 'gd' })
  m += ellipse(cx, yBase - 11.2 * u, 3.4 * s, 1.2 * s, { class: 'gd' })
  m += circle(cx, yBase - 14.5 * u, 3.1 * s, { class: 'gd' })
  m += circle(cx, yBase - 20 * u, 2.2 * s, { class: 'gd' })
  m += path(`M${f(cx)},${f(yTop)} L${f(cx + 1.9 * s)},${f(yTop + 7 * u)} L${f(cx - 1.9 * s)},${f(yTop + 7 * u)} Z`, { class: 'gd' })
  m += circle(cx, yTop + 1.2 * s, 1.3 * s, { class: 'gd' })
  return m
}

/** Pierced balustrade: cream band with dark holes. */
export function dotsBand(x0, x1, y, h = 6, step = 6) {
  let s = rect(x0, y, x1 - x0, h, { class: 'cr' })
  let d = ''
  for (let x = x0 + 3; x < x1 - 3; x += step) d += `M${f(x)},${f(y + 1.7)} h2.4 v2.6 h-2.4 Z `
  return s + path(d, { class: 'sd' })
}

/** Cornice slab with a dentil course under it and a shadow line. */
export function corniceSlab(x0, x1, y, h = 7, dentil = true) {
  let s = rect(x0, y, x1 - x0, h, { class: 'cr' })
  if (dentil) {
    let d = ''
    for (let x = x0 + 3; x < x1 - 3; x += 7) d += `M${f(x)},${f(y + h - 2.4)} h3.2 v2.4 h-3.2 Z `
    s += path(d, { class: 'st' })
  }
  s += rect(x0 + 2, y + h, x1 - x0 - 4, 4, { class: 'sh', opacity: 0.55 })
  return s
}

/** Cream rosette / floral motif used on tympana and balcony panels. */
export function rosette(cx, cy, s = 1) {
  const d =
    `M${f(cx)},${f(cy - 4.2 * s)} L${f(cx + 3.2 * s)},${f(cy)} L${f(cx)},${f(cy + 4.2 * s)} L${f(cx - 3.2 * s)},${f(cy)} Z` +
    ` M${f(cx - 9 * s)},${f(cy)} l${f(2.4 * s)},${f(-1.7 * s)} l${f(2.4 * s)},${f(1.7 * s)} l${f(-2.4 * s)},${f(1.7 * s)} Z` +
    ` M${f(cx + 9 * s)},${f(cy)} l${f(-2.4 * s)},${f(-1.7 * s)} l${f(-2.4 * s)},${f(1.7 * s)} l${f(2.4 * s)},${f(1.7 * s)} Z` +
    ` M${f(cx - 14 * s)},${f(cy - 0.6 * s)} h${f(2.5 * s)} v${f(1.2 * s)} h${f(-2.5 * s)} Z M${f(cx + 11.5 * s)},${f(cy - 0.6 * s)} h${f(2.5 * s)} v${f(1.2 * s)} h${f(-2.5 * s)} Z`
  return path(d, { class: 'cr' }) + circle(cx, cy, 1.1 * s, { class: 'st' })
}

/** Small fleur / cross motif on the narrow panels under the side-lights. */
export function crossMotif(cx, cy, s = 1) {
  return path(
    `M${f(cx - 0.9 * s)},${f(cy - 4.5 * s)} h${f(1.8 * s)} v${f(9 * s)} h${f(-1.8 * s)} Z M${f(cx - 3.2 * s)},${f(cy - 1.2 * s)} h${f(6.4 * s)} v${f(1.8 * s)} h${f(-6.4 * s)} Z M${f(cx - 2 * s)},${f(cy + 2.2 * s)} h${f(4 * s)} v${f(1.2 * s)} h${f(-4 * s)} Z`,
    { class: 'cr' },
  )
}

// ───────────────────────────────────────────── openings

function roundMullions(x, yTop, w, yBottom, cols, rows) {
  const r = w / 2
  const cx = x + r
  let d = ''
  for (let c = 1; c < cols; c++) {
    const vx = x + (w * c) / cols
    const u = vx - cx
    const y0 = yTop + r - Math.sqrt(Math.max(0, r * r - u * u))
    d += `M${f(vx)},${f(y0 + 0.5)} V${f(yBottom)} `
  }
  const h = yBottom - yTop
  for (let rr = 1; rr < rows; rr++) {
    const hy = yTop + (h * rr) / rows
    const v = yTop + r - hy
    const half = hy < yTop + r ? Math.sqrt(Math.max(0, r * r - v * v)) : r
    d += `M${f(cx - half + 0.5)},${f(hy)} H${f(cx + half - 0.5)} `
  }
  return path(d, { class: 'mul' })
}

function lancetMullions(x, yTop, w, yBottom, p, rows) {
  const cx = x + w / 2
  let d = `M${f(cx)},${f(yTop + 2)} V${f(yBottom)} `
  const h = yBottom - (yTop + p)
  for (let rr = 0; rr < rows; rr++) {
    const hy = yTop + p + (h * rr) / rows
    d += `M${f(x + 0.5)},${f(hy)} H${f(x + w - 0.5)} `
  }
  return path(d, { class: 'mul' })
}

/** Central round-headed lattice window of a large bay. */
export function centreOpening(id, cx, yTop, w, yBottom, cols, rows) {
  const x = cx - w / 2
  const d = roundArch(x, yTop, w, yBottom)
  const nw = Math.round(w * 0.28)
  const nh = Math.round((yBottom - yTop) * 0.36)
  const niche = roundArch(cx - nw / 2, yBottom - nh, nw, yBottom)
  return g(
    { id, class: 'opening', 'data-component': 'opening', 'data-part': 'centre', 'data-light': 'off' },
    path(d, { class: 'pane' }) +
      roundMullions(x, yTop, w, yBottom, cols, rows) +
      path(niche, { class: 'niche' }) +
      path(niche, { class: 'ln2' }) +
      path(d, { class: 'glow' }),
  )
}

/** Lancet side-light with a small arched light below it. */
export function sideOpening(id, part, cx, yTop, w, h) {
  const x = cx - w / 2
  const p = w * 0.9
  const yB = yTop + h - 22
  const d = pointedArch(x, yTop, w, yB, p)
  const low = roundArch(x, yB + 4, w, yTop + h)
  return g(
    { id, class: 'opening', 'data-component': 'opening', 'data-part': part, 'data-light': 'off' },
    path(d, { class: 'pane' }) +
      lancetMullions(x, yTop, w, yB, p, 4) +
      path(low, { class: 'niche' }) +
      path(low, { class: 'ln' }) +
      path(`${d} ${low}`, { class: 'glow' }),
  )
}

/** Cusped centre arch of a small bay with a honeycomb jali and a lower niche. */
export function jaliOpening(id, cx, yTop, w, yBottom, nicheTop) {
  const x = cx - w / 2
  const d = cuspedArch(x, yTop, w, yBottom, 3)
  const nw = w - 6
  const niche = roundArch(cx - nw / 2, nicheTop, nw, yBottom)
  return g(
    { id, class: 'opening', 'data-component': 'opening', 'data-part': 'centre', 'data-light': 'off' },
    path(d, { class: 'pane' }) +
      path(cuspedArch(x, yTop, w, nicheTop - 3, 3), { class: 'jali' }) +
      line(x + 0.5, nicheTop - 3, x + w - 0.5, nicheTop - 3, { class: 'ln' }) +
      path(niche, { class: 'niche' }) +
      path(niche, { class: 'ln' }) +
      path(d, { class: 'glow' }),
  )
}

/** Narrow side arch of a small bay. */
export function smallSideOpening(id, part, cx, yTop, w, yBottom) {
  const x = cx - w / 2
  const yB = yBottom - 20
  const d = pointedArch(x, yTop, w, yB, w * 0.9)
  const low = roundArch(x, yB + 3, w, yBottom)
  return g(
    { id, class: 'opening', 'data-component': 'opening', 'data-part': part, 'data-light': 'off' },
    path(d, { class: 'pane' }) +
      lancetMullions(x, yTop, w, yB, w * 0.9, 3) +
      path(low, { class: 'niche' }) +
      path(low, { class: 'ln' }) +
      path(`${d} ${low}`, { class: 'glow' }),
  )
}

// ───────────────────────────────────────────── composite parts

/** Balcony band under a jharokha: framed motif panels, pierced balustrade, slab. */
export function balcony(cx, half, yTop, { sideDx = 0, slab = true } = {}) {
  const x0 = cx - half
  const x1 = cx + half
  const ph = BASE.panel
  let s = rect(x0, yTop, half * 2, ph, { class: 'st' })
  if (sideDx) {
    const inner = sideDx - 10
    s += rect(x0 + 3, yTop + 3, half - inner - 6, ph - 6, { class: 'ln' })
    s += rect(cx - inner + 2, yTop + 3, inner * 2 - 4, ph - 6, { class: 'ln' })
    s += rect(cx + inner + 3, yTop + 3, half - inner - 6, ph - 6, { class: 'ln' })
    s += crossMotif(cx - sideDx, yTop + ph / 2, 0.9)
    s += crossMotif(cx + sideDx, yTop + ph / 2, 0.9)
    s += rosette(cx, yTop + ph / 2, 1.1)
  } else {
    s += rect(x0 + 3, yTop + 3, half * 2 - 6, ph - 6, { class: 'ln' })
    s += rosette(cx, yTop + ph / 2, 0.85)
  }
  const yD = yTop + ph
  s += dotsBand(x0 - 2, x1 + 2, yD, BASE.dots)
  if (slab) s += corniceSlab(x0 - 6, x1 + 6, yD + BASE.dots, BASE.cornice)
  return s
}

/** Bangla hood: thick outer band with a highlight stripe, tympanum, rims, finials. */
export function hood(cx, hh, frameHalf, yCrown, yRim, yRail, { finialTop, finialScale = 1, shoulders = true, ribs = 0, tipDrop = 20 }) {
  const yTip = yRim + tipDrop
  const outer = hoodCurve(cx, hh, yCrown, yTip)
  const stripe = hoodCurve(cx, hh - 7, yCrown + (yRim - yCrown) * 0.4, yTip - 2)
  const band2 = hoodCurve(cx, frameHalf + 9, yRim - 7, yRail + 3)
  const inner = hoodCurve(cx, frameHalf - 2, yRim, yRail - 1)
  let s = ''
  s += path(`${outer.d} v8 H${f(cx - hh)} Z`, { class: 'sh', opacity: 0.6, transform: 'translate(0,5)' })
  s += path(`${outer.d} V${f(yTip + 6)} H${f(cx - hh)} Z`, { fill: 'url(#hm-hood-grad)' })
  // eave soffit: a darker band along the lower edge of the hood
  s += path(`${hoodCurve(cx, hh - 1, yCrown + (yRim - yCrown) * 0.78, yTip - 1).d} V${f(yTip + 6)} H${f(cx - hh + 1)} Z`, { class: 'sd', opacity: 0.75 })
  s += path(`${band2.d} V${f(yRail + 4)} H${f(cx - frameHalf - 9)} Z`, { class: 'st' })
  s += path(`${inner.d} V${f(yRail)} H${f(cx - frameHalf + 2)} Z`, { class: 'sd' })
  if (ribs) {
    let d = ''
    for (let i = 1; i < ribs; i++) {
      const t = (i / ribs) * 2 - 1
      const x = cx + hh * 0.72 * t
      const x2 = cx + (frameHalf + 9) * t * 0.96
      d += `M${f(x)},${f(outer.yAt(x) + 2)} L${f(x2)},${f(band2.yAt(x2) - 1)} `
    }
    s += path(d, { class: 'ln', opacity: 0.55 })
  }
  s += path(outer.d, { class: 'ln2' })
  s += path(stripe.d, { class: 'ln', opacity: 0.8 })
  s += path(band2.d, { class: 'ln2' })
  s += path(inner.d, { class: 'ln' })
  s += rosette(cx, yRim + (yRail - yRim) * 0.45, 0.9)
  // capitals where the hood meets the frame pilasters
  for (const sgn of [-1, 1]) {
    const kx = cx + sgn * (frameHalf - 5)
    s += rect(kx - 6, yRail - 7, 12, 4, { class: 'cr' })
    s += rect(kx - 4, yRail - 3, 8, 3, { class: 'cr' })
  }
  const fh = yCrown - finialTop
  s += finial(cx, finialTop, yCrown + 1, finialScale)
  if (shoulders) {
    const sx = hh * 0.74
    const sy = outer.yAt(cx - sx)
    s += finial(cx - sx, sy - fh * 0.62, sy + 1, finialScale * 0.72)
    s += finial(cx + sx, sy - fh * 0.62, sy + 1, finialScale * 0.72)
  }
  return s
}

/** Ribbed cupola (chhatri) on a drum with a projecting chhajja. */
export function chhatri(cx, half, yR) {
  const C = SMALL.chhatri
  const eaveTop = yR - C.eaveTop
  const eaveBottom = yR - C.eaveBottom
  const drumTop = yR - C.drumTop
  const domeTop = yR - C.domeTop
  const dh = C.domeHalf
  let s = ''
  const dome = onionDome(cx, dh, drumTop, domeTop)
  s += path(dome, { fill: 'url(#hm-dome-grad)' })
  s += domeRibs(cx, dh, drumTop, domeTop, 9)
  s += path(dome, { class: 'ln' })
  s += rect(cx - dh - 3, drumTop - 1.5, dh * 2 + 6, 3.5, { class: 'cr' })
  s += rect(cx - dh - 3, drumTop + 2, dh * 2 + 6, 3, { class: 'sh', opacity: 0.5 })
  // drum with small framed panels
  const dw = half - 3
  s += rect(cx - dw, drumTop + 4, dw * 2, eaveTop - drumTop - 4, { class: 'st' })
  for (const px of [cx - dw + 7, cx - 6, cx + dw - 19]) s += rect(px, drumTop + 8, 12, eaveTop - drumTop - 12, { class: 'ln' })
  // chhajja (eave)
  const eh = half + C.eaveHalfExtra
  s += rect(cx - eh, eaveBottom, eh * 2, 5, { class: 'sh', opacity: 0.55 })
  s += corniceSlab(cx - eh, cx + eh, eaveTop, eaveBottom - eaveTop)
  s += finial(cx, yR - C.finialTop, domeTop + 1, 0.78)
  return s
}

/** Octagonal turret: faceted shaft with stacked arched openings, onion dome, finial. */
export function turret(id, cx, w, finialTop, domeTop, bottom) {
  const x = cx - w / 2
  const domeH = w * 0.7
  const shaftTop = domeTop + domeH
  let s = rect(x, shaftTop, w, bottom - shaftTop, { class: 'st' })
  s += rect(x, shaftTop, w * 0.24, bottom - shaftTop, { class: 'sd', opacity: 0.75 })
  s += rect(x + w * 0.76, shaftTop, w * 0.24, bottom - shaftTop, { class: 'sd', opacity: 0.75 })
  s += line(x + w * 0.24, shaftTop, x + w * 0.24, bottom, { class: 'ln' })
  s += line(x + w * 0.76, shaftTop, x + w * 0.76, bottom, { class: 'ln' })
  const faceX = x + w * 0.3
  const faceW = w * 0.4
  const stages = Math.max(2, Math.round((bottom - shaftTop) / 46))
  const stageH = (bottom - shaftTop - 10) / stages
  let openings = ''
  for (let i = 0; i < stages; i++) {
    const yT = shaftTop + 5 + i * stageH
    const d = pointedArch(faceX, yT + 2, faceW, yT + stageH - 7, faceW * 0.8)
    openings += g({ id: `${id}-arch-${i + 1}`, class: 'opening', 'data-component': 'opening', 'data-part': 'turret', 'data-light': 'off' },
      path(d, { class: 'niche' }) + path(d, { class: 'ln' }) + path(d, { class: 'glow' }))
    s += line(x + 1, yT + stageH - 3, x + w - 1, yT + stageH - 3, { class: 'ln' })
    for (const sx of [x + 3, x + w * 0.76 + 3]) s += rect(sx, yT + 6, w * 0.24 - 6, stageH - 16, { class: 'ln', opacity: 0.6 })
  }
  s += openings
  s += corniceSlab(x - 3, x + w + 3, bottom - 8, 6)
  const dome = onionDome(cx, w / 2, shaftTop, domeTop)
  s += path(dome, { fill: 'url(#hm-dome-grad)' }) + domeRibs(cx, w / 2, shaftTop, domeTop, 5) + path(dome, { class: 'ln' })
  s += rect(x - 3, shaftTop - 1.5, w + 6, 3.5, { class: 'cr' })
  s += finial(cx, finialTop, domeTop + 1, 0.7)
  return g({ id, 'data-component': 'turret' }, s)
}

// ───────────────────────────────────────────── bays

const padId = (floor, col) => `window-f${String(floor).padStart(2, '0')}-c${String(col).padStart(2, '0')}`

/** Projecting block body with faceted side faces and cream edge lines. */
function blockBody(cx, half, yTop, yBottom, face = 10) {
  let s = rect(cx - half, yTop, half * 2, yBottom - yTop, { class: 'st' })
  s += rect(cx - half, yTop, face, yBottom - yTop, { class: 'sd', opacity: 0.8 })
  s += rect(cx + half - face, yTop, face, yBottom - yTop, { class: 'sd', opacity: 0.8 })
  s += line(cx - half + 1, yTop, cx - half + 1, yBottom, { class: 'ln' })
  s += line(cx + half - 1, yTop, cx + half - 1, yBottom, { class: 'ln' })
  s += line(cx - half + face, yTop, cx - half + face, yBottom, { class: 'ln2' })
  s += line(cx + half - face, yTop, cx + half - face, yBottom, { class: 'ln2' })
  s += line(cx - half, yTop, cx + half, yTop, { class: 'ln2' })
  s += line(cx - half + face, yTop + 4, cx + half - face, yTop + 4, { class: 'ln' })
  // the bays are octagonal in plan: each angled side face carries a narrow lancet
  if (face >= 9) {
    for (const sx of [cx - half + 2.5, cx + half - face + 2.5]) {
      const d = pointedArch(sx, yTop + 14, face - 5, yBottom - 34, (face - 5) * 0.9)
      s += path(d, { class: 'sh', opacity: 0.8 }) + path(d, { class: 'ln', opacity: 0.8 })
    }
  }
  return s
}

/** Large jharokha. Returns { markup, openings, id }. */
export function largeBay({ floor, col, cx, yL, cls }) {
  const C = LARGE[cls]
  const id = padId(floor, col)
  const yRail = yL - C.rail
  const yRim = yL - C.rim
  const yCrown = yL - C.crown
  const yFin = yL - C.finialTop
  const yBot = yL + C.lat.h
  const fh = C.frameHalf
  let s = ''
  s += hood(cx, C.hoodHalf, fh, yCrown, yRim, yRail, {
    finialTop: yFin, finialScale: cls === 'apex' ? 1.35 : cls === 'outer' ? 0.9 : 1,
    ribs: cls === 'apex' ? 8 : 0, tipDrop: cls === 'apex' ? 24 : 20,
  })
  s += blockBody(cx, fh, yRail, yBot + BASE.panel, 10)
  const sw = C.side.w
  const innerEdge = C.lat.w / 2 + 7
  const sideIn = C.side.dx - sw / 2 - 4
  const sideOut = C.side.dx + sw / 2 + 4
  for (const sgn of [-1, 1]) {
    s += line(cx + sgn * innerEdge, yRail + 4, cx + sgn * innerEdge, yBot, { class: 'ln' })
    s += line(cx + sgn * sideIn, yRail + 4, cx + sgn * sideIn, yBot, { class: 'ln' })
    s += line(cx + sgn * sideOut, yRail + 4, cx + sgn * sideOut, yBot, { class: 'ln' })
    const px = cx + sgn * (fh - 10 - (fh - 10 - sideOut) / 2)
    s += rect(px - 4, yRail + 12, 8, 24, { class: 'ln' })
    s += crossMotif(px, yRail + 24, 0.6)
  }
  const arcTop = yL - 6
  s += path(roundArch(cx - C.lat.w / 2 - 5, arcTop - 5, C.lat.w + 10, yBot), { class: 'cr' })
  s += path(roundArch(cx - C.lat.w / 2 - 2, arcTop - 2, C.lat.w + 4, yBot), { class: 'sd' })
  const openings = []
  const oc = `${id}-c`
  s += centreOpening(oc, cx, arcTop, C.lat.w, yBot, C.cols, C.rows)
  openings.push(oc)
  for (const [sgn, part] of [[-1, 'left'], [1, 'right']]) {
    const oid = `${id}-${part[0]}`
    const scx = cx + sgn * C.side.dx
    s += path(pointedArch(scx - sw / 2 - 3.5, yL + C.side.dy - 3.5, sw + 7, yBot, (sw + 7) * 0.9), { class: 'cr' })
    s += sideOpening(oid, part, scx, yL + C.side.dy, sw, yBot - (yL + C.side.dy))
    openings.push(oid)
  }
  s += balcony(cx, fh, yBot, { sideDx: C.side.dx, slab: cls === 'apex' || cls === 'stepped' })
  return {
    markup: g({ id, class: 'bay', 'data-component': 'window', 'data-floor': floor, 'data-index': col, 'data-kind': 'large', 'data-class': cls }, s),
    openings,
    id,
  }
}

/** Small triple-arch jharokha with a chhatri or a hood roof. */
export function smallBay({ floor, col, cx, yR, half, roof, hoodSpec }) {
  const id = padId(floor, col)
  const yBot = yR + SMALL.bodyH
  let s = ''
  if (roof === 'chhatri') s += chhatri(cx, half, yR)
  else {
    s += hood(cx, half + hoodSpec.halfExtra, half, yR - hoodSpec.crown, yR - hoodSpec.rim, yR, {
      finialTop: yR - hoodSpec.finialTop, finialScale: 0.8, tipDrop: 12, ribs: 6,
    })
  }
  s += blockBody(cx, half, yR, yBot + BASE.panel, 9)
  for (const sgn of [-1, 1]) {
    const vx = cx + sgn * (SMALL.centreW / 2 + 5)
    s += line(vx, yR + 4, vx, yBot, { class: 'ln' })
  }
  const openings = []
  const oc = `${id}-c`
  const archTop = yR + SMALL.archTop
  s += path(cuspedArch(cx - SMALL.centreW / 2 - 3, archTop - 3, SMALL.centreW + 6, yBot, 3), { class: 'cr' })
  s += jaliOpening(oc, cx, archTop, SMALL.centreW, yBot, yR + SMALL.nicheTop)
  openings.push(oc)
  for (const [sgn, part] of [[-1, 'left'], [1, 'right']]) {
    const oid = `${id}-${part[0]}`
    const scx = cx + sgn * SMALL.sideDx
    s += path(pointedArch(scx - SMALL.sideW / 2 - 2.5, archTop, SMALL.sideW + 5, yBot, (SMALL.sideW + 5) * 0.9), { class: 'cr' })
    s += smallSideOpening(oid, part, scx, archTop + 3, SMALL.sideW, yBot)
    openings.push(oid)
  }
  s += balcony(cx, half, yBot, { sideDx: SMALL.sideDx, slab: floor >= 4 || roof === 'hood' })
  return {
    markup: g({ id, class: 'bay', 'data-component': 'window', 'data-floor': floor, 'data-index': col, 'data-kind': 'small', 'data-roof': roof }, s),
    openings,
    id,
  }
}
