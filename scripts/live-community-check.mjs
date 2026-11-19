// The community as a live community (16.11.2026, before the partners' meeting): no development marks inside, one
// small demo line at the foot, more content from all over the country, a page for every property, filters for
// properties and buyers, a regular example broker, a small upgrade strip, and the broker index that opens every time.
// Usage: node scripts/live-community-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/live-community'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  [' + String(detail).slice(0, 300) + ']' : ''}`
  results.push(line)
  console.log(line)
}
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const MARKS = ['מעבדת בטא', 'קרדיטים', 'תצוגת דמו', 'כל הכלים (', 'התחלה מחדש', 'איפוס']

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))
  await page.goto(green + '/demo', { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/app/community'), { timeout: 15000 })
  await wait(1500)
  const text = () => page.evaluate(() => document.body.innerText)
  const shot = async (name, sel) => {
    if (sel) {
      await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel)
      await page.evaluate(() => window.scrollBy(0, -70))
    } else await page.evaluate(() => window.scrollTo(0, 0))
    await wait(500)
    await page.screenshot({ path: `${out}/${d}-${name}.png` })
  }

  // ---------------------------------------------------------------- 1. no development marks in the community
  for (const path of ['/app/community', '/app/brokers', '/app/crm', '/app/community?topic=coop']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(1100)
    const t = await text()
    const found = MARKS.filter((m) => t.includes(m))
    const demos = (t.match(/נתוני דמו/g) ?? []).length
    const dom = await page.evaluate(() => ({ reset: !!document.querySelector('.dreset'), lab: !!document.querySelector('.side-lab'), wallet: !!document.querySelector('.mb-chip'), sw: !!document.querySelector('.ms'), foot: document.querySelector('[data-foot]')?.innerText.includes('נתוני דמו') }))
    check(`${d} ${path}: no development marks, "נתוני דמו" only once, in the line at the foot`, found.length === 0 && demos === 1 && dom.foot && !dom.reset && !dom.lab && !dom.wallet && !dom.sw, JSON.stringify({ found, demos, dom }))
  }
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1200)
  const strip = await page.evaluate(() => {
    // 19.11.2026: no strip above the screens any more; in the feed the call is one quiet post among the posts
    const s = document.querySelector('[data-upgrade="post"]')
    return { slim: !document.querySelector('.upb') && document.querySelectorAll('[data-upgrade="post"]').length === 1, h: Math.round(s?.getBoundingClientRect().height ?? 0), text: s?.innerText.replace(/\s+/g, ' ') }
  })
  check(`${d} "שדרג למשרד NadlanUP" is one small, quiet post in the feed, with no strip above the screen`, strip.slim && strip.h <= 110 && strip.text.includes('שדרג למשרד NadlanUP'), JSON.stringify(strip))
  const me = await page.evaluate(() => document.querySelector('.me-card .me-body > span:not(.avatar)')?.textContent ?? '')
  check(`${d} the example broker is a regular broker, not luxury`, me.includes('מתווכת דירות יד שנייה') && !me.includes('יוקרה'), me)
  await shot('1-feed')

  // ---------------------------------------------------------------- 2. the content
  // counted from the feed's own data (the figures that were on top gave way to the welcome, 17.11.2026)
  const counts = await page.evaluate(() => { const it = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').items ?? []; return Object.fromEntries(['coop', 'seeking', 'referrals'].map((t) => [t, it.filter((x) => x.topicId === t).length])) })
  await wait(900)
  const counts2 = await page.evaluate(() => { const it = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').items ?? []; return Object.fromEntries(['coop', 'seeking', 'referrals'].map((t) => [t, it.filter((x) => x.topicId === t).length])) })
  check(`${d} 15 properties, 15 buyers, 5 referrals in the feed`, counts2.coop === 15 && counts2.seeking === 15 && counts2.referrals === 5, JSON.stringify([counts, counts2]))
  const feed = await page.evaluate(() => ({ cities: [...new Set([...document.querySelectorAll('.ci .fb-city')].map((x) => x.textContent.trim()))], cards: document.querySelectorAll('.ci').length, times: [...document.querySelectorAll('.ci .fb-meta > span:first-child')].map((x) => x.textContent) }))
  check(`${d} posts from all over: Haifa, Beer Sheva, Ashdod, Petah Tikva, Netanya, Hadera, Afula`, ['חיפה', 'באר שבע', 'אשדוד', 'פתח תקווה', 'נתניה', 'חדרה', 'עפולה'].every((c) => feed.cities.includes(c)) && feed.cards >= 40, JSON.stringify(feed.cities))
  check(`${d} times from today, yesterday and this week, newest first`, feed.times[0].includes('דקות') && feed.times.includes('אתמול') && feed.times.some((x) => x.includes('ימים')), feed.times.slice(0, 6).join(','))

  // ---------------------------------------------------------------- 3. filters
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(1200)
  const count = () => page.evaluate(() => ({ n: Number(document.querySelector('[data-count]')?.textContent), cards: document.querySelectorAll('.ci').length }))
  let c = await count()
  check(`${d} properties: the filter shows 15`, c.n === 15 && c.cards === 15, JSON.stringify(c))
  await page.select('[data-filter="city"]', 'באר שבע')
  await wait(1200)
  c = await count()
  check(`${d} properties: city "באר שבע" leaves 2 (one for sale, one for rent)`, c.n === 2 && c.cards === 2, JSON.stringify(c))
  await page.evaluate(() => document.querySelector('[data-deal="rent"]').click())
  await wait(1200)
  c = await count()
  check(`${d} properties: and "השכרה" leaves 1`, c.n === 1, JSON.stringify(c))
  await page.evaluate(() => [...document.querySelectorAll('.flt-foot button')].find((b) => b.textContent.includes('ניקוי'))?.click())
  await wait(1200)
  await page.evaluate(() => document.querySelector('[data-deal="rent"]').click())
  await wait(1200)
  c = await count()
  check(`${d} properties: "השכרה" across the country shows the 3 rentals`, c.n === 3, JSON.stringify(c))
  await page.evaluate(() => document.querySelector('[data-deal="all"]').click())
  await page.select('[data-filter="rooms"]', '5')
  await page.select('[data-filter="price"]', '2000000')
  await wait(1400)
  c = await count()
  check(`${d} properties: 5 rooms and up, up to 2 million: Beer Sheva only`, c.n === 1 && (await page.evaluate(() => document.querySelector('.ci .fb-city').textContent.trim())) === 'באר שבע', JSON.stringify(c))
  await shot('2-properties-filter', '.flt')
  await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'load' })
  await wait(1200)
  c = await count()
  check(`${d} buyers: the filter shows 15`, c.n === 15, JSON.stringify(c))
  await page.evaluate(() => document.querySelector('[data-deal="rent"]').click())
  await wait(1200)
  c = await count()
  check(`${d} buyers: 2 looking to rent, with "לחודש" on the budget`, c.n === 2 && (await text()).includes('לחודש'), JSON.stringify(c))
  await shot('3-buyers-filter', '.flt')

  // ---------------------------------------------------------------- 4. a property's own page
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(1200)
  await page.evaluate(() => document.querySelector('[data-open-property="p1"]').click())
  await page.waitForSelector('[data-property="p1"]', { timeout: 10000 })
  await wait(700)
  const pp = await page.evaluate(() => ({
    title: document.querySelector('.pp h1')?.textContent,
    facts: Object.fromEntries([...document.querySelectorAll('[data-fact]')].map((f) => [f.dataset.fact, f.querySelector('dd').textContent])),
    thumbs: document.querySelectorAll('.pp-thumbs button').length,
    broker: document.querySelector('.pp-broker strong')?.textContent,
    acts: [...document.querySelectorAll('.pp-actions [data-act]')].map((b) => b.textContent.trim()),
    price: document.querySelector('.pp-price strong')?.textContent,
  }))
  check(`${d} a property's page: title, price, the 6 details, 4 photos, its broker, "יש לי קונה לנכס" and the chat (17.11.2026)`, pp.title?.includes('נווה שאנן') && pp.price?.includes('1,690,000') && pp.facts['חדרים'] === '4' && pp.facts['שטח'] === '98 מ"ר' && pp.facts['קומה'] === '3 מתוך 6' && pp.facts['חניה'] === 'חניה אחת' && pp.facts['מעלית'] === 'יש' && pp.facts['עסקה'] === 'מכירה' && pp.thumbs === 4 && pp.broker?.includes('עומר נחום') && pp.acts.join('|') === "יש לי קונה לנכס|התחלת צ'אט", JSON.stringify(pp))
  await shot('4-property')
  const before = await page.evaluate(() => document.querySelector('[data-photo]')?.getAttribute('src'))
  await page.evaluate(() => document.querySelector('[data-act="next-photo"]').click())
  await wait(600)
  const after = await page.evaluate(() => document.querySelector('[data-photo]')?.getAttribute('src'))
  check(`${d} the gallery moves to the next photo`, !!after && after !== before, `${before} -> ${after}`)
  await page.evaluate(() => document.querySelector('[data-act="buyer"]').click())
  await wait(500)
  await page.keyboard.press('Escape')
  await wait(400)
  const sent = await page.evaluate(() => [...document.querySelectorAll('.pp-actions [data-act="buyer"]')].map((b) => b.getAttribute('aria-pressed') + ':' + b.textContent.trim()))
  check(`${d} "יש לי קונה לנכס" answers`, sent[0]?.startsWith('true'), sent.join(' | '))
  await page.goto(green + '/app/property/p9', { waitUntil: 'load' })
  await wait(900)
  const rent = await page.evaluate(() => ({ price: document.querySelector('.pp-price strong')?.textContent, deal: document.querySelector('.pp-deal')?.textContent, lift: document.querySelector('[data-fact="מעלית"] dd')?.textContent, park: document.querySelector('[data-fact="חניה"] dd')?.textContent }))
  check(`${d} a rental's page says "לחודש" and "להשכרה"`, rent.price?.includes('לחודש') && rent.deal === 'להשכרה' && rent.lift === 'אין' && rent.park === 'אין', JSON.stringify(rent))

  // ---------------------------------------------------------------- 5. the broker index opens, also on a quick double click
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1300)
  await page.evaluate(() => window.scrollTo(0, 2500))
  await wait(300)
  await page.evaluate(() => {
    const a = document.querySelector('.side-nav a[href$="/app/brokers"]') ?? document.querySelector('.bottom-nav a[href$="/app/brokers"]')
    a.click()
    setTimeout(() => a.click(), 90)
  })
  await wait(1500)
  const idx = await page.evaluate(() => ({ path: location.pathname, cards: document.querySelectorAll('.broker-card').length, feed: !!document.querySelector('.fbx-page'), h1: document.querySelector('#main h1')?.textContent }))
  check(`${d} "אינדקס מתווכים" opens every time (a quick double click too): 25 brokers, and not the feed`, idx.path.endsWith('/app/brokers') && idx.cards === 25 && !idx.feed, JSON.stringify(idx))
  const ini = await page.evaluate(() => [...document.querySelectorAll('.broker-face.is-initials b')].length)
  check(`${d} brokers without a photo show their initials, no broken image`, ini === 15 && (await page.evaluate(() => [...document.querySelectorAll('.broker-card img')].every((i) => i.complete && i.naturalWidth > 0))), String(ini))
  await shot('5-brokers')

  // ---------------------------------------------------------------- 6. the foot's line opens the office member's view, and back
  await page.evaluate(() => document.querySelector('[data-foot] [data-v="office"]').click())
  await wait(900)
  const office = await page.evaluate(() => ({ quota: !!document.querySelector('.mb-chip.is-quota'), sw: !!document.querySelector('.ms') }))
  check(`${d} the line at the foot switches to the office member's view (the switch and the quota are back there)`, office.quota && office.sw, JSON.stringify(office))
  await page.evaluate(() => document.querySelector('[data-foot] [data-v="community"]').click())
  await wait(700)
  check(`${d} ... and back to the community`, await page.evaluate(() => !document.querySelector('.mb-chip') && !document.querySelector('.ms')))

  check(`${d} nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await ctx.close()
}

const fails = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
