// The community feed's front page (green version): the nameplate, the day's figures that are also filters, the
// running line, and that nothing breaks on a narrow phone, at night or with reduced motion.
// Usage: node scripts/feed-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/feed'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const state = (page) =>
  page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).map(Number)
      return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
    }
    const name = document.querySelector('.mast-name')
    return {
      path: location.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '') + location.search,
      name: name?.textContent.replace(/\s+/g, ' ').trim(),
      font: name ? getComputedStyle(name).fontFamily.split(',')[0].replace(/["']/g, '') : '',
      size: name ? Math.round(parseFloat(getComputedStyle(name).fontSize)) : 0,
      motto: [...document.querySelectorAll('.mast-motto span')].map((s) => s.textContent.trim()).join('|'),
      figs: [...document.querySelectorAll('.mast-fig')].map((f) => ({ id: f.dataset.topic, n: Number(f.querySelector('b').textContent), label: f.querySelector('span').textContent.trim(), on: f.classList.contains('is-on'), h: Math.round(f.getBoundingClientRect().height) })),
      rail: Object.fromEntries([...document.querySelectorAll('.comm-rail .rail-btn')].map((b) => [b.querySelector('.rail-label')?.textContent.trim(), Number(b.querySelector('.rail-count')?.textContent)])),
      ticker: document.querySelectorAll('.mast-ticker span').length,
      tickerAnim: getComputedStyle(document.querySelector('.mast-ticker-track') ?? document.body).animationName,
      h1: document.querySelector('.fbx-top h1')?.textContent.trim(),
      h1Seen: (document.querySelector('.fbx-top h1')?.getBoundingClientRect().width ?? 0) > 2,
      cards: document.querySelectorAll('.fb.ci').length,
      topics: [...new Set([...document.querySelectorAll('.fb.ci .fb-topic')].map((t) => t.textContent.trim()))],
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nameLum: name ? lum(getComputedStyle(name).color) : 0,
      paperLum: lum(getComputedStyle(document.querySelector('.mast')).backgroundColor),
      meLink: (document.querySelector('.me-card .me-link')?.getBoundingClientRect().width ?? 0) > 0,
    }
  })

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(2200)
  let s = await state(page)
  check(`${d} the feed opens with the community's name as a nameplate, in the serif face, large`, s.name === 'מתווכים לעסקאות' && s.font === 'Frank Ruhl Libre' && s.size >= (d === 'phone' ? 42 : 80) && s.motto === 'נכסים|קונים|שיתופי פעולה', JSON.stringify({ n: s.name, f: s.font, s: s.size }))
  check(`${d} the old plain title stays for screen readers, out of sight`, s.h1 === 'קהילה' && !s.h1Seen)
  check(`${d} four figures, each counted from the feed itself (equal to the topics list)`, s.figs.length === 4 && s.figs[0].n === s.rail['נכסים לשיתוף פעולה'] && s.figs[1].n === s.rail['מחפש לקונה'] && s.figs[2].n === s.rail['הפניות בין מתווכים'] && s.figs[3].n === s.rail['עסקאות שנסגרו והצלחות'] && s.figs.every((f) => f.h >= 76), JSON.stringify(s.figs.map((f) => f.n)))
  check(`${d} a running line of what is new`, s.ticker >= 12 && s.tickerAnim === 'mast-run', `${s.ticker} ${s.tickerAnim}`)
  check(`${d} nothing scrolls sideways`, s.ov <= 1, `${s.ov}px`)
  check(`${d} a community member's card does not lead to the landing page (it belongs to the office)`, !s.meLink || d === 'phone')
  await page.screenshot({ path: `${out}/${d}-1-front.png` })

  // a figure is a filter
  await page.evaluate(() => document.querySelector('.mast-fig[data-topic="seeking"]').click())
  await wait(1100)
  s = await state(page)
  check(`${d} a click on a figure shows that topic only`, s.path === '/app/community?topic=seeking' && s.figs[1].on && s.cards === s.figs[1].n && s.topics.join() === 'מחפש לקונה', JSON.stringify({ p: s.path, c: s.cards, t: s.topics }))
  await page.screenshot({ path: `${out}/${d}-2-filtered.png` })
  await page.evaluate(() => document.querySelector('.mast-fig[data-topic="seeking"]').click())
  await wait(1100)
  s = await state(page)
  check(`${d} a second click goes back to every topic`, s.path === '/app/community' && !s.figs[1].on && s.topics.length > 2)

  // the cards speak in their own shapes
  const shapes = await page.evaluate(() => {
    const tag = document.querySelector('.fb-prop:has(.fb-media) .fb-facts > strong')
    const ticket = document.querySelector('.fb-search')
    return { tag: tag ? getComputedStyle(tag).position : null, ticket: ticket ? getComputedStyle(ticket).outlineStyle : null, h3: getComputedStyle(document.querySelector('.fb-embed h3')).fontFamily.split(',')[0].replace(/["']/g, '') }
  })
  check(`${d} a listing carries its price on the photo, a wanted notice is a ticket, and titles are in the serif face`, shapes.tag === 'absolute' && shapes.ticket === 'dashed' && shapes.h3 === 'Frank Ruhl Libre', JSON.stringify(shapes))

  // night
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.reload({ waitUntil: 'load' })
  await wait(2000)
  s = await state(page)
  check(`${d} at night the nameplate is light on a dark page`, s.nameLum > 190 && s.paperLum < 60, `${s.nameLum} on ${s.paperLum}`)
  await page.screenshot({ path: `${out}/${d}-3-night.png` })

  // reduced motion: the running line stands still
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.reload({ waitUntil: 'load' })
  await wait(1600)
  s = await state(page)
  check(`${d} with reduced motion the running line stands still, and the figures are there at once`, s.tickerAnim === 'none' && s.figs.every((f, i) => f.n === [s.rail['נכסים לשיתוף פעולה'], s.rail['מחפש לקונה'], s.rail['הפניות בין מתווכים'], s.rail['עסקאות שנסגרו והצלחות']][i]), s.tickerAnim)
  await page.emulateMediaFeatures([])

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// a narrow phone
{
  const page = await browser.newPage()
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(2000)
  const s = await state(page)
  const fits = await page.evaluate(() => { const r = document.querySelector('.mast-name').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })
  check('360px: the nameplate fits, nothing scrolls sideways', s.ov <= 1 && fits, `${s.ov}px`)
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
