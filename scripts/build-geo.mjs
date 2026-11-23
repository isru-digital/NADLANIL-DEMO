// Builds the lists of streets and neighbourhoods, and the neighbourhood maps, for the cities of the platform
// (Itzik 22.11.2026: no free text for a street or a neighbourhood). Run it by hand when the lists should be refreshed:
//   node scripts/build-geo.mjs
// It writes public/geo/<city code>.json (one small file per city, loaded when that city is picked) and
// src/config/geo-index.json (which cities have a map).
//
// Sources, both open, neither of them Yad2:
//  - streets, and the names of neighbourhoods the state lists: "רשימת רחובות ישראל", רשות האוכלוסין וההגירה, on
//    data.gov.il (published "לשימוש חופשי של הציבור"). Codes under 6500 are streets and squares; 6500 to 8999 are
//    neighbourhoods and quarters ("ש אפקה" is שכונת אפקה); 9000 is the town itself.
//  - neighbourhood boundaries and names: OpenStreetMap, through the Overpass API. © OpenStreetMap contributors, under
//    the Open Database License (ODbL): the map in the app says so wherever it is shown.
// A city gets a map only when OpenStreetMap has real boundaries for enough of it; otherwise its neighbourhoods are
// picked from the list alone. A city marked { map: 'always' } (ראשון לציון, בת ים, חולון, Itzik 23.11.2026) gets its
// map even when OpenStreetMap has only a few boundaries there: the rest of the city is the hatch of the map, and those
// neighbourhoods are picked from the list.
//
// Each map is written twice in the same file: `map.hoods[].d` (an SVG path in the city's own 1000-wide frame, for the
// flat map) and `map.geo` (the same shapes in longitude and latitude, for the 3D map on MapLibre).
//
// AN OFFICIAL LAYER, later: a city's own neighbourhood layer (from the city, under its own licence) goes into
// geo-official/<city code>.geojson, a FeatureCollection of Polygons or MultiPolygons with `properties.name` (and,
// once, `credit` at the top of the collection). This script turns it into public/geo/official/<code>.json, a file of
// its own, never mixed into the OpenStreetMap file, and marks the city `official: true` in the index. The app then
// shows that layer instead of the OpenStreetMap one, with its credit. Nothing like that exists yet.
//
//   node scripts/build-geo.mjs                     builds the cities not built yet, then tidies all of them
//   node scripts/build-geo.mjs --city=חולון        builds that city again (the flag may be given more than once)
//   node scripts/build-geo.mjs --fresh             builds every city again
import fs from 'node:fs'
import path from 'node:path'

/** the platform's cities: the name in the app, the name in the state's list, the OpenStreetMap boundary (relation) */
const CITIES = [
  ['תל אביב', 'תל אביב - יפו', 1382494],
  ['רמת גן', 'רמת גן', 1382493],
  ['גבעתיים', 'גבעתיים', 1382923],
  ['הרצליה', 'הרצליה', 1382820],
  ['רמת השרון', 'רמת השרון', 1382821],
  ['רעננה', 'רעננה', 1383630],
  ['נתניה', 'נתניה', 1383391],
  ['ירושלים', 'ירושלים', 1381350],
  ['מודיעין', 'מודיעין-מכבים-רעות', 1381425],
  ['חיפה', 'חיפה', 1387888],
  ['ראשון לציון', 'ראשון לציון', 1382177, { map: 'always' }],
  ['באר שבע', 'באר שבע', 1377264],
  ['פתח תקווה', 'פתח תקווה', 1382816],
  ['אשדוד', 'אשדוד', 1380013],
  ['חדרה', 'חדרה', 1392860],
  ['עפולה', 'עפולה', 1380226],
  ['חולון', 'חולון', 1382460, { map: 'always' }],
  ['כפר סבא', 'כפר סבא', 1383631],
  ['נהריה', 'נהריה', 1932164],
  ['בת ים', 'בת ים', 1382458, { map: 'always' }],
  ['אשקלון', 'אשקלון', 1376782],
  ['הוד השרון', 'הוד השרון', 1383629],
  ['רחובות', 'רחובות', 1246791],
  ['נס ציונה', 'נס ציונה', 1246731],
  ['קריית אונו', 'קרית אונו', 1382894],
  ['בני ברק', 'בני ברק', 1382817],
  ['ראש העין', 'ראש העין', 1401781],
  ['גבעת שמואל', 'גבעת שמואל', 1382837],
  ['יבנה', 'יבנה', 1380415],
  ['טבריה', 'טבריה', 1387273],
  ['אילת', 'אילת', 1377284],
]
const OUT = path.resolve('public/geo')
const OFFICIAL_IN = path.resolve('geo-official')
const OFFICIAL_OUT = path.join(OUT, 'official')
const INDEX = path.resolve('src/config/geo-index.json')
const always = (app) => CITIES.find((c) => c[0] === app)?.[3]?.map === 'always'
/** the city files of public/geo (not the folder of official layers) */
const cityFiles = () => fs.readdirSync(OUT).filter((n) => n.endsWith('.json')).map((n) => path.join(OUT, n))
const UA = 'nadlanup-geo-build/1.0'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

