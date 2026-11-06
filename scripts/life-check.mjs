// Checks the living hero background: the loop plays, the drawn details move,
// and they line up with the buildings. Usage: node scripts/life-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

for (const [name, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  await page.setViewport(vp)
  await page.goto(base + '/', { waitUntil: 'networkidle0' })
  await wait(2500)

  const sample = () =>
    page.evaluate(() => {
      const v = document.querySelector('.hero-live')
      const svg = document.querySelector('.hero-life svg')
      const bird = svg.querySelector('.life-birds g').getBoundingClientRect()
      const car = svg.querySelector('.life-cars circle').getBoundingClientRect()
      return {
        videoTime: v.currentTime,
        videoReady: v.readyState,
        videoShown: v.classList.contains('is-ready'),
        birdX: bird.x,
        carY: car.y,
        lit: [...svg.querySelectorAll('.lw')].filter((r) => parseFloat(getComputedStyle(r).opacity) > 0.5).length,
        windows: svg.querySelectorAll('.lw').length,
      }
    })
  const a = await sample()
  await wait(3000)
  const b = await sample()
  check(`${name}: background loop is playing`, b.videoShown && b.videoReady >= 2 && b.videoTime !== a.videoTime, `${a.videoTime.toFixed(2)}s -> ${b.videoTime.toFixed(2)}s`)
  check(`${name}: birds are moving`, Math.abs(b.birdX - a.birdX) > 5, `${Math.round(a.birdX)} -> ${Math.round(b.birdX)}`)
  check(`${name}: cars are moving`, Math.abs(b.carY - a.carY) > 3, `${Math.round(a.carY)} -> ${Math.round(b.carY)}`)
  check(`${name}: no window lights are drawn`, b.windows === 0)

  // the drawing must sit exactly on the picture
  const align = await page.evaluate(() => {
    const img = document.querySelector('.hero-bg img')
    const svg = document.querySelector('.hero-life svg').getBoundingClientRect()
    const box = img.getBoundingClientRect()
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    const left = box.left + (box.width - w) * 0.6
    const top = box.top + (box.height - h) * 0.5
    return { dx: Math.round(svg.left - left), dy: Math.round(svg.top - top), dw: Math.round(svg.width - w), dh: Math.round(svg.height - h) }
  })
  check(`${name}: drawing lines up with the picture`, Math.abs(align.dx) <= 2 && Math.abs(align.dy) <= 2 && Math.abs(align.dw) <= 3 && Math.abs(align.dh) <= 3, JSON.stringify(align))
  check(`${name}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0)

  await page.screenshot({ path: `${out}/life-${name}.png` })

  // debug view: full-strength picture, everything on, no interface, to judge placement by eye
  await page.addStyleTag({
    content:
      '.hero-veil,.hero::after{display:none!important}.hero-bg img,.hero-live{opacity:1!important}.hero-in,.home-nav,.hero-scroll{visibility:hidden!important}.life-birds,.life-cars{opacity:1!important}',
  })
  await wait(400)
  await page.screenshot({ path: `${out}/life-${name}-debug.png` })
  if (errors.length) results.push(`CONSOLE ERRORS (${name}): ${errors.join(' | ')}`)
  await page.close()
}

// reduced motion: nothing animated is rendered
const quiet = await browser.newPage()
await quiet.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await quiet.setViewport({ width: 1440, height: 900 })
await quiet.goto(base + '/', { waitUntil: 'networkidle0' })
await wait(1200)
check('reduced motion: no loop and no drawing', await quiet.evaluate(() => !document.querySelector('.hero-live') && !document.querySelector('.hero-life')))

console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.filter((r) => /^(PASS|FAIL)/.test(r)).length} checks passed`)
await browser.close().catch(() => {})
