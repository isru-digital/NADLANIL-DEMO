// Draws the app's home screen icons (Itzik 18.11.2026, stage 1 of phone notices): the community's mark, a white
// handshake on the deep green of the site, as PNG files in public/icons/. Run again only when the mark changes.
// Usage: node scripts/make-app-icons.mjs
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const out = 'public/icons'
mkdirSync(out, { recursive: true })

// the handshake of lucide (ISC), the same mark as CommunityBrand.tsx
const HAND = `<g fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="m11 17 2 2a1 1 0 1 0 3-3"/>
  <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/>
  <path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></g>`

// size: the file's pixels; mark: the share of the side the handshake takes; round: corner radius (0 = full square,
// for the phone to cut its own shape)
const icon = ({ size, mark, round }) => {
  const m = size * mark
  const at = (size - m) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#065a39"/><stop offset="0.55" stop-color="#0a8455"/><stop offset="1" stop-color="#13b277"/>
    </linearGradient>
    <radialGradient id="l" cx="0.3" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="s" filterUnits="userSpaceOnUse" x="-6" y="-6" width="36" height="36"><feDropShadow dx="0" dy="0.35" stdDeviation="0.45" flood-color="#02281a" flood-opacity="0.32"/></filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${round * size}" fill="url(#g)"/>
  <rect width="${size}" height="${size}" rx="${round * size}" fill="url(#l)"/>
  <g transform="translate(${at} ${at}) scale(${m / 24})"><g filter="url(#s)">${HAND}</g></g>
</svg>`
}

const FILES = [
  // "any": the shape is ours, the corners are see-through
  { name: 'app-192.png', size: 192, mark: 0.56, round: 0.225 },
  { name: 'app-512.png', size: 512, mark: 0.56, round: 0.225 },
  // "maskable": full square, the mark inside the safe circle (80%), so any shape the phone cuts keeps it whole
  { name: 'app-maskable-512.png', size: 512, mark: 0.46, round: 0 },
  // iPhone cuts its own corners and wants no see-through parts
  { name: 'apple-touch-icon-180.png', size: 180, mark: 0.56, round: 0 },
  // for the install guide's pictures and the notices later
  { name: 'app-96.png', size: 96, mark: 0.58, round: 0.225 },
]

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const page = await browser.newPage()
for (const f of FILES) {
  await page.setViewport({ width: f.size, height: f.size, deviceScaleFactor: 1 })
  await page.setContent(`<html><body style="margin:0;background:transparent">${icon(f)}</body></html>`)
  await page.screenshot({ path: `${out}/${f.name}`, omitBackground: f.round > 0, clip: { x: 0, y: 0, width: f.size, height: f.size } })
  console.log('made', `${out}/${f.name}`)
}
await browser.close()
