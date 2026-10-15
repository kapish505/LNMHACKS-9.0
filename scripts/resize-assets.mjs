/**
 * One-off asset downscale.
 *
 * Every image below was being shipped and uploaded to the GPU at several times
 * the resolution it is ever drawn at. Targets are derived from the actual
 * on-screen size at the canvases' own DPR ceiling (1.25), with roughly 2x
 * headroom so nothing softens:
 *
 *   stickers   rendered ~142 device px  -> 256
 *   sponsor wide card (2 cols)  ~1016px -> 1024
 *   sponsor single card         ~468px  -> 640
 *   carousel panels             ~775px  -> 1280
 *
 * logo.png is deliberately left alone: about-ring-logo's glint shader hardcodes
 * `texel = vec2(1.0/1031.0, 1.0/1149.0)`, so changing its dimensions would
 * change the computed normals and therefore the rendered highlight.
 *
 * Run with: node scripts/resize-assets.mjs
 */
import sharp from 'sharp'
import { readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

const JOBS = [
  ...Array.from({ length: 14 }, (_, i) => ({ file: `public/item${i + 1}.png`, max: 256 })),
  { file: 'public/projects/proj-1-base.png', max: 1024 },
  { file: 'public/projects/proj-1-hover.png', max: 1024 },
  { file: 'public/projects/proj-2-base.png', max: 640 },
  { file: 'public/projects/proj-2-hover.png', max: 640 },
  { file: 'public/projects/proj-3-base.png', max: 640 },
  { file: 'public/projects/proj-4-base.png', max: 640 },
  { file: 'public/projects/proj-5-base.png', max: 640 },
  { file: 'public/glimpses/glimpse-1.jpg', max: 1280, jpeg: true },
  { file: 'public/glimpses/glimpse-2.jpg', max: 1280, jpeg: true },
  { file: 'public/glimpses/glimpse-3.jpg', max: 1280, jpeg: true },
  { file: 'public/glimpses/glimpse-4.jpg', max: 1280, jpeg: true },
]

const mb = (n) => (n / 1048576).toFixed(2)

let beforeTotal = 0
let afterTotal = 0
let gpuBefore = 0
let gpuAfter = 0

for (const job of JOBS) {
  const abs = path.join(ROOT, job.file)
  let before
  try {
    before = (await stat(abs)).size
  } catch {
    console.log(`skip (missing)  ${job.file}`)
    continue
  }

  const input = await readFile(abs)
  const meta = await sharp(input).metadata()

  if (Math.max(meta.width, meta.height) <= job.max) {
    console.log(`skip (already)  ${job.file}  ${meta.width}x${meta.height}`)
    continue
  }

  let pipeline = sharp(input).resize({
    width: job.max,
    height: job.max,
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  })

  pipeline = job.jpeg
    ? pipeline.jpeg({ quality: 82, mozjpeg: true })
    : pipeline.png({ compressionLevel: 9 })

  const out = await pipeline.toBuffer()
  const outMeta = await sharp(out).metadata()
  await writeFile(abs, out)

  beforeTotal += before
  afterTotal += out.length
  gpuBefore += meta.width * meta.height * 4 * 1.34
  gpuAfter += outMeta.width * outMeta.height * 4 * 1.34

  console.log(
    `${job.file.padEnd(34)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(4)} -> ` +
      `${String(outMeta.width).padStart(4)}x${String(outMeta.height).padEnd(4)}  ` +
      `${mb(before).padStart(6)}MB -> ${mb(out.length).padStart(6)}MB`,
  )
}

console.log('')
console.log(`download:  ${mb(beforeTotal)} MB -> ${mb(afterTotal)} MB`)
console.log(`gpu (est): ${mb(gpuBefore)} MB -> ${mb(gpuAfter)} MB`)
