// The block on the community's page that leads to the office: it sells 0% to the office and 100% to the broker,
// with the commission sliding from half-and-half to all of it at the broker when the block comes into view.
// Usage: node scripts/pitch-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/pitch'
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
    const kp = document.querySelector('.kp')
    const r = kp?.getBoundingClientRect()
    const btn = kp?.querySelector('.kp-btn')
    const bb = btn?.getBoundingClientRect()
    return {
      there: !!kp,
      share: Number(kp?.dataset.share),
      office: kp?.querySelector('.kp-num.is-office b')?.textContent,
      broker: kp?.querySelector('.kp-num.is-broker b')?.textContent,
      labels: [...(kp?.querySelectorAll('.kp-num span') ?? [])].map((s) => s.textContent.trim()).join('|'),
      done: kp?.classList.contains('is-done'),
      bar: kp ? Math.round((kp.querySelector('.kp-bar i').getBoundingClientRect().width / kp.querySelector('.kp-bar').getBoundingClientRect().width) * 100) : 0,
      h2: kp?.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim(),
      btn: btn?.textContent.trim(),
      to: btn?.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, ''),
      btnH: bb ? Math.round(bb.height) : 0,
      fee: kp?.querySelector('.kp-cta em')?.textContent.trim(),
      note: kp?.querySelector('.kp-note')?.textContent.trim(),
      label: kp?.getAttribute('aria-label'),
      inside: !!r && r.left >= 0 && r.right <= innerWidth + 1,
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      old: !!document.querySelector('.kh-office'),
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
  await page.goto(green + '/kehila', { waitUntil: 'load' })
  await wait(1500)

  // before it is seen: half and half, the way it is in many offices
  let s = await state(page)
  check(`${d} the block is there, in place of the old quiet card`, s.there && !s.old)
  check(`${d} before it comes into view the commission stands at half and half`, s.share === 50 && s.office === '50%' && s.broker === '50%' && !s.done, JSON.stringify({ s: s.share, o: s.office, b: s.broker }))

  await page.evaluate(() => document.querySelector('.kp').scrollIntoView({ block: 'center' }))
  await wait(1100)
  const mid = await state(page)
  await page.screenshot({ path: `${out}/${d}-1-moving.png` })
  await wait(2300)
  s = await state(page)
  check(`${d} in view, it moves: on the way`, mid.share > 50 && mid.share < 100, String(mid.share))
  check(`${d} it lands on 0% to the office and 100% to the broker`, s.share === 100 && s.office === '0%' && s.broker === '100%' && s.labels === 'עמלה למשרד|עמלה למתווך' && s.bar === 100 && s.done, JSON.stringify({ o: s.office, b: s.broker, bar: s.bar }))
  check(`${d} the headline says the whole commission stays with the broker, with no full stop`, s.h2 === 'במשרד NadlanUP כל העמלה נשארת אצלכם', s.h2)
  check(`${d} the button is "שדרג למשרד NadlanUP", large, and leads to the office's page`, s.btn === 'שדרג למשרד NadlanUP' && s.to === '/join/office' && s.btnH >= 56, JSON.stringify({ b: s.btn, to: s.to, h: s.btnH }))
  check(`${d} the fee is on the block (from 549), and the note explains the half it started from`, s.fee === 'דמי חבר: החל מ-549 ₪ + מע"מ לחודש' && s.note.includes('לרוב 50%') && s.note.includes('0%'), `${s.fee} / ${s.note}`)
  check(`${d} a screen reader gets the result, not the moving numbers`, s.label.includes('0% עמלה למשרד') && s.label.includes('100% עמלה למתווך'))
  check(`${d} it fits the screen, nothing scrolls sideways`, s.inside && s.ov <= 1, `${s.ov}px`)
  await page.screenshot({ path: `${out}/${d}-2-landed.png` })

  await page.evaluate(() => document.querySelector('.kp-btn').click())
  await wait(1500)
  check(`${d} a click goes to the office's page`, await page.evaluate(() => location.pathname.endsWith('/join/office')))

  // night
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.goto(green + '/kehila', { waitUntil: 'load' })
  await wait(1300)
  await page.evaluate(() => document.querySelector('.kp').scrollIntoView({ block: 'center' }))
  await wait(3200)
  s = await state(page)
  check(`${d} at night it works the same`, s.share === 100 && s.done)
  await page.screenshot({ path: `${out}/${d}-3-night.png` })

  // reduced motion: the result is simply there
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/kehila', { waitUntil: 'load' })
  await wait(1300)
  s = await state(page)
  check(`${d} with reduced motion the result is there at once, nothing moves`, s.share === 100 && s.office === '0%' && s.broker === '100%')
  await page.emulateMediaFeatures([])

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
