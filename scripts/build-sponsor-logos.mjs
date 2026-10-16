/**
 * Writes brand marks for the sponsor wall into public/sponsors/<slug>.svg.
 *
 * Marks come from the `simple-icons` package (CC0 brand glyphs) for the brands
 * it carries; everything else is expected as an official logo file dropped into
 * public/sponsors/ by hand — see src/data/sponsors.ts for the slugs.
 *
 *   node scripts/build-sponsor-logos.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as icons from 'simple-icons'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public/sponsors')

/** slug → simple-icons export. Colour is the brand's own hex. */
const MARKS = {
  cloudflare: icons.siCloudflare,
  solana: icons.siSolana,
  github: icons.siGithub,
  sui: icons.siSui,
  stellar: icons.siStellar,
}

await mkdir(OUT, { recursive: true })
for (const [slug, icon] of Object.entries(MARKS)) {
  if (!icon) {
    console.warn(`skip ${slug}: not in simple-icons`)
    continue
  }
  // GitHub's brand hex is near-black; the wall is dark, so render it white.
  const fill = icon.hex.toLowerCase() === '181717' ? 'ffffff' : icon.hex
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${icon.title}">` +
    `<path fill="#${fill}" d="${icon.path}"/></svg>\n`
  await writeFile(path.join(OUT, `${slug}.svg`), svg)
  console.log(`wrote public/sponsors/${slug}.svg (${icon.title})`)
}
