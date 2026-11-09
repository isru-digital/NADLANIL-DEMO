// Checks that the "about me" text on an agent's page is in the first person and in the right Hebrew gender, for both
// choices and all four working styles, and that it never slips into the third person ("שלה", "שלו", the name as the subject).
// Usage: node scripts/about-check.mjs     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const expected = {
  'm:warm': ['הגישה שלי אישית וחמה'],
  'f:warm': ['הגישה שלי אישית וחמה'],
  'm:sharp': ['הגישה שלי מקצועית וחדה'],
  'f:sharp': ['הגישה שלי מקצועית וחדה'],
  'm:discreet': ['אני עובד בדיסקרטיות'],
  'f:discreet': ['אני עובדת בדיסקרטיות'],
  'm:fast': ['אני זמין ומהיר:'],
  'f:fast': ['אני זמינה ומהירה:'],
}

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(green + '/', { waitUntil: 'load' })

for (const [key, must] of Object.entries(expected)) {
  const [gender, style] = key.split(':')
  const name = gender === 'f' ? 'דנה כהן' : 'דן כהן'
  await page.evaluate(
    (g, st, n) => {
      localStorage.setItem(
        'nadlanup-agent-v1',
        JSON.stringify({
          stage: 'ready',
          step: 0,
          paidAt: '2026-11-09T10:00:00.000Z',
          profile: { name: n, gender: g, style: st, years: 7, areas: ['tlv', 'sharon'], specialties: ['יוקרה', 'השקעות'], clients: ['משפחות', 'משקיעים'], languages: ['עברית'], phone: '050-1234567', offHours: 'ריצה בבוקר' },
        }),
      )
    },
    gender,
    style,
    name,
  )
  await page.goto(`${green}/agent/${encodeURIComponent(name.replace(' ', '-'))}`, { waitUntil: 'load' })
  await wait(1500)
  const text = await page.evaluate(() => [...document.querySelectorAll('.agp-about-text > p')].map((p) => p.textContent.trim()))
  const all = text.join(' | ')
  const first = text[0] ?? ''
  check(`${key}: starts in the first person`, first === 'אני מלווה לקוחות בתל אביב והמרכז ובשרון ונתניה כבר 7 שנים.', first)
  check(`${key}: the working style line is right`, must.every((m) => all.includes(m)), all.slice(0, 160))
  check(`${key}: "מתמחה" and "עובד/ת עם" are in the first person`, all.includes('אני מתמחה ביוקרה ובהשקעות,') && all.includes(`ו${gender === 'f' ? 'עובדת' : 'עובד'} עם משפחות ומשקיעים`), all)
  check(`${key}: nothing is in the third person`, !/שלה|שלו|\bהוא\b|\bהיא\b|דנה מלווה|דן מלווה/.test(all), all)
}

// the sample page
await page.evaluate(() => localStorage.removeItem('nadlanup-agent-v1'))
await page.goto(green + '/agent/demo', { waitUntil: 'load' })
await wait(1500)
const sample = await page.evaluate(() => [...document.querySelectorAll('.agp-about-text > p')].map((p) => p.textContent.trim()).join(' | '))
check('sample page: first person, "הגישה שלי", no "שלה"', sample.startsWith('אני מלווה לקוחות בתל אביב והמרכז, בשרון ונתניה ובירושלים והסביבה כבר 11 שנים.') && sample.includes('הגישה שלי אישית וחמה') && sample.includes('אני מתמחה ביוקרה, בדירות מגורים ובתושבי חוץ') && !/(?<![א-ת])(שלה|שלו|הוא|היא)(?![א-ת])|מאיה מלווה/.test(sample), sample.slice(0, 120))
const heading = await page.evaluate(() => document.querySelector('.agp-about-text h2')?.textContent)
check('sample page: the heading is first person too', heading === 'היי, אני מאיה', heading)

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
