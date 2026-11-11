// End-to-end check of the community topics demo:
// CRM -> topic with preview, match alerts in both directions, auto publish, city filter, onboarding.
// Usage: node scripts/topics-flow.mjs [outDir] [mobile]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
const mobile = process.argv.includes('mobile')
fs.mkdirSync(out, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
const sfx = mobile ? '-m' : ''
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${out}/t-${n}${sfx}.png` })
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const clickText = async (sel, text, within) => {
  const ok = await page.evaluate(
    (sel, text, within) => {
      const scope = within ? [...document.querySelectorAll(within.sel)].find((e) => e.textContent.includes(within.text)) : document
      if (!scope) return false
      const el = [...scope.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && e.offsetParent !== null)
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    },
    sel,
    text,
    within,
  )
  if (!ok) throw new Error(`not found: ${sel} "${text}"`)
}
const text = (sel) => page.evaluate((sel) => document.querySelector(sel)?.textContent ?? '', sel)
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)

// ---------------------------------------------------------------- reset
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
// MEMBER=office (green version): the visitor is an office member, and a match says it reached them first
if (process.env.MEMBER === 'office') await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(1500)
if (mobile) await clickText('.stage-tabs .chip', 'חדש')
await shot('01-crm')

// --------------------------------------- 1. property -> coop, with preview
await clickText('button', 'פרסם בקהילה', { sel: '.kan-card', text: 'דירת 4 חדרים חדשה' })
await wait(900)
await shot('02-publish-property')
const options = await page.evaluate(() => [...document.querySelectorAll('.topic-opt strong')].map((e) => e.textContent))
check('property offers the right topics', options.join('|') === 'נכסים לשיתוף פעולה|הפניות בין מתווכים', options.join('|'))
check('preview shows the property', (await text('.publish-preview')).includes('דירת 4 חדרים חדשה'))
check('preview hides the client name', !(await text('.publish-preview')).includes('אורי ב.'))
await clickText('.modal button', 'אישור ופרסום')
await wait(2600)
await shot('03-published-with-match')
check('match found after publishing a property', (await text('.match-inline')).includes('נמצאה התאמה'), await text('.match-inline strong'))
await clickText('.match-inline button', 'לצפייה')
await wait(1900)
await shot('04-seeking-with-match-banner')
check('lands on the seeking topic', (await page.evaluate(() => location.search)).includes('topic=seeking'))
check('saved search shows the match banner', (await text('.ci.is-match .ci-match')).includes('מתאים לבקשה'))
const coopCount = await page.evaluate(() => document.querySelector('.rail-btn:nth-child(2) .rail-count')?.textContent)
check('coop topic count went up to 3', coopCount === '3', coopCount)

// ------------------------- 2. client -> saved search, simulated incoming match
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await wait(1200)
if (mobile) await clickText('.stage-tabs .chip', 'חדש')
check('CRM card is tagged as published', (await text('.kan-published')).includes('פורסם בקהילה'))
await clickText('button', 'פרסם בקהילה', { sel: '.kan-card', text: 'זוג צעיר מחפש 3 חדרים' })
await wait(900)
await shot('05-publish-client')
const clientOptions = await page.evaluate(() => [...document.querySelectorAll('.topic-opt strong')].map((e) => e.textContent))
check('client offers the right topics', clientOptions.join('|') === 'הפניות בין מתווכים|מחפש לקונה', clientOptions.join('|'))
const preview = await text('.publish-preview')
check('client name never appears in the preview', !preview.includes('רון ומיכל'))
check('search parameters are shown', preview.includes('חניה בטאבו') && preview.includes('מעלית חובה'))
// remove one parameter and confirm the preview follows
await clickText('.publish-fields .chip', 'פינוי מיידי')
await wait(300)
check('editing parameters updates the preview', !(await text('.publish-preview')).includes('פינוי מיידי'))
await clickText('.publish-fields .chip', 'פינוי מיידי')
await clickText('.modal button', 'אישור ופרסום')
await wait(2600)
await shot('06-search-saved')
await clickText('.modal button', 'חזרה ל-CRM')
await wait(6500)
await shot('07-incoming-match-alert')
check('incoming match alert pops up', (await text('.match-alert')).includes('זה יכול להתאים לך'), (await text('.match-alert p')).slice(0, 60))
if (process.env.MEMBER === 'office') check('office member: the match says it reached them first', (await text('.match-first')).includes('ההתאמה הגיעה אליך ראשונה'))
if (process.env.MEMBER === 'community') check('community member: no such line', (await text('.match-first')) === '')
await clickText('.match-alert button', 'לצפייה בהתאמה')
await wait(2000)
await shot('08-coop-with-incoming')
check('incoming listing is in the coop topic with a banner', (await text('.ci.is-match')).includes('דירת 3 חדרים משופצת'))

// --------------------------------------------------------- 3. referral
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await wait(1200)
if (mobile) await clickText('.stage-tabs .chip', 'בטיפול')
await clickText('button', 'פרסם בקהילה', { sel: '.kan-card', text: 'משקיע מחפש דירה להשכרה' })
await wait(800)
await clickText('.topic-opt', 'הפניות בין מתווכים')
await wait(400)
await clickText('.publish-fields .chip', 'חיפה')
await wait(400)
await shot('09-publish-referral')
check('referral preview shows the target city and terms', (await text('.publish-preview')).includes('חיפה') && (await text('.publish-preview')).includes('25%'))
await clickText('.modal button', 'אישור ופרסום')
await wait(2500)
await clickText('.modal button', 'מעבר לנושא בקהילה')
await wait(1800)
await shot('10-referrals-topic')
check('referral appears first in its topic', (await text('.ci-list .ci')).includes('חיפה'))

// ------------------------------------------------------ 4. auto publish
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await wait(1200)
await clickText('.auto-bar', 'פרסם אוטומטית')
await wait(400)
if (mobile) await clickText('.stage-tabs .chip', 'סיור')
await clickText('.coop-pill', 'שת', { sel: '.kan-card', text: 'וילה עם בריכה' })
await wait(2200)
await shot('11-auto-publish')
check('auto publish skips the modal', !(await page.evaluate(() => !!document.querySelector('.modal'))))
check('auto publish raises a match alert', (await text('.match-alert')).includes('נמצאה התאמה'))
check('villa is marked as published', await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((c) => c.textContent.includes('וילה עם בריכה')).textContent.includes('פורסם בקהילה')))

// -------------------------------------------------------- 5. city filter
await page.goto(base + '/app/community', { waitUntil: 'networkidle0' })
await wait(1400)
const all = await page.evaluate(() => document.querySelectorAll('.ci-list .ci').length)
await clickText('.page-head-actions button', 'כל הערים')
await wait(600)
await clickText('.city-opt', 'ירושלים')
await clickText('.city-opt', 'נתניה')
await wait(300)
await shot('12-cities')
await clickText('.modal-foot button', 'הצגת 2 ערים')
await wait(1200)
const filtered = await page.evaluate(() => document.querySelectorAll('.ci-list .ci').length)
await shot('13-filtered')
check('city filter narrows the feed', filtered > 0 && filtered < all, `${all} -> ${filtered}`)
await clickText('.page-head-actions button', 'התראות')
await wait(700)
await shot('14-notifications')
check('notifications list includes the matches', (await text('.notice-list-lg')).includes('נמצאה התאמה'))
check('no horizontal overflow in the community', (await overflow()) === 0)

// SKIP_JOIN=1 stops here: the publish flow and the match alerts only (the green onboarding has its own check, join-check.mjs)
if (process.env.SKIP_JOIN) {
  for (const r of results) console.log(r)
  console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed (publish flow only)`)
  await browser.close().catch(() => {})
  process.exit(0)
}

