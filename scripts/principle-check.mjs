// Phone layout of the "our principle" block: label above the number, number inside the screen.
import puppeteer from 'puppeteer-core'
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
for (const [name, vp] of [['m375', { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true }], ['m320', { width: 320, height: 700, deviceScaleFactor: 2, isMobile: true }], ['d1440', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(base + '/', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1200))
  await page.evaluate(() => document.querySelector('#principle').scrollIntoView())
  await new Promise((r) => setTimeout(r, 2600))
  const info = await page.evaluate(() => {
    const vis = [...document.querySelectorAll('.principle .eyebrow')].find((e) => e.offsetParent !== null)
    const num = document.querySelector('.principle-num > span').getBoundingClientRect()
    const lab = vis.getBoundingClientRect()
    const h2 = document.querySelector('.principle-copy h2').getBoundingClientRect()
    return { labelAboveNumber: lab.bottom <= num.top + 1, labelAboveTitle: lab.bottom <= h2.top + 1, labelPx: getComputedStyle(vis).fontSize, numLeft: Math.round(num.left), numRight: Math.round(num.right), screen: innerWidth, visibleLabels: [...document.querySelectorAll('.principle .eyebrow')].filter((e) => e.offsetParent !== null).length }
  })
  console.log(name, JSON.stringify(info))
  await page.screenshot({ path: `_shots/principle-${name}.png` })
  await page.close()
}
await browser.close().catch(() => {})
