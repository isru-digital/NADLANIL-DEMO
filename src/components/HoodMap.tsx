import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Minus, Plus, X } from 'lucide-react'
import type { CityPlaces } from '../config/places'
import '../styles/places.css'

/**
 * The neighbourhoods of a city on its own map (Itzik 22.11.2026, made clear and big on 23.11.2026): the city's
 * outline and the neighbourhoods' boundaries from OpenStreetMap, drawn by the page itself (no map tiles from
 * anywhere, so nothing is asked of another server).
 *  - the map fills the window, and the city is drawn as large as it fits;
 *  - a neighbourhood is a soft green with a clear edge, and the one picked is the site's own green;
 *  - a name shows on every neighbourhood with room for it, and on the one under the mouse or the finger, and more
 *    names appear as the map is made bigger;
 *  - a tap picks a neighbourhood, a second tap lets it go; where several are allowed, each tap adds one;
 *  - one finger moves the map, two fingers zoom it, the wheel zooms it, and the page under it never scrolls;
 *  - the parts of the city that OpenStreetMap has no neighbourhood boundary for are drawn as a quiet hatch, with a
 *    line that says so, so an empty place does not read as a broken map.
 */
type View = { s: number; x: number; y: number }
const MIN = 1
const MAX = 10
const TAP = 8

