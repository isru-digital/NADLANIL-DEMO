// The free community under its own name ("מתווכים לעסקאות", מבית NadlanUP): its own entry page, straight to the feed
// with no dashboard, a clear way to the office's page, and the landing page builder and the folder locked for it.
// Usage: node scripts/kehila-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/kehila'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  if (!ok) console.error(line)
}
const NAME = 'מתווכים לעסקאות'
const OLD = 'המתווכים החופשיים'
const text = (page) => page.evaluate(() => document.body.innerText)
const path = (page) => page.evaluate(() => location.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '') || '/')
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const shot = async (page, name) => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(300)
  await page.screenshot({ path: `${out}/${name}.png` })
}

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })

  // ---- 1. the community's own entry page
  await page.goto(green + '/kehila', { waitUntil: 'load' })
  await wait(1700)
  let t = await text(page)
  const hero = await page.evaluate(() => ({
    h1: document.querySelector('.kh-hero h1')?.textContent.trim(),
    from: document.querySelector('.kh-from')?.textContent.replace(/\s+/g, ' ').trim(),
    sub: [...document.querySelectorAll('.kh-sub li')].map((x) => x.textContent.trim()),
    h1Size: parseFloat(getComputedStyle(document.querySelector('.kh-hero h1')).fontSize),
    fromSize: parseFloat(getComputedStyle(document.querySelector('.kh-from')).fontSize),
    office: !!document.querySelector('.logo img'),
    title: document.title,
  }))
  check(`${d} entry page: the name is large, "מבית NadlanUP" small under it`, hero.h1 === NAME && hero.from === 'מבית NadlanUP' && hero.h1Size > hero.fromSize * 2, JSON.stringify(hero))
  check(`${d} entry page: the line "נכסים | קונים | שיתופי פעולה"`, hero.sub.join('|') === 'נכסים|קונים|שיתופי פעולה', hero.sub.join('|'))
  check(`${d} entry page: the description, word for word`, t.includes('הקהילה החינמית שמחברת בין מתווכים מכל הארץ, לשיתוף נכסים, איתור קונים, התייעצויות ויצירת הזדמנויות עסקיות.'))
  check(`${d} entry page: its own name, not the office's logo, and its own tab title`, !hero.office && hero.title.startsWith(NAME), hero.title)
  check(`${d} entry page: the landing page and the folder are marked "זמין לחברי המשרד"`, (t.match(/זמין לחברי המשרד/g) ?? []).length === 2)
  check(`${d} entry page: a way to the office's page ("שדרג למשרד NadlanUP")`, await page.evaluate(() => [...document.querySelectorAll('a')].some((a) => a.textContent.includes('שדרג למשרד NadlanUP') && a.pathname.endsWith('/join/office'))))
  check(`${d} entry page: nothing scrolls sideways`, (await overflow(page)) <= 1)
  await shot(page, `${d}-1-entry`)
  await page.screenshot({ path: `${out}/${d}-1-entry-full.png`, fullPage: true })

  // ---- 2. entering goes straight to the feed, no dashboard
  await page.evaluate(() => [...document.querySelectorAll('.kh-cta a')].find((a) => a.textContent.includes('כניסה'))?.click())
  await wait(1800)
  check(`${d} "כניסה לחברים" lands in the feed`, (await path(page)) === '/app/community', await path(page))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1800)
  check(`${d} a community member has no dashboard: /app goes to the feed`, (await path(page)) === '/app/community', await path(page))
  const menu = await page.evaluate(() => ({
    side: [...document.querySelectorAll('.side-nav .side-link')].map((a) => a.textContent.trim()),
    bottom: [...document.querySelectorAll('.bottom-nav .bottom-link')].map((a) => a.textContent.trim()),
    locks: [...document.querySelectorAll('.side-nav .side-link')].filter((a) => a.querySelector('.nav-lock')).map((a) => a.textContent.trim()),
    brand: document.querySelector(getComputedStyle(document.querySelector('.sidebar')).display === 'none' ? '.topbar-brand' : '.sidebar-brand')?.textContent.replace(/\s+/g, ' ').trim(),
    brandTo: document.querySelector(getComputedStyle(document.querySelector('.sidebar')).display === 'none' ? '.topbar-brand' : '.sidebar-brand')?.pathname,
  }))
  check(`${d} the menu has no dashboard line`, !menu.side.includes('דשבורד') && !menu.bottom.includes('דשבורד'), menu.side.join(' / '))
  check(`${d} the landing page builder and the folder are in the menu, locked`, menu.locks.length === 2 && menu.locks.some((x) => x.includes('דף נחיתה')) && menu.locks.some((x) => x.includes('פולדר')), menu.locks.join(' / '))
  check(`${d} the app carries the community's name, and it leads to the community's page`, menu.brand.includes(NAME) && menu.brand.includes('מבית NadlanUP') && /\/kehila$/.test(menu.brandTo), `${menu.brand} -> ${menu.brandTo}`)

  // ---- 3. the way to the office from inside the community
  const banner = await page.evaluate(() => {
    const a = document.querySelector('.upb')
    const r = a?.getBoundingClientRect()
    return a ? { text: a.textContent.replace(/\s+/g, ' ').trim(), to: a.pathname, top: Math.round(r.top), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth } : null
  })
  check(`${d} the feed has a clear "שדרג למשרד NadlanUP" strip, on the first screen`, !!banner && banner.text.includes('שדרג למשרד NadlanUP') && banner.top < 400 && banner.inside && banner.h >= 44, JSON.stringify(banner))
  check(`${d} nothing scrolls sideways in the feed`, (await overflow(page)) <= 1)
  await shot(page, `${d}-2-feed`)
  await page.evaluate(() => document.querySelector('.upb')?.click())
  await wait(1700)
  check(`${d} the strip leads to the office's page`, (await path(page)) === '/join/office', await path(page))
  check(`${d} the office's page shows the fee 689 ₪ לחודש, unchanged`, (await text(page)).includes('689 ₪ לחודש'))

  // ---- 4. the two tools that belong to the office
  for (const [id, title] of [['builder', 'בונה דף נחיתה'], ['folder', 'פולדר דיגיטלי']]) {
    await page.goto(green + '/app/' + id, { waitUntil: 'load' })
    await wait(1700)
    const s = await page.evaluate(() => ({
      tag: document.querySelector('.of-locked .of-tag')?.textContent.trim(),
      h1: document.querySelector('.of-locked h1')?.textContent.trim(),
      cta: [...document.querySelectorAll('.of-locked-cta a')].map((a) => `${a.textContent.trim()}>${a.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '')}`),
      real: !!document.querySelector('.builder, .bld, .folder, .lp'),
    }))
    check(`${d} /app/${id} is closed to a community member, with "זמין לחברי המשרד"`, s.tag === 'זמין לחברי המשרד' && s.h1 === title && !s.real, JSON.stringify(s))
    check(`${d} /app/${id}: its button is "שדרג למשרד NadlanUP" and leads to the office's page`, s.cta.some((c) => c.startsWith('שדרג למשרד NadlanUP') && c.endsWith('>/join/office')), s.cta.join(' , '))
    check(`${d} /app/${id}: nothing scrolls sideways`, (await overflow(page)) <= 1)
    await shot(page, `${d}-3-locked-${id}`)
  }
  if (d === 'phone') {
    await page.goto(green + '/app/community', { waitUntil: 'load' })
    await wait(1500)
    await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1)?.click())
    await wait(700)
    const more = await page.evaluate(() => [...document.querySelectorAll('.more-sheet .more-link')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()))
    check('phone: the "עוד" sheet shows both tools with "זמין לחברי המשרד"', more.filter((x) => x.includes('זמין לחברי המשרד')).length === 2, more.join(' / '))
    await page.screenshot({ path: `${out}/phone-4-more.png` })
  }

  // ---- 5. joining the community: under its name, no landing page step, ends in the feed
  await page.goto(green + '/kehila/join', { waitUntil: 'load' })
  await wait(1500)
  const j = await page.evaluate(() => ({
    steps: [...document.querySelectorAll('.join-steps li')].map((x) => x.textContent.replace(/^\d+/, '').trim()),
    brand: document.querySelector('.join-brand')?.textContent.replace(/\s+/g, ' ').trim(),
    logo: !!document.querySelector('.join-top .logo'),
  }))
  check(`${d} joining: four steps, no landing page step, under the community's name`, j.steps.length === 4 && !j.steps.some((x) => x.includes('הדף העסקי')) && j.brand?.includes(NAME) && !j.logo, JSON.stringify(j))
  await shot(page, `${d}-5-join`)
  await page.evaluate(() => document.querySelector('.join-card form button.btn-gold')?.click())
  await wait(900)
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => [...document.querySelectorAll('.join-actions .btn-gold')].at(-1)?.click())
    await wait(900)
  }
  await page.evaluate(() => [...document.querySelectorAll('.join-actions button')].find((b) => b.textContent.includes('אעלה אחר כך'))?.click())
  await wait(1800)
  check(`${d} joining ends in the feed`, (await path(page)) === '/app/community', await path(page))

  // ---- 6. an office member: the dashboard and both tools are there, under the office's logo
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1800)
  const o = await page.evaluate(() => ({
    side: [...document.querySelectorAll('.side-nav .side-link')].map((a) => a.textContent.trim()),
    locks: document.querySelectorAll('.side-nav .nav-lock').length,
    logo: !!document.querySelector('.sidebar-brand .logo img, .topbar-brand .logo img'),
    upb: !!document.querySelector('.upb'),
  }))
  check(`${d} an office member keeps the dashboard`, (await path(page)) === '/app' && o.side[0] === 'דשבורד', `${await path(page)} ${o.side.join(' / ')}`)
  check(`${d} an office member: nothing locked, the office's logo, no upgrade strip`, o.locks === 0 && o.logo && !o.upb, JSON.stringify(o))
  await shot(page, `${d}-6-office-dashboard`)
  for (const id of ['builder', 'folder']) {
    await page.goto(green + '/app/' + id, { waitUntil: 'load' })
    await wait(1500)
    check(`${d} an office member opens /app/${id}`, !(await page.evaluate(() => !!document.querySelector('.of-locked'))))
  }

  // ---- 7. the old name is gone, the office's logo stands alone, the comparison moved the two tools
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'community'))
  for (const r of ['/', '/join', '/join/office', '/about', '/upgrade', '/kehila', '/app/community', '/app/office']) {
    await page.goto(green + r, { waitUntil: 'load' })
    await wait(1400)
    t = await text(page)
    const sub = await page.evaluate(() => !!document.querySelector('.logo-sub, .hg-pill-sub, .hg-final-sub'))
    check(`${d} ${r}: "${OLD}" is gone and the logo has no second line`, !t.includes(OLD) && !sub && !(await page.evaluate(() => document.title)).includes(OLD))
    if (r === '/') {
      check(`${d} home: a door to the community under its name`, await page.evaluate(() => !!document.querySelector('.hg-kehila-card a[href$="/kehila"]')) && t.includes(NAME))
      await page.evaluate(() => document.querySelector('.hg-kehila')?.scrollIntoView({ block: 'center' }))
      await wait(900)
      await page.screenshot({ path: `${out}/${d}-7-home-door.png` })
    }
    if (r === '/join') await shot(page, `${d}-7-join-choice`)
    if (r === '/upgrade') {
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('.up-row')].map((row) => ({ what: row.querySelector('.up-what')?.textContent.trim(), free: !!row.querySelector('.up-cell .up-yes') && !row.querySelector('.up-cell:not(.is-office) .up-no') })),
      )
      const b = rows.find((x) => x.what?.startsWith('בונה דף נחיתה'))
      const f = rows.find((x) => x.what?.startsWith('פולדר דיגיטלי'))
      check(`${d} the comparison: the landing page and the folder are in the office only`, !!b && !!f && !b.free && !f.free, JSON.stringify([b, f]))
      check(`${d} the comparison: the community's column carries its name`, await page.evaluate((n) => document.querySelector('.up-col.is-community b')?.textContent.trim() === n, NAME))
      check(`${d} the comparison: nothing scrolls sideways`, (await overflow(page)) <= 1)
      await shot(page, `${d}-7-upgrade`)
    }
  }
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
