// Photos in the new CRM card (green version): up to three, each up to 2 MB, a link to TinyPNG, and the photos show
// on the property's card and in its community post.
// Usage: node scripts/photos-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/photos'
mkdirSync(out, { recursive: true })
// a file heavier than 2 MB, and a file that is not a picture
const big = resolve(out, 'heavy-photo.jpg')
writeFileSync(big, randomBytes(Math.round(2.6 * 1024 * 1024)))
const text = resolve(out, 'notes.txt')
writeFileSync(text, 'not a picture')
const pics = ['hero-flat', 'panel-home', 'panel-keys', 'panel-street'].map((n) => resolve('public/img', `${n}.webp`))

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const picker = (page) =>
  page.evaluate(() => ({
    there: !!document.querySelector('.ga-photos'),
    label: document.querySelector('.ga-photos .field-label')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    n: document.querySelectorAll('.ga-photo').length,
    add: !!document.querySelector('.ga-photo-add'),
    err: document.querySelector('.ga-photo-err')?.textContent ?? '',
    tiny: { href: document.querySelector('[data-act="tinypng"]')?.href, target: document.querySelector('[data-act="tinypng"]')?.target, text: document.querySelector('[data-act="tinypng"]')?.textContent.trim() },
    first: document.querySelector('.ga-photo figcaption')?.textContent,
  }))
const upload = async (page, files) => {
  const input = await page.$('.ga-photo-add input[type="file"]')
  await input.uploadFile(...files)
  await wait(1500)
}

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
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1700)
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)

  let s = await picker(page)
  check(`${d} the new card has a place for photos: up to 3, up to 2 MB each`, s.there && s.label.includes('עד 3 תמונות') && s.label.includes('עד 2 מגה') && s.n === 0 && s.add, s.label)
  check(`${d} under it, a link to TinyPNG that opens in a new tab`, s.tiny.href === 'https://tinypng.com/' && s.tiny.target === '_blank' && s.tiny.text.includes('TinyPNG'), JSON.stringify(s.tiny))
  await page.screenshot({ path: `${out}/${d}-1-empty.png` })

  await upload(page, [big])
  s = await picker(page)
  check(`${d} a photo heavier than 2 MB is not taken, and the note says why`, s.n === 0 && s.err.includes('2.6 מגה') && s.err.includes('המקסימום הוא 2 מגה') && s.err.includes('TinyPNG'), s.err)
  await page.screenshot({ path: `${out}/${d}-2-too-heavy.png` })

  await upload(page, [text])
  s = await picker(page)
  check(`${d} a file that is not a picture is not taken`, s.n === 0 && s.err.includes('לא קובץ תמונה'), s.err)

  await upload(page, pics)
  s = await picker(page)
  check(`${d} four photos at once: only three are taken, and the note says so`, s.n === 3 && !s.add && s.err.includes('עד 3 תמונות') && s.first === 'ראשית', JSON.stringify({ n: s.n, add: s.add, err: s.err }))
  const fits = await page.evaluate(() => {
    const m = document.querySelector('.modal-panel, .modal > div, .modal')
    const g = document.querySelector('.ga-photo-grid').getBoundingClientRect()
    return { in: g.left >= 0 && g.right <= innerWidth, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, m: !!m }
  })
  check(`${d} the photos fit inside the window, nothing scrolls sideways`, fits.in && fits.ov <= 1, JSON.stringify(fits))
  await page.evaluate(() => document.querySelector('.ga-photos').scrollIntoView({ block: 'center' }))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-3-three-photos.png` })

  await page.evaluate(() => document.querySelectorAll('.ga-photo button')[1].click())
  await wait(300)
  s = await picker(page)
  check(`${d} a photo can be removed, and then there is room again`, s.n === 2 && s.add && s.err === '', JSON.stringify({ n: s.n, add: s.add }))
  await upload(page, [pics[3]])
  s = await picker(page)
  check(`${d} ... and a third can be added again`, s.n === 3 && !s.add)

  // a client who is looking has no photos
  await page.evaluate(() => [...document.querySelectorAll('.ga-fields .chip')].find((c) => c.textContent.includes('לקוח שמחפש')).click())
  await wait(300)
  check(`${d} photos are for a property only`, !(await picker(page)).there)
  await page.evaluate(() => [...document.querySelectorAll('.ga-fields .chip')].find((c) => c.textContent.trim() === 'נכס').click())
  await wait(300)
  check(`${d} going back to "נכס" keeps the photos`, (await picker(page)).n === 3)

  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((b) => b.textContent.includes('הוספה ל-CRM')).click())
  await wait(1700)
  const card = () =>
    page.evaluate(() => {
      const c = [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('דירת 4 חדרים בפתח תקווה'))
      const link = c?.querySelector('[data-act="owner-link"]')
      return { there: !!c, cover: c?.querySelector('.kan-photo img')?.src.slice(0, 22), small: c?.querySelectorAll('.ga-card-photos img').length, count: c?.querySelector('.ga-card-photos span')?.textContent.trim(), link: !!link }
    })
  s = await card()
  check(`${d} the card on the board shows the first photo, the other two small, and "3 תמונות"`, s.there && s.cover?.startsWith('data:image/jpeg') && s.small === 2 && s.count === '3 תמונות', JSON.stringify(s))
  await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('דירת 4 חדרים בפתח תקווה'))?.scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${d}-4-card.png` })

  const size = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (st.crm ?? []).find((x) => x.images)
    return { saved: !!it, kb: it ? Math.round(it.images.join('').length / 1024) : 0, total: Math.round((localStorage.getItem('brokers-demo-state-v5') ?? '').length / 1024) }
  })
  check(`${d} the photos are kept small in the browser (three together under 600 KB)`, size.saved && size.kb > 20 && size.kb < 600, JSON.stringify(size))
  await page.reload({ waitUntil: 'load' })
  await wait(1700)
  s = await card()
  check(`${d} the photos are still there after a reload`, s.there && s.cover?.startsWith('data:image/jpeg') && s.small === 2, JSON.stringify(s))

  // the owner's link does not try to carry an uploaded photo
  await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('דירת 4 חדרים בפתח תקווה'))?.querySelector('[data-act="owner-link"]')?.click())
  await wait(700)
  const url = await page.evaluate(() => document.querySelector('.ol-url input')?.value ?? '')
  check(`${d} the owner's link stays short (no photo inside it)`, url.includes('/o/p?') && !url.includes('data') && url.length < 700, `${url.length} chars`)
  await page.keyboard.press('Escape')
  await wait(400)

  // in the community the post shows the first photo
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(2000)
  const post = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.fb.ci, .ci')].find((c) => c.textContent.includes('דירת 4 חדרים בפתח תקווה'))
    return { there: !!p, img: p?.querySelector('.fb-media img')?.src.slice(0, 22), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
  check(`${d} the community post shows the property's first photo`, post.there && post.img?.startsWith('data:image/jpeg') && post.ov <= 1, JSON.stringify(post))
  await page.screenshot({ path: `${out}/${d}-5-post.png` })

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