/* ---------------------------------------------------------------- names */
const clean = (s) => s.replace(/\s+/g, ' ').replace(/״/g, '"').replace(/׳/g, "'").trim()
/** the key two spellings of one place share: "שכונת נווה צדק", "ש נוה צדק" and "נווה-צדק" are one */
export const nameKey = (s) =>
  clean(s)
    .replace(/^(שכונת|שכונה|שכ'|שכ|ש'|ש)\s+/, '')
    .replace(/^(שדרות|שדרת|שד')\s*/, 'שד ')
    .replace(/^(סמטת|סמטה|סמ')\s*/, 'סמ ')
    .replace(/^כיכר\s+/, 'ככר ')
    .replace(/["'`\-–־,.()]/g, ' ')
    .replace(/וו/g, 'ו')
    .replace(/יי/g, 'י')
    .replace(/\s+/g, ' ')
    .trim()
/** how a neighbourhood is shown: without "שכונת" / "ש" in front */
const hoodName = (s) => clean(s).replace(/^(שכונת|שכ'|ש)\s+/, '')

/* ---------------------------------------------------------------- the state's street list */
async function streets() {
  const r = await fetch('https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&limit=100000', { headers: { 'user-agent': UA } })
  const j = await r.json()
  return j.result.records
}

/* ---------------------------------------------------------------- OpenStreetMap */
const HOSTS = ['https://overpass-api.de', 'https://lz4.overpass-api.de', 'https://z.overpass-api.de']
async function overpass(q) {
  for (let round = 0; round < 4; round++)
    for (const h of HOSTS) {
      try {
        const r = await fetch(h + '/api/interpreter', { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(150000) })
        const t = await r.text()
        if (r.status === 200 && t.startsWith('{')) return JSON.parse(t)
      } catch {
        /* the next one */
      }
      await wait(4000)
    }
  throw new Error('Overpass did not answer')
}

/** the outer rings of a way or a relation, as closed lists of [lon, lat] */
function rings(el) {
  if (el.type === 'way') return el.geometry?.length > 3 ? [el.geometry.map((p) => [p.lon, p.lat])] : []
  if (el.type !== 'relation') return []
  const parts = (el.members ?? []).filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry?.length > 1).map((m) => m.geometry.map((p) => [p.lon, p.lat]))
  const out = []
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7
  while (parts.length) {
    let ring = parts.shift()
    let grew = true
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const end = ring[ring.length - 1]
        if (same(end, p[0])) ring = ring.concat(p.slice(1))
        else if (same(end, p[p.length - 1])) ring = ring.concat(p.slice(0, -1).reverse())
        else continue
        parts.splice(i, 1)
        grew = true
        break
      }
    }
    if (ring.length > 3 && same(ring[0], ring[ring.length - 1])) out.push(ring)
  }
  return out
}
const ringArea = (r) => {
  let a = 0
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
  return Math.abs(a / 2)
}
const centroid = (r) => {
  let x = 0
  let y = 0
  for (const p of r) {
    x += p[0]
    y += p[1]
  }
  return [x / r.length, y / r.length]
}
const inside = (pt, r) => {
  let c = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i]
    const [xj, yj] = r[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
/** Douglas-Peucker, so a neighbourhood is a few dozen points, not thousands */
function simplify(pts, eps) {
  if (pts.length < 4) return pts
  const d = (p, a, b) => {
    const [x, y] = p
    const [x1, y1] = a
    const [x2, y2] = b
    const dx = x2 - x1
    const dy = y2 - y1
    const l = dx * dx + dy * dy || 1e-12
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l))
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
  }
  let far = 0
  let at = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const v = d(pts[i], pts[0], pts[pts.length - 1])
    if (v > far) {
      far = v
      at = i
    }
  }
  if (far <= eps) return [pts[0], pts[pts.length - 1]]
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)]
}

/* ---------------------------------------------------------------- longitude and latitude, for the 3D map */
const r5 = (v) => Math.round(v * 1e5) / 1e5
/** a ring in [lon, lat], a few metres of detail (5 decimals is about a metre) */
function geoRing(r) {
  const k = Math.cos((r[0][1] * Math.PI) / 180)
  const pts = simplify(r.map((p) => [p[0] * k, p[1]]), 0.00002).map(([x, y]) => [r5(x / k), r5(y)])
  if (pts.length && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push(pts[0])
  return pts
}
/** the point where a name sits best: inside the shape and as far from its edges as can be (a coarse search, then a fine one) */
function labelPoint(r) {
  const xs = r.map((p) => p[0])
  const ys = r.map((p) => p[1])
  const k = Math.cos((ys[0] * Math.PI) / 180)
  const edge = (pt) => {
    let m = Infinity
    for (let i = 0; i < r.length - 1; i++) {
      const [x1, y1] = [r[i][0] * k, r[i][1]]
      const [x2, y2] = [r[i + 1][0] * k, r[i + 1][1]]
      const [x, y] = [pt[0] * k, pt[1]]
      const dx = x2 - x1
      const dy = y2 - y1
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1e-12)))
      m = Math.min(m, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)))
    }
    return m
  }
  let best = centroid(r)
  let bestD = inside(best, r) ? edge(best) : -1
  let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  for (let round = 0; round < 3; round++) {
    const n = 14
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const pt = [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * j) / n]
        if (!inside(pt, r)) continue
        const d = edge(pt)
        if (d > bestD) {
          bestD = d
          best = pt
        }
      }
    const wx = (x1 - x0) / 6
    const wy = (y1 - y0) / 6
    ;[x0, x1, y0, y1] = [best[0] - wx, best[0] + wx, best[1] - wy, best[1] + wy]
  }
  return [r5(best[0]), r5(best[1])]
}
const boundsOf = (r) => {
  const xs = r.map((p) => p[0])
  const ys = r.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r5)
}

