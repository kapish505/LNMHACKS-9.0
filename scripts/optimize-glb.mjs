/**
 * Downscale the textures embedded in a GLB, touching nothing else.
 *
 * Every bufferView that is not an image is copied byte-for-byte, so geometry,
 * skin weights, inverse bind matrices, morph targets and the node hierarchy are
 * bit-identical to the input. Only image payloads are re-encoded, in their
 * original MIME type, at the target size. The script re-reads its own output
 * and fails loudly if any non-image byte changed.
 *
 * Why: models exported straight from Blender tend to embed 4096² maps. The
 * timeline mascot is drawn ~230 CSS px tall, so mip level 0 of a 4096² atlas is
 * never sampled — but every texel is still downloaded and held in GPU memory
 * (a 4096² RGBA map with mips is ~89 MB of VRAM on its own).
 *
 * Usage:
 *   node scripts/optimize-glb.mjs <in.glb> <out.glb> [maxSize=1024]
 */
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const [inPath, outPath, maxArg] = process.argv.slice(2)
if (!inPath || !outPath) {
  console.error('usage: node scripts/optimize-glb.mjs <in.glb> <out.glb> [maxSize=1024]')
  process.exit(1)
}
const MAX = Number(maxArg) || 1024

const MB = (n) => `${(n / 1048576).toFixed(2)} MB`
// RGBA8 with a full mip chain is ~4/3 of the base level.
const vram = (w, h) => w * h * 4 * (4 / 3)

function readGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file')
  let off = 12
  let json = null
  let bin = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'))
    else if (type === 0x004e4942) bin = data
    off += 8 + len
  }
  if (!json || !bin) throw new Error('GLB is missing its JSON or BIN chunk')
  return { json, bin }
}

const src = await readFile(inPath)
const { json, bin } = readGLB(src)

if ((json.buffers || []).length !== 1 || json.buffers[0].uri) {
  throw new Error('expected exactly one embedded buffer')
}

const views = json.bufferViews || []
const slice = (b, v) => b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)

// bufferView index -> image index
const imageViews = new Map()
;(json.images || []).forEach((img, i) => {
  if (img.bufferView != null) imageViews.set(img.bufferView, i)
})

// What each image is used for, for the log.
const roles = new Map()
const tag = (info, name) => {
  if (!info) return
  const source = json.textures[info.index].source
  roles.set(source, [...(roles.get(source) || []), name])
}
;(json.materials || []).forEach((m) => {
  const p = m.pbrMetallicRoughness || {}
  tag(p.baseColorTexture, 'baseColor')
  tag(p.metallicRoughnessTexture, 'metalRough')
  tag(m.normalTexture, 'normal')
  tag(m.occlusionTexture, 'occlusion')
  tag(m.emissiveTexture, 'emissive')
})

// ── re-encode oversized images ───────────────────────────────────────────
const replaced = new Map()
let vramBefore = 0
let vramAfter = 0

for (const [viewIdx, imgIdx] of imageViews) {
  const img = json.images[imgIdx]
  const bytes = slice(bin, views[viewIdx])
  const meta = await sharp(bytes).metadata()
  const label = `image[${imgIdx}] ${(roles.get(imgIdx) || ['unused']).join('+').padEnd(10)} ${String(img.mimeType).padEnd(10)}`

  vramBefore += vram(meta.width, meta.height)

  if (Math.max(meta.width, meta.height) <= MAX) {
    vramAfter += vram(meta.width, meta.height)
    console.log(`keep    ${label} ${meta.width}x${meta.height}`)
    continue
  }

  let pipeline = sharp(bytes).resize({ width: MAX, height: MAX, fit: 'inside', kernel: 'lanczos3' })
  if (img.mimeType === 'image/jpeg') pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true })
  else if (img.mimeType === 'image/png') pipeline = pipeline.png({ compressionLevel: 9 })
  else if (img.mimeType === 'image/webp') pipeline = pipeline.webp({ quality: 90 })
  else {
    vramAfter += vram(meta.width, meta.height)
    console.log(`skip    ${label} (unsupported type)`)
    continue
  }

  const out = await pipeline.toBuffer()
  const om = await sharp(out).metadata()
  vramAfter += vram(om.width, om.height)
  replaced.set(viewIdx, out)
  console.log(
    `resize  ${label} ${`${meta.width}x${meta.height}`.padStart(9)} -> ${`${om.width}x${om.height}`.padEnd(9)}` +
      ` ${MB(bytes.length).padStart(9)} -> ${MB(out.length)}`,
  )
}

// ── rebuild the binary chunk, preserving every other bufferView verbatim ──
const order = views.map((_, i) => i).sort((a, b) => (views[a].byteOffset || 0) - (views[b].byteOffset || 0))
const parts = []
const newOffsets = new Array(views.length)
let cursor = 0

for (const i of order) {
  const data = replaced.get(i) ?? slice(bin, views[i])
  // 4-byte alignment satisfies every accessor component type glTF allows.
  const pad = (4 - (cursor % 4)) % 4
  if (pad) {
    parts.push(Buffer.alloc(pad))
    cursor += pad
  }
  newOffsets[i] = cursor
  parts.push(data)
  cursor += data.length
}

// Snapshot the original non-image bytes before mutating the views.
const originals = new Map()
views.forEach((v, i) => {
  if (!replaced.has(i)) originals.set(i, Buffer.from(slice(bin, v)))
})

views.forEach((v, i) => {
  v.byteOffset = newOffsets[i]
  if (replaced.has(i)) v.byteLength = replaced.get(i).length
})
json.buffers[0].byteLength = cursor

const binPad = (4 - (cursor % 4)) % 4
if (binPad) parts.push(Buffer.alloc(binPad))
const newBin = Buffer.concat(parts)

let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
const jsonPad = (4 - (jsonBuf.length % 4)) % 4
if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)])

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + newBin.length, 8)
const jsonHead = Buffer.alloc(8)
jsonHead.writeUInt32LE(jsonBuf.length, 0)
jsonHead.writeUInt32LE(0x4e4f534a, 4)
const binHead = Buffer.alloc(8)
binHead.writeUInt32LE(newBin.length, 0)
binHead.writeUInt32LE(0x004e4942, 4)

const output = Buffer.concat([header, jsonHead, jsonBuf, binHead, newBin])

// ── verify before writing anything ─────────────────────────────────────────
const check = readGLB(output)
let mismatched = 0
for (const [i, before] of originals) {
  if (!before.equals(slice(check.bin, check.json.bufferViews[i]))) mismatched++
}
for (const acc of check.json.accessors || []) {
  if (acc.bufferView == null) continue
  const v = check.json.bufferViews[acc.bufferView]
  if ((acc.byteOffset || 0) > v.byteLength) throw new Error('accessor outside its bufferView')
}
if (mismatched) throw new Error(`${mismatched} non-image bufferViews changed — refusing to write`)

await writeFile(outPath, output)

console.log('')
console.log(`non-image bufferViews  ${originals.size} copied byte-identical`)
console.log(`file                   ${MB(src.length)} -> ${MB(output.length)}`)
console.log(`texture VRAM (est.)    ${MB(vramBefore)} -> ${MB(vramAfter)}`)
console.log(`wrote                  ${outPath}`)
