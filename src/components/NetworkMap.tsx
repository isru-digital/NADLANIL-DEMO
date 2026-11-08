import { useMemo } from 'react'
import type { CSSProperties } from 'react'

/**
 * The hero picture of the green version: Israel drawn as a field of dots, with the cities lit up
 * and brokers' requests travelling between them. It is the product idea in one image: one
 * country, one community, everyone connected.
 *
 * Everything that moves is a plain element animated with transform and opacity only, so it
 * stays on the compositor. The geometry is static (a clipped dot pattern and one SVG of arcs).
 */

// the map is drawn in a 146 x 400 box: x from longitude (corrected for latitude), y from latitude
const W = 146
const H = 400
const px = (lon: number) => (lon - 34.2) * 85.7
const py = (lat: number) => (33.4 - lat) * 100

type City = { id: string; name: string; lon: number; lat: number; label?: boolean; side?: 'l' | 'r' }

const cities: City[] = [
  { id: 'ks', name: 'קריית שמונה', lon: 35.57, lat: 33.21, label: true, side: 'l' },
  { id: 'tib', name: 'טבריה', lon: 35.53, lat: 32.79 },
  { id: 'haifa', name: 'חיפה', lon: 34.99, lat: 32.79, label: true, side: 'r' },
  { id: 'nat', name: 'נתניה', lon: 34.85, lat: 32.33 },
  { id: 'tlv', name: 'תל אביב', lon: 34.78, lat: 32.08, label: true, side: 'r' },
  { id: 'jer', name: 'ירושלים', lon: 35.21, lat: 31.77, label: true, side: 'r' },
  { id: 'ash', name: 'אשדוד', lon: 34.65, lat: 31.8 },
  { id: 'bs', name: 'באר שבע', lon: 34.79, lat: 31.25, label: true, side: 'r' },
  { id: 'mr', name: 'מצפה רמון', lon: 34.8, lat: 30.61 },
  { id: 'eilat', name: 'אילת', lon: 34.95, lat: 29.56, label: true, side: 'r' },
]

// pairs that talk to each other, with how far the arc bows (sign = which side)
const links: [string, string, number][] = [
  ['tlv', 'haifa', -0.3],
  ['tlv', 'jer', 0.24],
  ['tlv', 'bs', -0.2],
  ['haifa', 'ks', 0.26],
  ['bs', 'eilat', -0.16],
  ['haifa', 'tib', 0.3],
  ['jer', 'bs', 0.28],
  ['nat', 'ash', -0.35],
]

// the outline of the land, longitude and latitude, clockwise from the north-west
const outline: [number, number][] = [
  [35.1, 33.09], [35.33, 33.09], [35.45, 33.12], [35.52, 33.24], [35.58, 33.28], [35.7, 33.27], [35.78, 33.31],
  [35.85, 33.22], [35.84, 33.05], [35.82, 32.9], [35.8, 32.78], [35.7, 32.69], [35.58, 32.55], [35.56, 32.38],
  [35.56, 32.1], [35.55, 31.8], [35.57, 31.62], [35.56, 31.35], [35.5, 31.15], [35.4, 30.95], [35.3, 30.55],
  [35.15, 30.1], [35.0, 29.65], [34.97, 29.55], [34.89, 29.49], [34.85, 29.95], [34.72, 30.35], [34.55, 30.62],
  [34.42, 30.88], [34.27, 31.22], [34.37, 31.32], [34.5, 31.52], [34.56, 31.6], [34.65, 31.8], [34.73, 31.98],
  [34.76, 32.08], [34.8, 32.2], [34.85, 32.35], [34.89, 32.5], [34.94, 32.68], [34.96, 32.82], [35.02, 32.85],
  [35.07, 32.93], [35.09, 33.0],
]

const clip = `polygon(${outline.map(([lo, la]) => `${((px(lo) / W) * 100).toFixed(2)}% ${((py(la) / H) * 100).toFixed(2)}%`).join(',')})`

const byId = Object.fromEntries(cities.map((c) => [c.id, { ...c, x: px(c.lon), y: py(c.lat) }]))

type Pt = { x: number; y: number }
function arc(a: Pt, b: Pt, bow: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const c = { x: (a.x + b.x) / 2 + (-dy / len) * bow * len, y: (a.y + b.y) / 2 + (dx / len) * bow * len }
  const at = (t: number): Pt => ({
    x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
    y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
  })
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, at }
}

const STEPS = 14

export default function NetworkMap({ lite = false }: { lite?: boolean }) {
  const { paths, css, packets } = useMemo(() => {
    const used = links.slice(0, lite ? 4 : links.length)
    const paths: string[] = []
    const frames: string[] = []
    const packets: { id: number; delay: number; dur: number }[] = []
    used.forEach(([from, to, bow], i) => {
      const flip = i % 2 === 1
      const a = byId[flip ? to : from]
      const b = byId[flip ? from : to]
      const { d, at } = arc(a, b, flip ? -bow : bow)
      paths.push(d)
      let steps = ''
      for (let k = 0; k <= STEPS; k++) {
        const p = at(k / STEPS)
        const op = k === 0 ? 0 : k === 1 ? 1 : k === STEPS ? 0 : 1
        steps += `${((k / STEPS) * 100).toFixed(1)}%{transform:translate3d(calc(var(--mw)*${(p.x / W).toFixed(4)}),calc(var(--mh)*${(p.y / H).toFixed(4)}),0);opacity:${op}}`
      }
      frames.push(`@keyframes hg-p${i}{${steps}}`)
      packets.push({ id: i, delay: i * 0.85, dur: 3.2 + (i % 3) * 0.7 })
    })
    return { paths, css: frames.join(''), packets }
  }, [lite])

  return (
    <div className="hg-map" aria-hidden>
      <style>{css}</style>
      <div className="hg-land" style={{ clipPath: clip, WebkitClipPath: clip }} />
      <svg className="hg-arcs" viewBox={`0 0 ${W} ${H}`}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      {packets.map((p) => (
        <i
          key={p.id}
          className="hg-packet"
          style={{ animation: `hg-p${p.id} ${p.dur}s linear ${p.delay}s infinite` } as CSSProperties}
        />
      ))}
      {cities.map((c, i) => {
        const n = byId[c.id]
        return (
          <span
            key={c.id}
            className={`hg-node${c.label ? ' is-major' : ''}`}
            style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%`, '--d': `${(i * 0.37) % 2.6}s` } as CSSProperties}
          >
            <i />
            <b />
            {c.label && <em className={c.side === 'l' ? 'is-l' : 'is-r'}>{c.name}</em>}
          </span>
        )
      })}
    </div>
  )
}

// the same map drawing, reused by the beta lab's demand radar
export { W as MAP_W, H as MAP_H, clip as MAP_CLIP, px as mapX, py as mapY }
