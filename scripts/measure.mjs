// Layout probe: are kanban cards and their contents inside their columns?
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: Number(process.argv[2] ?? 1440), height: 900 })
await page.goto((process.env.BASE ?? 'http://localhost:5230/brokers-community-demo') + '/app/crm', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1500))
const rows = await page.evaluate(() =>
  [...document.querySelectorAll('.kan-col')].map((col) => {
    const c = col.getBoundingClientRect()
    const card = col.querySelector('.kan-card')
    const k = card.getBoundingClientRect()
    const worst = [...card.querySelectorAll('*')].reduce(
      (acc, el) => {
        const r = el.getBoundingClientRect()
        if (r.width && r.left < acc.left) return { left: r.left, cls: el.className || el.tagName }
        return acc
      },
      { left: k.left, cls: 'card' },
    )
    return { col: Math.round(c.width), card: Math.round(k.width), cardInsideCol: k.left >= c.left && k.right <= c.right, overflowPx: Math.round(k.left - worst.left), by: String(worst.cls).slice(0, 40) }
  }),
)
console.table(rows)
await browser.close().catch(() => {})