/** both drawings of a city: the SVG one for the flat map, and the longitude-latitude one for the 3D map */
function drawings(outline, polys, credit) {
  const lat0 = (outline.reduce((s, p) => s + p[1], 0) / outline.length) * (Math.PI / 180)
  const k = Math.cos(lat0)
  const xs = outline.map((p) => p[0] * k)
  const ys = outline.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const s = 1000 / Math.max(maxX - minX, maxY - minY)
  const to = (p) => [Math.round((p[0] * k - minX) * s * 10) / 10, Math.round((maxY - p[1]) * s * 10) / 10]
  const eps = 1.2 / s
  const pathOf = (r) => {
    const pts = simplify(r.map((p) => [p[0] * k, p[1]]), eps).map(([x, y]) => [Math.round((x - minX) * s * 10) / 10, Math.round((maxY - y) * s * 10) / 10])
    return 'M' + pts.map((p) => p.join(' ')).join('L') + 'Z'
  }
  return {
    w: Math.round((maxX - minX) * s),
    h: Math.round((maxY - minY) * s),
    outline: pathOf(outline),
    hoods: polys.map((p) => ({ n: p.n, d: pathOf(p.r), c: to(centroid(p.r)) })),
    credit,
    geo: {
      bounds: boundsOf(outline),
      outline: geoRing(outline),
      hoods: polys.map((p) => ({ n: p.n, r: geoRing(p.r), l: labelPoint(p.r) })),
    },
  }
}

