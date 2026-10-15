/**
 * Builds the Hawa Mahal facade asset for the footer.
 *
 * The source art sits on a flat teal sky. A naive chroma key would also punch
 * out the window panes, which are a very similar teal. So the sky is removed by
 * a flood fill seeded from the image border instead: the facade's terracotta
 * silhouette is an unbroken barrier, so the fill can never reach the enclosed
 * window panes no matter how loose the colour test is.
 *
 * Also emits the numbers the shader needs (final aspect, where the window
 * pixels actually are) so the component isn't guessing.
 *
 * Usage: node scripts/build-hawa-mahal.mjs [sourceImage]
 */
import sharp from 'sharp'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC =
  process.argv[2] ||
  '/private/tmp/claude-501/-Users-kapish-Work-LNMHACKS/7abbd8e1-c746-4d4a-9084-a9731fda6e2e/images/1.webp'
const OUT = path.join(ROOT, 'public/hawa-mahal-facade.png')

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/** Teal sky vs. terracotta/cream/gold stonework. Sky and panes both pass; the
 *  flood fill is what separates them. */
const isSky = (r, g, b) => g > r * 1.15 && b > r * 1.02

const meta = await sharp(SRC).metadata()
console.log(`source      ${meta.width}x${meta.height} ${meta.format} alpha=${!!meta.hasAlpha}`)

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const C = info.channels

// ── palette census ────────────────────────────────────────────────────────
{
  const bins = new Map()
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const o = (y * W + x) * C
      const k = ((data[o] >> 5) << 10) | ((data[o + 1] >> 5) << 5) | (data[o + 2] >> 5)
      bins.set(k, (bins.get(k) || 0) + 1)
    }
  }
  let tot = 0
  for (const v of bins.values()) tot += v
  console.log('\ndominant colours:')
  for (const [k, n] of [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    const r = ((k >> 10) & 31) * 8 + 4
    const g = ((k >> 5) & 31) * 8 + 4
    const b = (k & 31) * 8 + 4
    console.log(
      `  ${hex(r, g, b)} ${String(((n / tot) * 100).toFixed(1) + '%').padStart(6)}` +
        (isSky(r, g, b) ? '  <- sky test passes' : ''),
    )
  }
}

// ── flood fill the sky from the border ────────────────────────────────────
const SKY = 1
const flag = new Uint8Array(W * H)
const queue = new Int32Array(W * H)
let qh = 0
let qt = 0

const seed = (x, y) => {
  const i = y * W + x
  if (flag[i]) return
  const o = i * C
  if (!isSky(data[o], data[o + 1], data[o + 2])) return
  flag[i] = SKY
  queue[qt++] = i
}

for (let x = 0; x < W; x++) {
  seed(x, 0)
  seed(x, H - 1)
}
for (let y = 0; y < H; y++) {
  seed(0, y)
  seed(W - 1, y)
}

while (qh < qt) {
  const i = queue[qh++]
  const x = i % W
  const y = (i / W) | 0
  if (x > 0) seed(x - 1, y)
  if (x < W - 1) seed(x + 1, y)
  if (y > 0) seed(x, y - 1)
  if (y < H - 1) seed(x, y + 1)
}

let skyCount = 0
for (let i = 0; i < flag.length; i++) if (flag[i] === SKY) skyCount++

// ── alpha, feathered, with the green fringe pulled out of edge pixels ─────
// A hard 1-bit cut leaves a stair-stepped silhouette and a teal rim where the
// source art antialiased stone against sky. Edge pixels get partial alpha from
// how sky-like they are, and their colour is pushed away from the sky hue so
// the halo does not read as green.
const SKY_REF = (() => {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let x = 0; x < W; x += 7) {
    const o = x * C
    if (flag[x] === SKY) {
      r += data[o]
      g += data[o + 1]
      b += data[o + 2]
      n++
    }
  }
  return n ? [r / n, g / n, b / n] : [18, 140, 124]
})()
console.log(`\nsky reference ${hex(...SKY_REF.map((v) => Math.round(v)))}`)

let feathered = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    const o = i * C

    if (flag[i] === SKY) {
      data[o + 3] = 0
      continue
    }

    // Is this stone pixel touching the sky?
    const touches =
      (x > 0 && flag[i - 1] === SKY) ||
      (x < W - 1 && flag[i + 1] === SKY) ||
      (y > 0 && flag[i - W] === SKY) ||
      (y < H - 1 && flag[i + W] === SKY)

    data[o + 3] = 255
    if (!touches) continue

    const r = data[o]
    const g = data[o + 1]
    const b = data[o + 2]
    // 0 = pure stone, 1 = pure sky
    const t = Math.max(0, Math.min(1, (g - r) / Math.max(1, SKY_REF[1] - SKY_REF[0])))
    if (t <= 0.02) continue

    feathered++
    data[o + 3] = Math.round(255 * (1 - t * 0.85))
    // Un-mix the sky contribution so the remaining colour is the stone's own.
    const k = 1 / Math.max(0.15, 1 - t)
    data[o] = Math.max(0, Math.min(255, Math.round((r - SKY_REF[0] * t) * k)))
    data[o + 1] = Math.max(0, Math.min(255, Math.round((g - SKY_REF[1] * t) * k)))
    data[o + 2] = Math.max(0, Math.min(255, Math.round((b - SKY_REF[2] * t) * k)))
  }
}

// ── where is the facade, and where are its window panes? ─────────────────
let minY = H
let maxY = 0
let minX = W
let maxX = 0
let panes = 0
let stone = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (flag[i] === SKY) continue
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    const o = i * C
    // The shader separates panes from stone with exactly this test.
    if (data[o + 1] > data[o]) panes++
    else stone++
  }
}

console.log(`\nsky removed   ${((skyCount / (W * H)) * 100).toFixed(1)}% of the frame`)
console.log(`edge feather  ${feathered} px`)
console.log(`facade bbox   x ${minX}..${maxX}  y ${minY}..${maxY}`)
console.log(`pane pixels   ${((panes / (panes + stone)) * 100).toFixed(1)}% of the facade  (g > r)`)
console.log(`  -> shader window mask has something to bite on: ${panes > 10000 ? 'YES' : 'NO'}`)

// Trim only the empty sky above the roofline; keep full width so the component
// can anchor the facade flush to the footer's left and right edges.
const cropTop = Math.max(0, minY - 2)
const cropH = H - cropTop

const out = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
  .extract({ left: 0, top: cropTop, width: W, height: cropH })
  .png({ compressionLevel: 9 })
  .toBuffer()

await writeFile(OUT, out)

const finalMeta = await sharp(out).metadata()
console.log(`\nwrote public/hawa-mahal-facade.png`)
console.log(`  ${finalMeta.width}x${finalMeta.height}  aspect ${(finalMeta.width / finalMeta.height).toFixed(4)}`)
console.log(`  ${(out.length / 1048576).toFixed(2)} MB`)
