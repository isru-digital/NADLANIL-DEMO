// A property put in the CRM goes up to the community by itself, in its own area, without the owner's name, phone or
// the broker's notes; a published property gets a "קישור לבעל הנכס" (a small page for the owner); and the shared
// deal room tool is called "טינדר של הדירות".
// Usage: node scripts/owner-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/owner'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  if (!ok) console.error(line)
}
const OWNER = 'ישראל ישראלי'
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const clickText = (page, sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find((el) => el.textContent.includes(t))?.click(), sel, text)
const propsTab = async (page) => {
  await clickText(page, '.seg .seg-btn', 'נכסים')
  await wait(800)
}
const today = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const context = await browser.createBrowserContext()
  await context.overridePermissions(new URL(green).origin, ['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  const shot = async (name) => {
    await wait(300)
    await page.screenshot({ path: `${out}/${d}-${name}.png` })
  }

  // ---- 1. the properties board says it, in place of the on / off switch
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1600)
  await propsTab(page)
  let st = await page.evaluate(() => ({ note: document.querySelector('[data-note="auto-publish"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '', sw: !!document.querySelector('.auto-bar'), links: document.querySelectorAll('[data-act="owner-link"]').length }))
  check(`${d} the board says every property goes up to the community by itself, and that the owner's details never do`, st.note.includes('מתפרסם אוטומטית בקהילה, באזור של הנכס') && st.note.includes('שם בעל הנכס, הטלפון שלו וההערות הפנימיות לא מתפרסמים אף פעם') && !st.sw, st.note)
  check(`${d} a property that was not published has no owner link yet`, st.links === 0, String(st.links))

  // ---- 2. a new property, with an owner's name in the card
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  await clickText(page, '.ga-from-wa', 'למלא מהודעת וואטסאפ')
  await wait(400)
  await clickText(page, '.ga-paste .tl-alt', 'הודעה לדוגמה')
  await wait(300)
  await clickText(page, '.ga-paste .btn', 'למלא מההודעה')
  await wait(500)
  await page.evaluate(() => [...document.querySelectorAll('.modal label, .modal .field')].find((l) => l.textContent.includes('שם בעל הנכס'))?.querySelector('input')?.focus())
  await page.keyboard.type(OWNER)
  await clickText(page, '.ga-go', 'הוספה ל-CRM')
  await wait(1600)
  st = await page.evaluate((owner) => {
    const card = [...document.querySelectorAll('.kan-card')].find((c) => c.textContent.includes('דירת 4 חדרים בפתח תקווה'))
    return { card: !!card, owner: card?.textContent.includes(owner), published: card?.textContent.includes('פורסם בקהילה'), link: !!card?.querySelector('[data-act="owner-link"]'), toast: document.querySelector('.toast')?.textContent ?? '' }
  }, OWNER)
  check(`${d} a new property is on the board, already published, with the owner link on its card`, st.card && st.owner && st.published && st.link, JSON.stringify(st))
  await shot('1-board-published')

  // ---- 3. in the community: in the property's city, and nothing of the owner
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(2000)
  st = await page.evaluate((owner) => {
    const post = [...document.querySelectorAll('.fb.ci, .ci')].find((c) => c.textContent.includes('דירת 4 חדרים בפתח תקווה'))
    return { post: !!post, city: post?.textContent.includes('פתח תקווה'), owner: document.body.innerText.includes(owner), note: post?.textContent.includes('מרפסת שמש, חניה') }
  }, OWNER)
  check(`${d} the property is in the community, in its own city`, st.post && st.city, JSON.stringify(st))
  check(`${d} the owner's name and the internal note are not in the community`, st.post && !st.owner && !st.note, JSON.stringify(st))
  await shot('2-community-post')

  // ---- 4. the link for the owner
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1500)
  await propsTab(page)
  await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((c) => c.textContent.includes('דירת 4 חדרים בפתח תקווה'))?.querySelector('[data-act="owner-link"]')?.click())
  await wait(800)
  st = await page.evaluate(() => ({
    title: document.querySelector('.modal h2, .modal-title')?.textContent.trim() ?? '',
    facts: document.querySelector('.ol-facts')?.textContent.replace(/\s+/g, ' ') ?? '',
    url: document.querySelector('.ol-url input')?.value ?? '',
    priv: document.querySelector('.ol-private')?.textContent ?? '',
  }))
  const url = st.url
  check(`${d} "קישור לבעל הנכס" shows the property, the community, the date and a demo number of brokers`, st.title.includes('קישור לבעל הנכס') && st.facts.includes('דירת 4 חדרים בפתח תקווה') && st.facts.includes('קהילת מתווכים לעסקאות') && st.facts.includes(today()) && st.facts.includes('נתון דמו'), st.facts)
  check(`${d} the link leads to the owner's page and carries nothing of the owner`, url.includes('/o/p?') && !decodeURIComponent(url).includes(OWNER) && !decodeURIComponent(url).includes('חניה') && st.priv.includes('לא נמצאים בו'), decodeURIComponent(url).slice(0, 160))
  await shot('3-owner-link-window')
  await page.evaluate(() => document.querySelector('[data-act="copy-owner-link"]')?.click())
  await wait(600)
  st = await page.evaluate(async () => ({ btn: document.querySelector('[data-act="copy-owner-link"]')?.textContent.trim(), clip: await navigator.clipboard.readText().catch(() => null), toast: document.querySelector('.toast')?.textContent ?? '' }))
  check(`${d} the broker copies the link himself (nothing is sent)`, st.btn === 'הקישור הועתק' && st.toast.includes('הקישור הועתק') && (st.clip === null || st.clip === '' || st.clip === url), JSON.stringify({ btn: st.btn, clip: String(st.clip).slice(0, 60) }))

  // ---- 5. the owner's page, as the owner opens it (a clean browser: nothing of the broker's is stored there)
  const ownerCtx = await browser.createBrowserContext()
  const op = await ownerCtx.newPage()
  await op.setViewport(dev.vp)
  await op.goto(url, { waitUntil: 'load' })
  await wait(1800)
  st = await op.evaluate((owner) => ({
    h1: document.querySelector('.own h1')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    card: document.querySelector('.own-card')?.textContent ?? '',
    date: document.querySelector('[data-stat="date"] b')?.textContent.trim(),
    viewers: document.querySelector('[data-stat="viewers"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    n: Number(document.querySelector('[data-stat="viewers"] .num')?.textContent),
    owner: document.body.innerText.includes(owner),
    priv: document.querySelector('.own-private')?.textContent ?? '',
    mode: document.documentElement.dataset.mode,
    controls: !!document.querySelector('.dn, .dreset'),
    brand: document.querySelector('.own-brand')?.textContent.replace(/\s+/g, ' ').trim(),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), OWNER)
  check(`${d} owner's page: the property was published in the community "מתווכים לעסקאות"`, st.h1.includes('הנכס שלך פורסם') && st.h1.includes('מתווכים לעסקאות') && st.card.includes('דירת 4 חדרים בפתח תקווה') && st.brand?.includes('מתווכים לעסקאות'), st.h1)
  check(`${d} owner's page: the date, and how many brokers in the area see it, marked as a demo number`, st.date === today() && st.n > 0 && st.viewers.includes('מתווכים באזור פתח תקווה') && st.viewers.includes('נתון דמו'), `${st.date} ${st.viewers}`)
  check(`${d} owner's page: no owner's name, and it says what is never published`, !st.owner && st.priv.includes('השם שלך, הטלפון שלך וההערות של המתווך'), st.priv)
  check(`${d} owner's page: always light, none of the demo's corner controls, and nothing scrolls sideways`, st.mode === 'day' && st.overflowX <= 1 && !st.controls, JSON.stringify({ m: st.mode, o: st.overflowX, c: st.controls }))
  await op.screenshot({ path: `${out}/${d}-4-owner-page.png` })
  await op.goto(green + '/o/p', { waitUntil: 'load' })
  await wait(1200)
  check(`${d} owner's page without a property in the link shows a marked example`, await op.evaluate(() => document.querySelector('.own-foot')?.textContent.includes('עמוד לדוגמה')))
  await ownerCtx.close()

  // ---- 6. the pull from Yad2 publishes too
  await page.keyboard.press('Escape')
  await wait(400)
  await clickText(page, '.seg .seg-btn', 'לקוחות')
  await wait(700)
  await page.evaluate(() => document.querySelector('[data-act="yad2"]').click())
  await wait(700)
  await page.evaluate(() => {
    document.querySelector('.ct-y2-item[data-id="y2"]').click()
    document.querySelector('.ct-y2-item[data-id="y4"]').click()
  })
  await page.evaluate(() => document.querySelector('[data-act="take"]').click())
  await wait(1500)
  await propsTab(page)
  st = await page.evaluate(() => ['דירת 3 חדרים בקומה שנייה', 'דירת 5 חדרים עם מחסן'].map((t) => { const c = [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes(t)); return !!c && c.textContent.includes('פורסם בקהילה') && !!c.querySelector('[data-act="owner-link"]') }))
  check(`${d} properties pulled from Yad2 are published too, each with its owner link`, st.every(Boolean), JSON.stringify(st))
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(1800)
  st = await page.evaluate(() => ({ a: document.body.innerText.includes('דירת 3 חדרים בקומה שנייה'), b: document.body.innerText.includes('דירת 5 חדרים עם מחסן'), internal: document.body.innerText.includes('נמשך מיד 2'), once: [...document.querySelectorAll('.fb.ci, .ci')].filter((c) => c.textContent.includes('דירת 4 חדרים בפתח תקווה')).length }))
  check(`${d} ... and they are in the community, without the internal note, each property once`, st.a && st.b && !st.internal && st.once >= 1 && st.once <= 2, JSON.stringify(st))
  check(`${d} nothing scrolls sideways in the feed`, (await overflow(page)) <= 1)

  // ---- 7. the tool's new name
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1600)
  if (d === 'desktop') {
    st = await page.evaluate(() => ({ side: [...document.querySelectorAll('.side-lab-link')].map((b) => b.textContent.trim()) }))
    check('desktop the sidebar shows "טינדר של הדירות", not the old name', st.side.includes('טינדר של הדירות') && !st.side.some((x) => x.includes('חדר עסקה משותף')), st.side.join(' / '))
    await clickText(page, '.side-lab-link', 'כל הכלים')
  } else {
    await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1)?.click())
    await wait(600)
    await clickText(page, '.more-link', 'מעבדת בטא')
  }
  await wait(900)
  st = await page.evaluate(() => ({ tiles: [...document.querySelectorAll('.bl-tile')].map((t) => t.textContent), }))
  check(`${d} the lab shows "טינדר של הדירות", not the old name`, st.tiles.some((t) => t.includes('טינדר של הדירות')) && !st.tiles.some((t) => t.includes('חדר עסקה משותף')), `${st.tiles.length} tiles`)
  await shot('5-lab-name')
  await page.evaluate(() => [...document.querySelectorAll('.bl-tile')].find((t) => t.textContent.includes('טינדר של הדירות'))?.click())
  await wait(1500)
  st = await page.evaluate(() => ({ h2: document.querySelector('.dr-head h2')?.textContent.trim(), label: document.querySelector('.dr [aria-label*="דמו"], [aria-label*="טינדר"]')?.getAttribute('aria-label') }))
  check(`${d} the tool opens under its new name`, st.h2 === 'טינדר של הדירות', JSON.stringify(st))
  await shot('6-tool-open')
  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await wait(1300)
  check(`${d} the office page uses the new name too`, await page.evaluate(() => document.body.textContent.includes('טינדר של הדירות') && !document.body.textContent.includes('חדר עסקה משותף')))
  await page.goto(green + '/upgrade', { waitUntil: 'load' })
  await wait(1300)
  check(`${d} the comparison page uses the new name too`, await page.evaluate(() => document.body.textContent.includes('טינדר של הדירות') && !document.body.textContent.includes('חדר עסקה משותף')))

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await context.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
