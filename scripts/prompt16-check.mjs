// Prompt 16 (Itzik 27.11.2026): the office's page and its words. On a computer and on a phone, by day and by night:
// 1. "מי אנחנו" on the office's page, and the page says "סוכן", never "מתווך".
// 2. the small box "0% / 100%" at the foot of the side menu is gone; the message stays on the office's page.
// 3. a locked tool of the office says "בדיקת התאמה למשרד", not "שדרג" / "שדרוג".
// Usage: node scripts/prompt16-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/prompt-16'
const FIT = 'בדיקת התאמה למשרד'
const FEE = '0% עמלה למשרד, 100% עמלה לסוכן'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
process.on('unhandledRejection', async (e) => {
  console.error('CRASH', e)
  await browser.close().catch(() => {})
  process.exit(2)
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']'}`
  results.push(line)
  if (!ok) console.error(line)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'

/** the contrast of an element's text against the first solid background under it (WCAG ratio) */
const contrastOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const chain = []
    for (let n = el; n; n = n.parentElement) chain.unshift(getComputedStyle(n).backgroundColor)
    let bg = [255, 255, 255]
    for (const c of chain) {
      const [r, g, b, a = 1] = rgb(c)
      if (c === 'transparent' || a === 0) continue
      bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    }
    const [r, g, b, a = 1] = rgb(getComputedStyle(el).color)
    const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p)
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
  }, sel)

for (const dev of [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]) {
  const d = dev.name
  const phone = d === 'phone'
  for (const mode of ['day', 'night']) {
    const t = `${d} ${mode}`
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
      } catch {}
    })
    await page.setViewport(dev.vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate(
      (m, p) => {
        localStorage.clear()
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-preview-v1', p)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      },
      mode,
      PREVIEW,
    )
    const shot = async (name, sel) => {
      if (sel) await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {})
      await wait(350)
      await page.screenshot({ path: `${out}/${d}-${mode}-${name}.png` })
    }
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

    // =============================================================== 1. "מי אנחנו" on the office's page
    await page.goto(green + '/app/office', { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-office-story]', { visible: true })
    await page.$eval('[data-section="who"]', (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await wait(3200)
    const who = await page.evaluate(() => {
      const root = document.querySelector('[data-office-story]')
      const s = root.querySelector('[data-section="who"]')
      const btn = s.querySelector('[data-act="fit-check"]')
      const r = btn?.getBoundingClientRect()
      const kids = [...root.children]
      return {
        tag: s.querySelector('.os-tag')?.textContent.trim(),
        h2: s.querySelector('h2')?.innerText.replace(/\s+/g, ' ').trim(),
        lead: s.querySelector('[data-who="lead"]')?.textContent.trim(),
        rows: [...s.querySelectorAll('.os-who-row h3')].map((h) => h.textContent.trim()),
        rowText: [...s.querySelectorAll('.os-who-row p')].map((h) => h.textContent.trim()),
        icons: s.querySelectorAll('.os-who-row svg').length,
        btn: btn?.textContent.trim(),
        btnH: Math.round(r?.height ?? 0),
        btnIn: !!r && r.left >= 0 && r.right <= innerWidth,
        after: kids.indexOf(s) === kids.indexOf(root.querySelector('.os-hero')) + 1,
        cut: [...s.querySelectorAll('h2, h3, p, button')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 30)),
        text: root.innerText,
        splitBroker: root.querySelector('.os-split .is-broker span')?.textContent,
        splitLabel: root.querySelector('.os-split')?.getAttribute('aria-label'),
      }
    })
    const whoWords = [who.h2, who.lead, ...who.rows, ...who.rowText].join(' ')
    check(`${t}: the office's page has "מי אנחנו", right after the top of the page`, who.tag === 'מי אנחנו' && who.after, who.tag)
    check(`${t}: its headline and its line are the two lines that were given`, who.h2 === 'הגיע הזמן להרוויח את הכסף שבאמת מגיע לכם' && who.lead === 'גב משרדי מלא לסוכנים שלנו, שנהנים מ-100% מהעמלה שלהם.', { h2: who.h2, lead: who.lead })
    check(`${t}: three short points with icons, and one says that the office picks who joins`, who.rows.length === 3 && who.icons === 3 && who.rows[2] === 'המשרד בוחר את הסוכנים שלו' && /לא כל אחד מצטרף/.test(who.rowText[2] ?? ''), who.rows)
    check(`${t}: the button there is "${FIT}", big enough for a thumb, inside the screen`, who.btn === FIT && who.btnH >= 48 && who.btnIn, { b: who.btn, h: who.btnH })
    check(`${t}: nothing in "מי אנחנו" is cut`, who.cut.length === 0, who.cut)
    check(`${t}: the office's page says "סוכן", never "מתווך"`, !/מתוו/.test(who.text) && /סוכנ/.test(who.text), who.text.match(/.{0,25}מתוו.{0,25}/)?.[0])
    check(`${t}: the fee reads "${FEE}" on the page (the message stays here)`, (who.text.match(/0% עמלה למשרד, 100% עמלה לסוכן/g) ?? []).length >= 3 && who.splitBroker === 'עמלה לסוכן' && who.splitLabel === 'מכל עסקה: ' + FEE, { n: (who.text.match(/100% עמלה לסוכן/g) ?? []).length, s: who.splitBroker })
    check(`${t}: "מי אנחנו" adds no number and no promise of its own, and no dashes`, !/[–—]/.test(who.text) && !/₪|מובטח|מבטיחים/.test(whoWords) && (whoWords.match(/\d+/g) ?? []).every((n) => n === '100'), whoWords.match(/\d+/g))
    for (const [name, sel] of [
      ['the tag', '[data-section="who"] .os-tag'],
      ['the headline', '[data-section="who"] h2'],
      ['the coloured words of the headline', '[data-section="who"] h2 em'],
      ['the line', '[data-section="who"] [data-who="lead"]'],
      ['a point', '[data-section="who"] .os-who-row h3'],
      ['the line of a point', '[data-section="who"] .os-who-row p'],
    ]) {
      const c = await contrastOf(page, sel)
      const need = /headline/.test(name) ? 3 : 4.5
      check(`${t}: ${name} of "מי אנחנו" reads clearly (${need} to 1 at least)`, c !== null && c >= need, c)
    }
    check(`${t}: the office's page does not scroll sideways`, (await sideways()) <= 0)
    await shot('1-who', '[data-section="who"]')
    await page.$eval('[data-section="who"] [data-act="fit-check"]', (b) => b.click())
    await page.waitForSelector('[data-sheet="lead"]', { visible: true, timeout: 5000 }).catch(() => {})
    await wait(400)
    check(`${t}: "${FIT}" opens the short form to the office's staff`, await page.evaluate(() => !!document.querySelector('[data-sheet="lead"] [data-lead="phone"]')))
    await page.keyboard.press('Escape')
    await wait(400)

    // the same page on its own address
    await page.goto(green + '/office', { waitUntil: 'networkidle0' })
    await wait(600)
    const alone = await page.evaluate(() => ({ who: document.querySelector('[data-section="who"] .os-tag')?.textContent.trim(), broker: /מתוו/.test(document.querySelector('[data-office-story]')?.innerText ?? 'מתווך') }))
    check(`${t}: the same on the page's own address (/office)`, alone.who === 'מי אנחנו' && !alone.broker && (await sideways()) <= 0, alone)

    // =============================================================== 2. the small box at the foot of the side menu
    await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
    await wait(800)
    const side = await page.evaluate(() => {
      const f = document.querySelector('.sidebar-foot')
      return { box: document.querySelectorAll('.side-principle').length, foot: f?.textContent.replace(/\s+/g, ' ').trim() ?? '', user: !!f?.querySelector('.side-user'), menu: document.querySelector('.sidebar')?.textContent ?? '' }
    })
    check(`${t}: the small "0% / 100%" box is gone from the side menu`, side.box === 0 && !/%|עמלה|גב קהילתי/.test(side.foot) && !/עמלה למשרד|עמלה לסוכן|עמלה למתווך/.test(side.menu), side.foot)
    check(`${t}: the rest of the foot of the menu stays: the name and the picture`, side.user && side.foot.length > 0, side.foot)
    if (!phone) await shot('2-side-menu', '.sidebar-foot')
    for (const p of ['/app/crm', '/app/office']) {
      await page.goto(green + p, { waitUntil: 'networkidle0' })
      await wait(500)
      check(`${t}: no such box on ${p} either`, (await page.evaluate(() => document.querySelectorAll('.side-principle').length)) === 0)
    }

    // =============================================================== 3. the words on a locked tool of the office
    for (const id of ['builder', 'folder']) {
      await page.goto(green + '/app/' + id, { waitUntil: 'networkidle0' })
      await page.waitForSelector('.of-locked', { visible: true })
      await wait(500)
      const lock = await page.evaluate(() => {
        const a = document.querySelector('.of-locked [data-act="fit-check"]')
        const r = a?.getBoundingClientRect()
        return { text: document.querySelector('.of-locked').innerText, btn: a?.textContent.trim(), to: a?.pathname ?? '', h: Math.round(r?.height ?? 0), inside: !!r && r.left >= 0 && r.right <= innerWidth, cut: !!a && a.scrollWidth > a.clientWidth + 1 }
      })
      check(`${t}: /app/${id}: the lock says "${FIT}", not "שדרג", and leads to the office's page`, lock.btn === FIT && lock.to.endsWith('/app/office') && !/שדרג|שדרוג/.test(lock.text), lock.btn)
      check(`${t}: /app/${id}: the button is whole, inside the screen, 44px at least`, lock.h >= 44 && lock.inside && !lock.cut && (await sideways()) <= 0, { h: lock.h, inside: lock.inside, cut: lock.cut })
      if (id === 'builder') await shot('3-builder-lock', '.of-locked-cta')
    }
    await page.goto(green + '/app/crm', { waitUntil: 'networkidle0' })
    await wait(800)
    const crm = await page.evaluate(() => {
      const a = document.querySelector('.ct-office[data-act="office-only"]')
      return { text: a?.textContent.replace(/\s+/g, ' ').trim() ?? '', to: a?.pathname ?? '', cut: !!a && a.scrollWidth > a.clientWidth + 1 }
    })
    check(`${t}: the locked fields of the CRM say "${FIT}", not "שדרג"`, crm.text.includes(FIT) && crm.text.includes('זמין לחברי המשרד') && !/שדרג|שדרוג/.test(crm.text) && crm.to.endsWith('/app/office') && !crm.cut, crm.text)
    if (mode === 'day') await shot('4-crm-lock', '.ct-office[data-act="office-only"]')
    await page.evaluate(() => document.querySelector('.ct-table tbody tr[data-id="k1"] [aria-label^="פרטי הלקוח"]').click())
    await page.waitForSelector('.ct-det', { visible: true, timeout: 8000 })
    await wait(450)
    const card = await page.evaluate(() => document.querySelector('.ct-det .ct-office[data-act="office-only"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '')
    check(`${t}: the same inside the card of a client`, card.includes(FIT) && !/שדרג|שדרוג/.test(card), card)
    await page.keyboard.press('Escape')
    await wait(300)
    const src = ['src/community/CommunityShell.tsx', 'src/crm/ClientsTable.tsx', 'src/components/TieredLab.tsx'].map((f) => readFileSync(f, 'utf8'))
    check(`${t}: in the code, no locked tool of the office carries "שדרג" or "שדרוג"`, !/UPGRADE_LABEL/.test(src[1]) && !/שדרוג|שדרג/.test(src[2]) && /FIT_LABEL/.test(src[0]) && /ולבדיקת התאמה למשרד/.test(src[2]))

    // =============================================================== 4. the same words everywhere, and /join/office
    await page.goto(green + '/join/office', { waitUntil: 'networkidle0' })
    await wait(900)
    const jo = await page.evaluate(() => ({ text: document.querySelector('.jo')?.innerText ?? 'מתווך', small: document.querySelector('.jo-price small')?.textContent ?? '' }))
    check(`${t}: /join/office says "סוכן", never "מתווך", and the fee reads "${FEE}"`, !/מתוו/.test(jo.text) && jo.text.includes(FEE) && jo.small === '100% עמלה לסוכן' && (await sideways()) <= 0, jo.text.match(/.{0,25}מתוו.{0,25}/)?.[0] ?? jo.small)
    if (mode === 'day') await shot('5-join-office')
    await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
    await wait(900)
    const post = await page.evaluate(() => document.querySelector('[data-upgrade="post"] b')?.textContent.trim() ?? '')
    check(`${t}: the office's quiet post in the feed says "${FIT}"`, post === FIT, post)
    await page.evaluate(() => document.querySelector('[data-act="open-profile"]')?.click())
    await page.waitForSelector('[data-upgrade="menu"]', { timeout: 5000 }).catch(() => {})
    const menu = await page.evaluate(() => document.querySelector('[data-upgrade="menu"] b')?.textContent.trim() ?? '')
    check(`${t}: the menu of the picture says "${FIT}"`, menu === FIT, menu)
    await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
    await wait(900)
    const pitch = await page.evaluate(() => ({ btn: document.querySelector('[data-act="office-pitch"] span')?.textContent.trim() ?? '', old: /שדרג למשרד/.test(document.body.innerText) }))
    check(`${t}: the button on the community's page says "${FIT}", and "שדרג למשרד" is nowhere on it`, pitch.btn === FIT && !pitch.old, pitch)

    check(`${t}: no errors in the page`, errors.length === 0, errors.slice(0, 3))
    await page.close()
  }
}

const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(results.join('\n'))
console.log(`\n${results.length - failed}/${results.length} passed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)
