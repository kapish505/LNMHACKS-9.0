import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// The glimpses folder only changes at deploy time, but this route did a
// synchronous readdirSync on every single page view. Resolve it once per
// process and let Next cache the response.
export const revalidate = 3600

const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg'])

let cachedItems: string[] | null = null

function readGlimpses(): string[] {
  const dirPath = path.join(process.cwd(), 'public', 'glimpses')
  if (!fs.existsSync(dirPath)) return []

  const files = fs.readdirSync(dirPath)
  let images = files
    .filter((file) => {
      const ext = path.extname(file).toLowerCase()
      return VALID_EXTENSIONS.has(ext) && !file.startsWith('.') && file.startsWith('glimpse-')
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((file) => `/glimpses/${file}`)

  if (images.length === 0) {
    images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase()
        return VALID_EXTENSIONS.has(ext) && !file.startsWith('.')
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((file) => `/glimpses/${encodeURIComponent(file)}`)
  }

  // Ensure carousel has enough items (at least 12) for smooth cylindrical looping
  if (images.length > 0 && images.length < 12) {
    const base = [...images]
    while (images.length < 12) {
      images = images.concat(base)
    }
  }

  return images
}

const FALLBACK_GLIMPSES = [
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',
]

export async function GET() {
  try {
    if (cachedItems === null || cachedItems.length === 0) {
      const items = readGlimpses()
      cachedItems = items.length > 0 ? items : FALLBACK_GLIMPSES
    }
    return NextResponse.json(
      { items: cachedItems },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (error) {
    console.error('Error reading glimpses directory:', error)
    return NextResponse.json({ items: FALLBACK_GLIMPSES })
  }
}

