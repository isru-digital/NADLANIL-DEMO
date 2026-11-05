// Checks the social feed interactions: reactions, comments, composer, stories, search.
// Usage: node scripts/feed-flow.mjs [outDir] [mobile]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
const mobile = process.argv.includes('mobile')
fs.mkdirSync(out, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const base = process.env.BASE ?? 'http://localhost:5230/brokers-community-demo'
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
const sfx = mobile ? '-m' : ''
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${out}/f-${n}${sfx}.png` })
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const text = (sel) => page.evaluate((sel) => document.querySelector(sel)?.textContent ?? '', sel)
const clickText = async (sel, t) => {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(t) && e.offsetParent !== null)
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    },
    sel,
    t,
  )
  if (!ok) throw new Error(`not found: ${sel} "${t}"`)
}

await page.goto(base + '/app/community', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await wait(1600)
await shot('01-feed')

const layout = await page.evaluate(() => ({
  start: !!document.querySelector('.fbx-start .me-card')?.offsetParent,
  end: !!document.querySelector('.fbx-end')?.offsetParent,
  feed: Math.round(document.querySelector('.comm-feed').getBoundingClientRect().width),
  stories: document.querySelectorAll('.story').length,
  posts: document.querySelectorAll('.ci-list .ci').length,
}))
check(mobile ? 'phone shows a single column feed' : 'desktop shows three columns', mobile ? !layout.start && !layout.end : layout.start && layout.end, JSON.stringify(layout))
check('stories row and posts are rendered', layout.stories >= 4 && layout.posts === 16)

// ---------------------------------------------------------- reactions
const first = '.ci-list .ci'
const before = await text(`${first} .fb-reacts .num`)
if (mobile) {
  await page.evaluate((sel) => document.querySelector(`${sel} .fb-action.like`).click(), first)
} else {
  await page.hover(`${first} .fb-action.like`)
  await wait(900)
  await shot('02-reaction-picker')
  check('reaction picker opens on hover', (await page.evaluate(() => document.querySelectorAll('.fb-picker button').length)) === 5)
  await page.evaluate(() => [...document.querySelectorAll('.fb-picker button')].find((b) => b.getAttribute('aria-label') === 'כל הכבוד').click())
}
await wait(700)
const after = await text(`${first} .fb-reacts .num`)
const label = await text(`${first} .fb-action.like`)
check('reaction is counted', Number(after) === Number(before) + 1, `${before} -> ${after}`)
check('my reaction shows on the button', label.includes(mobile ? 'אהבתי' : 'כל הכבוד'), label.trim())
await shot('03-reacted')

// ----------------------------------------------------------- comments
await page.evaluate(() => [...document.querySelectorAll('.ci-list .ci')][1].querySelector('.fb-counts').click())
await wait(700)
const sel2 = '.ci-list > div:nth-child(2)'
check('thread shows nested replies', (await page.evaluate((s) => document.querySelectorAll(`${s} .thread-replies .fb-comment`).length, sel2)) >= 1)
await page.type(`${sel2} .fb-reply-box input`, 'תודה על השיתוף, מנסה את זה השבוע.')
await page.keyboard.press('Enter')
await wait(600)
check('my comment is added', (await text(`${sel2} .fb-comments`)).includes('מנסה את זה השבוע'))
await shot('04-comments')

// ----------------------------------------------------------- composer
await page.evaluate(() => window.scrollTo(0, 0))
await clickText('.composer-fake', 'מה חדש אצלך')
await wait(700)
await page.type('#composer-text', 'סגרנו היום בלעדיות על דירת גן ברמת השרון. תודה לכל מי שעזר בעצות.')
await page.evaluate(() => document.querySelector('.composer-add button').click())
await wait(500)
await page.evaluate(() => document.querySelector('.composer-photos button').click())
await wait(300)
await shot('05-composer')
await clickText('.composer-modal .btn', 'פרסום')
await wait(1500)
check('new post appears first, with its photo', (await text(first)).includes('בלעדיות על דירת גן') && (await page.evaluate((s) => !!document.querySelector(`${s} .fb-media img`), first)))
check('new post is highlighted', await page.evaluate((s) => document.querySelector(s).classList.contains('is-fresh'), first))
await shot('06-posted')

// ------------------------------------------------------------ stories
await page.evaluate(() => window.scrollTo(0, 0))
await page.evaluate(() => document.querySelectorAll('.story')[1].click())
await wait(900)
await shot('07-story')
check('story viewer opens', !!(await page.$('.story-view')))
const s1 = await text('.story-view header strong')
await page.evaluate(() => document.querySelector('.story-tap-next').click())
await wait(700)
const s2 = await text('.story-view header strong')
check('tapping moves to the next story', !!s2 && (s1 !== s2 || (await page.evaluate(() => document.querySelectorAll('.story-bars .is-done').length)) >= 1), `${s1} -> ${s2}`)
await clickText('.story-view .btn', 'לפוסט המלא')
await wait(1500)
check('story links to its post', !(await page.$('.story-view')) && (await page.evaluate(() => location.search)).includes('item='))

// ------------------------------------------------------------- search
await page.goto(base + '/app/community', { waitUntil: 'networkidle0' })
await wait(1200)
await page.type('.fbx-search input', 'נתניה')
await wait(700)
const found = await page.evaluate(() => document.querySelectorAll('.ci-list .ci').length)
check('search filters the feed', found > 0 && found < 17, String(found))
await shot('08-search')
check('no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0)

console.log(results.join('\n'))
console.log(errors.length ? 'CONSOLE ERRORS: ' + errors.join(' | ') : 'no console errors')
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`)
await browser.close().catch(() => {})