async function cityMap(rel) {
  const area = 3600000000 + rel
  const q = `[out:json][timeout:120];
rel(${rel});out geom;
area(${area})->.a;
(
  nwr["place"~"^(neighbourhood|suburb|quarter)$"](area.a);
  rel["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.a);
);
out tags geom;`
  const j = await overpass(q)
  const city = j.elements.find((e) => e.type === 'relation' && e.id === rel)
  const outline = city ? rings(city) : []
  const polys = []
  const names = []
  for (const e of j.elements) {
    if (e === city) continue
    const raw = e.tags?.['name:he'] || e.tags?.name
    if (!raw || !/[֐-׿]/.test(raw)) continue
    const n = hoodName(raw)
    if (e.type === 'node') {
      names.push(n)
      continue
    }
    const rs = rings(e)
    if (!rs.length) {
      names.push(n)
      continue
    }
    const r = rs.sort((a, b) => ringArea(b) - ringArea(a))[0]
    // a boundary that is in fact the whole city, or a part of it far too big to be a neighbourhood, is not one
    polys.push({ n, r, a: ringArea(r) })
  }
  return { outline: outline.sort((a, b) => ringArea(b) - ringArea(a))[0] ?? null, polys, names }
}

/* ---------------------------------------------------------------- the build */
const all = await streets()
console.log('streets from data.gov.il:', all.length)
const FRESH = process.argv.includes('--fresh')
const AGAIN = process.argv.filter((a) => a.startsWith('--city=')).map((a) => a.slice(7).trim())
async function buildCity([app, gov, rel]) {
  const rows = all.filter((r) => clean(r['שם_ישוב']) === gov)
  const code = rows[0]?.['סמל_ישוב'] ?? rel
  const streetNames = [...new Set(rows.filter((r) => r['סמל_רחוב'] < 6500).map((r) => clean(r['שם_רחוב'])))].sort((a, b) => a.localeCompare(b, 'he'))
  const govHoods = rows.filter((r) => r['סמל_רחוב'] >= 6500 && r['סמל_רחוב'] < 9000).map((r) => hoodName(r['שם_רחוב']))
  let map = { outline: null, polys: [], names: [] }
  try {
    map = await cityMap(rel)
  } catch (e) {
    console.log(app, 'no OpenStreetMap answer', e.message)
  }

  // the finest level wins: a big part that holds the centres of two smaller ones is a district, not a neighbourhood
  let polys = map.polys.sort((a, b) => a.a - b.a)
  const cityArea = map.outline ? ringArea(map.outline) : 0
  polys = polys.filter((p, i) => {
    if (cityArea && p.a > cityArea * 0.6) return false
    const holds = polys.slice(0, i).filter((s) => s.a < p.a / 2 && inside(centroid(s.r), p.r)).length
    return holds < 2
  })
  // one polygon per name
  const seen = new Set()
  polys = polys.filter((p) => !seen.has(nameKey(p.n)) && seen.add(nameKey(p.n)))
  const covered = cityArea ? polys.reduce((s, p) => s + p.a, 0) / cityArea : 0
  // inside the city: a boundary whose middle lies outside it belongs to a neighbour (the tidy step below drops those
  // from the drawing; a city drawn with only a few boundaries needs at least one of its own)
  const own = map.outline ? polys.filter((p) => inside(centroid(p.r), map.outline)).length : 0
  const hasMap = !!map.outline && (always(app) ? own >= 0 : polys.length >= 4 && covered >= 0.3)

  // the list: the map's names first, then OpenStreetMap's points, then the state's list; one entry per name
  const hoods = []
  const keys = new Map()
  const add = (n, src) => {
    const k = nameKey(n)
    if (!k || keys.has(k)) return
    keys.set(k, hoods.length)
    hoods.push({ n, src })
  }
  if (hasMap) polys.forEach((p) => add(p.n, 'osm'))
  map.names.forEach((n) => add(n, 'osm'))
  if (!hasMap) polys.forEach((p) => add(p.n, 'osm'))
  govHoods.forEach((n) => add(n, 'gov'))
  hoods.sort((a, b) => a.n.localeCompare(b.n, 'he'))

  // the drawing: the city's own frame, 1000 wide, north up, the right proportions for its latitude; and the same in
  // longitude and latitude for the 3D map
  const file = { city: app, code, streets: streetNames, hoods: hoods.map((h) => h.n) }
  if (hasMap) file.map = drawings(map.outline, polys, '© OpenStreetMap contributors (ODbL)')
  fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify(file))
  console.log(app, 'streets', streetNames.length, 'hoods', hoods.length, hasMap ? `map of ${polys.length} (${Math.round(covered * 100)}% of the city)` : 'list only')
}

