// With screens split into separate files, every screen must import the stylesheets it uses.
// This lists classes a module uses whose rules live only in stylesheets it does not load.
import fs from 'node:fs'
import path from 'node:path'

const src = 'src'
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const files = walk(src).map((f) => f.replaceAll('\\', '/'))
const cssFiles = files.filter((f) => f.endsWith('.css'))
const tsx = files.filter((f) => f.endsWith('.tsx'))

// class -> stylesheets that define it
const defined = new Map()
for (const f of cssFiles) {
  const text = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of text.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    if (!defined.has(m[1])) defined.set(m[1], new Set())
    defined.get(m[1]).add(path.basename(f))
  }
}

const read = (f) => fs.readFileSync(f, 'utf8')
const resolve = (from, spec) => {
  const base = path.posix.join(path.posix.dirname(from), spec)
  return [base, base + '.tsx', base + '.ts'].find((c) => fs.existsSync(c) && fs.statSync(c).isFile())
}
/** stylesheets reachable from a module through static imports */
function sheets(file, seen = new Set()) {
  if (seen.has(file)) return new Set()
  seen.add(file)
  const out = new Set()
  for (const m of read(file).matchAll(/^import\s+(?:[^'"]*from\s+)?['"](\.[^'"]+)['"]/gm)) {
    if (m[1].endsWith('.css')) out.add(path.basename(m[1]))
    else {
      const r = resolve(file, m[1])
      if (r && r.endsWith('.tsx')) for (const s of sheets(r, seen)) out.add(s)
    }
  }
  return out
}

// always loaded with the first page: main.tsx and what it imports statically
const always = sheets('src/main.tsx')
// screens inside the member area also get the shell's stylesheets
const shell = sheets('src/layout/AppShell.tsx')
const inShell = ['Dashboard', 'Community', 'Brokers', 'Crm', 'Builder', 'FolderPage'].map((n) => `src/pages/${n}.tsx`)

let problems = 0
for (const f of tsx) {
  const own = sheets(f)
  const have = new Set([...always, ...own, ...(inShell.includes(f) ? shell : [])])
  const text = read(f)
  const used = new Set()
  for (const m of text.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
    for (const c of (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) if (/^[a-zA-Z][\w-]*$/.test(c)) used.add(c)
  }
  const missing = [...used].filter((c) => defined.has(c) && ![...defined.get(c)].some((s) => have.has(s)))
  if (missing.length) {
    problems += missing.length
    const bySheet = {}
    for (const c of missing) for (const s of defined.get(c)) (bySheet[s] ??= []).push(c)
    console.log(f.replace('src/', ''), JSON.stringify(bySheet))
  }
}
console.log('always loaded:', [...always].join(', '))
console.log(problems ? `${problems} classes used without their stylesheet` : 'every module loads the stylesheets it uses')