export function HoodMap({
  open,
  places,
  picked,
  many,
  what = 'property',
  onClose,
  onDone,
}: {
  open: boolean
  places: CityPlaces
  picked: string[]
  many: boolean
  /** what the neighbourhood is being picked for, so the line at the top says the right thing */
  what?: 'property' | 'client'
  onClose: () => void
  onDone: (hoods: string[]) => void
}) {
  const map = places.map!
  const [chosen, setChosen] = useState<string[]>(picked)
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 })
  const [near, setNear] = useState<string | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ start: View; a: { x: number; y: number }; d: number; mid: { x: number; y: number }; moved: number; target: string | null } | null>(null)

  useEffect(() => {
    if (!open) return
    setChosen(picked)
    setView({ s: 1, x: 0, y: 0 })
    setNear(null)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', key)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (n: string) => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : many ? [...c, n] : [n]))
  const clampView = (v: View): View => {
    const s = Math.max(MIN, Math.min(MAX, v.s))
    const r = stage.current?.getBoundingClientRect()
    if (!r) return { ...v, s }
    // the map may not slide out of sight: at least a third of it stays in the frame
    const lim = (size: number) => (size * s) / 1.5
    return { s, x: Math.max(-lim(r.width), Math.min(lim(r.width), v.x)), y: Math.max(-lim(r.height), Math.min(lim(r.height), v.y)) }
  }
  /** zoom by a factor around a point of the frame (in its own pixels from its centre) */
  const zoomAt = (v: View, f: number, px: number, py: number): View => {
    const s = Math.max(MIN, Math.min(MAX, v.s * f))
    const k = s / v.s
    return clampView({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
  }
  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect()
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }
  }
  const hoodAt = (e: { target: EventTarget | null }) => (e.target as Element)?.closest?.('[data-hood]')?.getAttribute('data-hood') ?? null

  const down = (e: PointerEvent<HTMLDivElement>) => {
    stage.current?.setPointerCapture(e.pointerId)
    pts.current.set(e.pointerId, local(e))
    const list = [...pts.current.values()]
    const target = hoodAt(e)
    if (list.length === 1) gesture.current = { start: view, a: list[0], d: 0, mid: list[0], moved: 0, target }
    else if (list.length === 2) {
      const [p, q] = list
      gesture.current = { start: view, a: p, d: Math.hypot(p.x - q.x, p.y - q.y), mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, moved: TAP + 1, target: null }
    }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    // the mouse alone, with nothing held: the neighbourhood under it is lit and says its name
    if (!gesture.current) {
      if (e.pointerType === 'mouse') setNear(hoodAt(e))
      return
    }
    if (!pts.current.has(e.pointerId)) return
    e.preventDefault()
    pts.current.set(e.pointerId, local(e))
    const g = gesture.current
    const list = [...pts.current.values()]
    if (list.length >= 2 && g.d > 0) {
      const [p, q] = list
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      const z = zoomAt(g.start, d / g.d, g.mid.x, g.mid.y)
      setView(clampView({ ...z, x: z.x + mid.x - g.mid.x, y: z.y + mid.y - g.mid.y }))
    } else if (list.length === 1) {
      const p = list[0]
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.a.x, p.y - g.a.y))
      if (g.moved > TAP) setView(clampView({ ...g.start, x: g.start.x + p.x - g.a.x, y: g.start.y + p.y - g.a.y }))
    }
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    pts.current.delete(e.pointerId)
    if (pts.current.size === 0) {
      // a tap (no real move) on a neighbourhood picks it, or lets it go
      if (g && g.moved <= TAP && g.target) {
        flip(g.target)
        // on a phone the name of what was just touched stays a moment, so it is seen
        if (e.pointerType !== 'mouse') setNear(g.target)
      }
      gesture.current = null
    } else {
      const p = [...pts.current.values()][0]
      gesture.current = { start: view, a: p, d: 0, mid: p, moved: TAP + 1, target: null }
    }
  }
  const wheel = (e: WheelEvent<HTMLDivElement>) => {
    const p = local(e)
    setView((v) => zoomAt(v, e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y))
  }
  const step = (f: number) => setView((v) => zoomAt(v, f, 0, 0))

  /* The labels keep their size on screen at any zoom. A name is drawn on a neighbourhood that has room for it: its
     own box, in the drawing's units, against how long the name is at the size it is drawn. As the map is made
     bigger the names need less room, so more of them appear. The one picked, and the one under the mouse or the
     finger, always says its name. */
  const font = useMemo(() => Math.max(11, Math.min(20, map.w / 46)), [map.w])
  const boxes = useMemo(() => {
    const out: Record<string, { w: number; h: number }> = {}
    for (const h of map.hoods) {
      const nums = h.d.replace(/[MZ]/g, ' ').split('L').map((p) => p.trim().split(/\s+/).map(Number))
      const xs = nums.filter((p) => p.length === 2 && !Number.isNaN(p[0])).map((p) => p[0])
      const ys = nums.filter((p) => p.length === 2 && !Number.isNaN(p[1])).map((p) => p[1])
      out[h.n] = { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    }
    return out
  }, [map])
  const fits = (n: string) => {
    const b = boxes[n]
    const size = font / view.s
    // a Hebrew letter at this size is about 0.52 of it wide; the name needs its own height too
    return !!b && b.w >= n.length * size * 0.52 && b.h >= size * 1.6
  }
  const n = chosen.length
  const line =
    what === 'client'
      ? many
        ? 'לוחצים על כל שכונה שמעניינת את הלקוח. לחיצה נוספת מבטלת.'
        : 'לוחצים על השכונה שהלקוח מחפש בה.'
      : many
        ? 'לוחצים על כל שכונה שרוצים. לחיצה נוספת מבטלת.'
        : 'לוחצים על השכונה שבה נמצא הנכס.'
  if (!open) return null
  return createPortal(
    <div className="hm" role="dialog" aria-modal="true" aria-label={`מפת השכונות של ${places.city}`} data-hood-map={places.city}>
      <header className="hm-top">
        <button type="button" className="hm-x" onClick={onClose} aria-label="סגירה" data-act="close-map">
          <X aria-hidden />
        </button>
        <div>
          <strong>בחירת שכונה מהמפה</strong>
          <span className="pl-city">{places.city}</span>
        </div>
      </header>
      <div className="hm-head">
        <p className="hm-tip" data-map-tip>
          {line} <span>מזיזים את המפה בגרירה, ומגדילים בצביטה או בכפתורי הזום.</span>
        </p>
        <div className="hm-legend" data-map-legend>
          <span>
            <i className="hm-key is-hood" /> שכונה
          </span>
          <span>
            <i className="hm-key is-on" /> נבחרה
          </span>
          <span>
            <i className="hm-key is-gap" /> אין גבול שכונה במפה הפתוחה
          </span>
        </div>
      </div>
      <div
        ref={stage}
        className="hm-stage"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => setNear(null)}
        onWheel={wheel}
        data-map-stage
      >
        <svg viewBox={`0 0 ${map.w} ${map.h}`} preserveAspectRatio="xMidYMid meet" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }} data-scale={view.s}>
          <defs>
            {/* the parts of the city with no neighbourhood boundary in the open data: a quiet hatch, not a hole */}
            <pattern id="hm-gap" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="9" height="9" className="hm-gap-bg" />
              <line x1="0" y1="0" x2="0" y2="9" className="hm-gap-line" />
            </pattern>
          </defs>
          <path className="hm-city" d={map.outline} />
          {map.hoods.map((h) => (
            <path
              key={h.n}
              className={`hm-hood${chosen.includes(h.n) ? ' is-on' : ''}${near === h.n ? ' is-near' : ''}`}
              d={h.d}
              data-hood={h.n}
              role="checkbox"
              aria-checked={chosen.includes(h.n)}
              aria-label={h.n}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {map.hoods
            .filter((h) => chosen.includes(h.n) || near === h.n || fits(h.n))
            .map((h) => (
              <text
                key={`t:${h.n}`}
                className={`hm-label${chosen.includes(h.n) ? ' is-on' : ''}${near === h.n ? ' is-near' : ''}`}
                x={h.c[0]}
                y={h.c[1]}
                style={{ fontSize: font / view.s }}
                textAnchor="middle"
                dominantBaseline="middle"
                data-label={h.n}
              >
                {h.n}
              </text>
            ))}
        </svg>
        <div className="hm-zoom">
          <button type="button" onClick={() => step(1.5)} aria-label="הגדלה" disabled={view.s >= MAX} data-act="zoom-in">
            <Plus aria-hidden />
          </button>
          <button type="button" onClick={() => step(1 / 1.5)} aria-label="הקטנה" disabled={view.s <= MIN} data-act="zoom-out">
            <Minus aria-hidden />
          </button>
        </div>
        <small className="hm-credit">{map.credit}</small>
      </div>
      {/* always there, so the map does not move under the finger when the first one is picked */}
      <div className="hm-chips" aria-live="polite">
        {n === 0 && <span className="hm-none">עוד לא נבחרה שכונה</span>}
        {chosen.map((c) => (
          <span key={c} className="pl-chip is-on" data-map-chip={c}>
            {c}
            <button type="button" onClick={() => flip(c)} aria-label={`הסרת ${c}`} data-act="map-chip-off">
              <X aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <footer className="hm-foot">
        <button type="button" className="btn btn-gold btn-lg hm-ok" onClick={() => onDone(chosen)} disabled={n === 0} data-act="map-done">
          <Check aria-hidden />
          {n === 0 ? 'בוחרים שכונה' : n === 1 ? 'אישור שכונה אחת' : `אישור ${n} שכונות`}
        </button>
      </footer>
    </div>,
    document.body,
  )
}
