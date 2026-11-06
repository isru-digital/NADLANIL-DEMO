// Checks the living hero background: on desktop the loop plays and birds and cars move;
// on phones there is no video and only birds; the layer lines up with the picture.
// Usage: node scripts/life-check.mjs [outDir]
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

for (const [name, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['mobile', { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, true],
]) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  await page.setViewport(vp)
  await page.goto(base + '/', { waitUntil: 'load' })
  await wait(3000)

  const sample = () =>
    page.evaluate(() => {
      const v = document.querySelector('.hero-live')
      const flock = document.querySelector('.life-flock').getBoundingClientRect()
      const car = document.querySelector('.life-car')?.getBoundingClientRect()
      return {
        video: !!v,
        videoTime: v?.currentTime ?? 0,
        videoShown: v?.classList.contains('is-ready') ?? false,
        birdX: flock.x,
        carY: car?.y ?? null,
        cars: document.querySelectorAll('.life-car').length,
        flap: getComputedStyle(document.querySelector('.life-bird')).animationName,
        blur: [...document.querySelectorAll('.float-bob, .card, .home-nav')].filter((e) => getComputedStyle(e).backdropFilter !== 'none').length,
      }
    })
  const a = await sample()
  await wait(3000)
  const b = await sample()
  check(`${name}: birds are moving`, Math.abs(b.birdX - a.birdX) > 5, `${Math.round(a.birdX)} -> ${Math.round(b.birdX)}`)
  if (phone) {
    check('mobile: no background video is loaded', !b.video)
    check('mobile: no car lights', b.cars === 0)
    check('mobile: wing beat is off', b.flap === 'none', b.flap)
    check('mobile: no blurred glass surfaces', b.blur === 0, String(b.blur))
  } else {
    check('desktop: background loop is playing', b.videoShown && b.videoTime !== a.videoTime, `${a.videoTime.toFixed(2)}s -> ${b.videoTime.toFixed(2)}s`)
    check('desktop: cars are moving', Math.abs(b.carY - a.carY) > 3, `${Math.round(a.carY)} -> ${Math.round(b.carY)}`)
    check('desktop: wings beat', b.flap === 'life-flap', b.flap)
  }

  const align = await page.evaluate(() => {
    const img = document.querySelector('.hero-bg img')
    const scene = document.querySelector('.life-scene').getBoundingClientRect()
    const box = img.getBoundingClientRect()
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    return { dx: Math.round(scene.left - (box.left + (box.width - w) * 0.6)), dy: Math.round(scene.top - (box.top + (box.height - h) * 0.5)), dw: Math.round(scene.width - w), dh: Math.round(scene.height - h) }
  })
  check(`${name}: layer lines up with the picture`, Math.abs(align.dx) <= 2 && Math.abs(align.dy) <= 2 && Math.abs(align.dw) <= 3 && Math.abs(align.dh) <= 3, JSON.stringify(align))
  check(`${name}: no window lights are drawn`, (await page.evaluate(() => document.querySelectorAll('.lw, .life-windows').length)) === 0)
  check(`${name}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0)
  await page.screenshot({ path: `${out}/life-${name}.png` })
  if (errors.length) results.push(`CONSOLE ERRORS (${name}): ${errors.join(' | ')}`)
  await page.close()
}

// reduced motion: nothing animated is rendered
const quiet = await browser.newPage()
await quiet.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await quiet.setViewport({ width: 1440, height: 900 })
await quiet.goto(base + '/', { waitUntil: 'load' })
await wait(1500)
check('reduced motion: no loop and no living layer', await quiet.evaluate(() => !document.querySelector('.hero-live') && !document.querySelector('.hero-life')))

console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.filter((r) => /^(PASS|FAIL)/.test(r)).length} checks passed`)
await browser.close().catch(() => {})
