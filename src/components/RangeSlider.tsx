import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

/**
 * A small slider with two handles, for a range of money (Itzik 23.11.2026: "גם וגם" - the amount can be dragged
 * here or written in the two boxes under it; whichever is touched, the other follows).
 * It keeps the manners of SnapSlider, which a thumb on a phone already knows:
 *  - the handle follows the finger from where it was grabbed, so it never jumps under it;
 *  - on the track, a sideways move of a few pixels takes the slider, and an up or down move is left to the page;
 *  - a tap on the track moves the nearer handle there;
 *  - the arrow keys move a handle one step, Page one tenth, Home and End to its ends;
 *  - it reads from the start of the line: in Hebrew the least is on the right.
 * `from` and `to` are null when that side has no end. The top of the track is "ומעלה": a `to` at the top is null.
 */
type Props = {
  id: string
  max: number
  step: number
  from: number | null
  to: number | null
  onChange: (from: number | null, to: number | null) => void
  /** the line under the track, said in the page's own words */
  text: string
  fromLabel: string
  toLabel: string
  say: (n: number, top: boolean) => string
}

/** a move shorter than this is a tap; a longer one decides who it belongs to, the slider or the page */
const SLOP = 7

export function RangeSlider({ id, max, step, from, to, onChange, text, fromLabel, toLabel, say }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; which: 'from' | 'to' | null; start: number; mine: boolean; moved: boolean } | null>(null)
  const lo = Math.max(0, Math.min(max, from ?? 0))
  const hi = Math.max(lo, Math.min(max, to ?? max))
  const pc = (v: number) => (max > 0 ? (v / max) * 100 : 0)
  const round = (v: number) => Math.max(0, Math.min(max, Math.round(v / step) * step))
  /**
   * 0 on the least side is "no floor", and the top on the other is "no ceiling": both mean "everything".
   * The side that was not moved is sent back exactly as it came, so an amount written by hand that is bigger than
   * the end of the track (30,000,000) is not quietly cut by a drag of the other handle.
   */
  const go = (which: 'from' | 'to', v: number) => {
    const n = round(v)
    if (which === 'from') {
      const next = Math.min(n, hi)
      onChange(next <= 0 ? null : next, to)
    } else {
      const next = Math.max(n, lo)
      onChange(from, next >= max ? null : next)
    }
  }
  const geometry = () => {
    const el = wrap.current!
    const r = el.getBoundingClientRect()
    const rtl = getComputedStyle(el).direction === 'rtl'
    return { r, rtl, per: r.width / Math.max(1, max / step) }
  }
  const fracAt = (clientX: number) => {
    const { r, rtl } = geometry()
    const f = rtl ? (r.right - clientX) / r.width : (clientX - r.left) / r.width
    return Math.max(0, Math.min(1, f))
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const thumb = (e.target as HTMLElement).closest('[data-thumb]') as HTMLElement | null
    const which = thumb ? ((thumb.dataset.thumb as 'from' | 'to') ?? null) : null
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, which, start: which === 'to' ? hi : lo, mine: !!which, moved: false }
    if (which) {
      wrap.current?.setPointerCapture(e.pointerId)
      thumb?.focus({ preventScroll: true })
    }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.mine) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      // up or down first: it is the page being scrolled, the slider lets go
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null
        return
      }
      // a sideways move that started on the track takes the handle nearer to where it started
      const f = fracAt(d.x) * max
      d.which = Math.abs(f - lo) <= Math.abs(f - hi) ? 'from' : 'to'
      d.start = d.which === 'to' ? hi : lo
      d.mine = true
      wrap.current?.setPointerCapture(e.pointerId)
    }
    d.moved = true
    e.preventDefault()
    const { rtl, per } = geometry()
    go(d.which!, d.start + Math.round(((rtl ? -dx : dx) / per)) * step)
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId || d.moved || d.which) return
    // a tap on the track: the handle nearer to it goes there
    const v = fracAt(e.clientX) * max
    go(Math.abs(v - lo) <= Math.abs(v - hi) ? 'from' : 'to', v)
  }
  const key = (which: 'from' | 'to', now: number) => (e: KeyboardEvent<HTMLSpanElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const big = Math.max(step, Math.round(max / 10 / step) * step)
    const steps: Record<string, number> = {
      ArrowUp: step,
      ArrowDown: -step,
      ArrowRight: rtl ? -step : step,
      ArrowLeft: rtl ? step : -step,
      PageUp: big,
      PageDown: -big,
    }
    if (e.key in steps) {
      e.preventDefault()
      go(which, now + steps[e.key])
    } else if (e.key === 'Home') {
      e.preventDefault()
      go(which, which === 'from' ? 0 : lo)
    } else if (e.key === 'End') {
      e.preventDefault()
      go(which, max)
    }
  }

  const open = from === null && to === null
  return (
    <div className={`rng${open ? ' is-open' : ''}`} data-range={id}>
      <div ref={wrap} className="rng-hit" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => (drag.current = null)} data-track>
        <span className="rng-track" aria-hidden>
          <i className="rng-fill" style={{ insetInlineStart: `${pc(lo)}%`, inlineSize: `${pc(hi - lo)}%` }} />
        </span>
        <span
          className="rng-thumb"
          role="slider"
          tabIndex={0}
          aria-label={fromLabel}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={lo}
          aria-valuetext={say(lo, false)}
          onKeyDown={key('from', lo)}
          style={{ insetInlineStart: `${pc(lo)}%` }}
          data-thumb="from"
        />
        <span
          className="rng-thumb"
          role="slider"
          tabIndex={0}
          aria-label={toLabel}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={hi}
          aria-valuetext={say(hi, hi >= max)}
          onKeyDown={key('to', hi)}
          style={{ insetInlineStart: `${pc(hi)}%` }}
          data-thumb="to"
        />
      </div>
      <p className="rng-say num" aria-live="polite" data-range-say>
        {text}
      </p>
    </div>
  )
}