// two cities at a time (Overpass serves two requests from one address at once); a city built before is kept
const done = new Set(cityFiles().map((f) => JSON.parse(fs.readFileSync(f, 'utf8')).city))
const todo = CITIES.filter(([app]) => FRESH || AGAIN.includes(app) || !done.has(app))
console.log('to build:', todo.map((c) => c[0]).join(', ') || 'nothing')
await Promise.all(
  [0, 1].map(async (lane) => {
    for (let i = lane; i < todo.length; i += 2) await buildCity(todo[i])
  }),
)

/* ---------------------------------------------------------------- tidy: what lies outside the city is not its neighbourhood */
const insideXY = (pt, poly) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const pointsOf = (d) => d.replace(/[MZ]/g, '').split('L').map((p) => p.trim().split(' ').map(Number))
/** the state writes "שד", "סמ", "ככר" and "רח" short: on the screen they are said in full */
const longStreet = (n) => n.replace(/^שד\s+/, 'שדרות ').replace(/^שד'\s*/, 'שדרות ').replace(/^סמ\s+/, 'סמטת ').replace(/^סמ'\s*/, 'סמטת ').replace(/^ככר\s+/, 'כיכר ').replace(/^רח\s+/, 'רחוב ')
/**
 * A city's own official layer (see the top of this file): geo-official/<code>.geojson becomes
 * public/geo/official/<code>.json, in the same shape as the OpenStreetMap map, and gives back how many
 * neighbourhoods it holds. Without such a file, null, and any old official file of that city is left alone.
 */
function officialLayer(file) {
  const src = path.join(OFFICIAL_IN, `${file.code}.geojson`)
  if (!fs.existsSync(src)) return null
  const fc = JSON.parse(fs.readFileSync(src, 'utf8'))
  const polys = []
  for (const f of fc.features ?? []) {
    const n = hoodName(String(f.properties?.name ?? f.properties?.name_he ?? ''))
    const g = f.geometry
    if (!n || !g) continue
    const outer = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : []
    const r = outer.sort((a, b) => ringArea(b) - ringArea(a))[0]
    if (r?.length > 3) polys.push({ n, r, a: ringArea(r) })
  }
  if (!polys.length) return null
  // the city's outline from the OpenStreetMap file when there is one, or the frame of the official shapes
  const outline = file.map?.geo?.outline ?? (() => {
    const b = boundsOf(polys.flatMap((p) => p.r))
    return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]
  })()
  fs.mkdirSync(OFFICIAL_OUT, { recursive: true })
  const layer = { city: file.city, code: file.code, source: 'official', map: drawings(outline, polys, String(fc.credit ?? 'שכבת השכונות של העירייה')) }
  fs.writeFileSync(path.join(OFFICIAL_OUT, `${file.code}.json`), JSON.stringify(layer))
  console.log(file.city, 'official layer of', polys.length)
  return polys.length
}

const index = {}
for (const [app] of CITIES) {
  const f = cityFiles().find((n) => JSON.parse(fs.readFileSync(n, 'utf8')).city === app)
  if (!f) continue
  const file = JSON.parse(fs.readFileSync(f, 'utf8'))
  file.streets = [...new Set(file.streets.map(longStreet))].sort((a, b) => a.localeCompare(b, 'he'))
  fs.writeFileSync(f, JSON.stringify(file))
  if (file.map) {
    const outline = pointsOf(file.map.outline)
    const keep = new Set(file.map.hoods.filter((h) => insideXY(h.c, outline)).map((h) => h.n))
    file.map.hoods = file.map.hoods.filter((h) => keep.has(h.n))
    if (file.map.geo) file.map.geo.hoods = file.map.geo.hoods.filter((h) => keep.has(h.n))
    if (!always(app) && file.map.hoods.length < 4) delete file.map
    fs.writeFileSync(f, JSON.stringify(file))
  }
  const official = officialLayer(file)
  index[app] = { code: file.code, streets: file.streets.length, hoods: file.hoods.length, map: !!file.map || !!official, mapped: official ?? file.map?.hoods.length ?? 0 }
  if (official) index[app].official = true
}
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n')
console.log('done')