// --------------------------------------------------------- 6. onboarding
// the green version's /join is a choice of two ways; its onboarding is at /join/community (JOIN=/join/community)
await page.goto(base + (process.env.JOIN ?? '/join'), { waitUntil: 'networkidle0' })
await wait(1200)
await page.evaluate(() => {
  const input = document.querySelector('input[type="email"]')
  if (!input) return
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(input, 'not-an-email')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
await clickText('.join-actions button', 'המשך')
await wait(500)
await shot('15-join-validation')
check('required email is validated', (await text('#err-email')).includes('אימייל'))
await page.evaluate(() => {
  const input = document.querySelector('input[type="email"]')
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(input, 'maya@example.com')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
await clickText('.join-actions button', 'המשך')
await wait(900)
await shot('16-join-why')
check('step 2 explains the community', (await text('.why-grid')).includes('לא נבלעת'))
await clickText('.join-actions button', 'המשך')
await wait(800)
await clickText('.city-opt', 'תל אביב')
await shot('17-join-cities')
await clickText('.join-actions button', 'המשך עם')
await wait(800)
await shot('18-join-first-property')
await clickText('.join-actions button', 'העלאת הנכס')
await wait(1000)
await shot('19-join-page-ready')
check('personal page step is reached', (await text('.join-card h1')).includes('כבר מוכן'))
await clickText('.join-actions button', 'כניסה לקהילה')
await wait(1500)
check('onboarding ends in the dashboard', (await page.evaluate(() => location.pathname)).endsWith('/app'))
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await wait(1000)
check('first property was added to the CRM', (await text('.kanban')).includes('דירת 3 חדרים עם מרפסת'))
check('no horizontal overflow in the CRM', (await overflow()) === 0)

console.log(results.join('\n'))
console.log(errors.length ? 'CONSOLE ERRORS: ' + errors.join(' | ') : 'no console errors')
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`)
await browser.close()
