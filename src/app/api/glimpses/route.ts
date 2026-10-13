import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg'])

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), 'public', 'glimpses')
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ items: [] })
    }

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

    return NextResponse.json({ items: images })
  } catch (error) {
    console.error('Error reading glimpses directory:', error)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
