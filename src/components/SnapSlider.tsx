import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import '../styles/post-form.css'

/**
 * A slider that stops at fixed points (Itzik 22.11.2026: the price and "עמלת שת"פ"), made for a thumb on a phone:
 *  - the round handle follows the finger from where it was grabbed, so it never jumps to the finger;
 *  - on the track, a sideways move of a few pixels takes the slider, and an up or down move is left to the page, so
 *    scrolling past it never moves it; a tap on the track (without a move) puts the handle there;
 *  - "−" and "+" move it one stop, for a value that must be exact, and the arrow keys do the same;
 *  - it reads from the start of the line: in Hebrew the least is on the right.
 * Until a value is chosen (`chosen` false) the handle waits, quiet, at `index`, and the bar is not filled.
 */
type Props = {
  id: string
  count: number
  index: number
  chosen: boolean
  onChange: (index: number) => void
  label: string
  valueText: string
  less: string
  more: string
  marks?: { at: number; label: string }[]
}

/** a move shorter than this is a tap; a longer one decides who it belongs to, the slider or the page */
const SLOP = 7

export function SnapSlider({ id, count, index, chosen, onChange, label, valueText, less, more, marks }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; from: number; mine: boolean; moved: boolean } | null>(null)
  const last = count - 1
  const clamp = (i: number) => Math.max(0, Math.min(last, i))
  const at = (i: number) => (last > 0 ? (i / last) * 100 : 0)
  const go = (i: number) => {
    const next = clamp(i)
    if (next !== index || !chosen) onChange(next)
  }
  const geometry = () => {
    const el = wrap.current!
    const r = el.getBoundingClientRect()
    const rtl = getComputedStyle(el).direction === 'rtl'
    return { r, rtl, per: r.width / Math.max(1, last) }
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const onHandle = (e.target as HTMLElement).closest('.ss-thumb') !== null
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: index, mine: onHandle, moved: false }
    if (onHandle) {
      // the handle is taken at once (its own touch-action is "none": the page does not scroll from it)
      wrap.current?.setPointerCapture(e.pointerId)
      ;(e.target as HTMLElement).focus({ preventScroll: true })
      if (!chosen) onChange(index)
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
      d.mine = true
      wrap.current?.setPointerCapture(e.pointerId)
    }
    d.moved = true
    e.preventDefault()
    const { rtl, per } = geometry()
    go(d.from + Math.round(((rtl ? -dx : dx) / per) * 1))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId || d.moved || d.mine) return
    // a tap on the track: the handle goes there
    const { r, rtl } = geometry()
    const frac = rtl ? (r.right - e.clientX) / r.width : (e.clientX - r.left) / r.width
    go(Math.round(Math.max(0, Math.min(1, frac)) * last))
  }
  const key = (e: KeyboardEvent<HTMLSpanElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const big = Math.max(1, Math.round(count / 10))
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowDown: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      PageUp: big,
      PageDown: -big,
    }
    if (e.key in steps) {
      e.preventDefault()
      go(index + steps[e.key])
    } else if (e.key === 'Home') {
      e.preventDefault()
      go(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      go(last)
    }
  }

  return (
    <div className={`ss${chosen ? '' : ' is-waiting'}`} data-slider={id}>
      <button type="button" className="ss-step" aria-label={less} onClick={() => go(chosen ? index - 1 : index)} disabled={chosen && index === 0} data-step="less">
        <Minus aria-hidden />
      </button>
      <div className="ss-body">
        <div ref={wrap} className="ss-hit" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => (drag.current = null)} data-track>
          <span className="ss-track" aria-hidden>
            <i className="ss-fill" style={{ inlineSize: chosen ? `${at(index)}%` : 0 }} />
          </span>
          <span
            className="ss-thumb"
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={index}
            aria-valuetext={valueText}
            onKeyDown={key}
            style={{ insetInlineStart: `${at(index)}%` }}
            data-thumb
          />
        </div>
        {marks && (
          <div className="ss-marks" aria-hidden>
            {marks.map((m) => (
              <span key={m.at} style={{ insetInlineStart: `${at(m.at)}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="ss-step" aria-label={more} onClick={() => go(chosen ? index + 1 : index)} disabled={chosen && index === last} data-step="more">
        <Plus aria-hidden />
      </button>
    </div>
  )
}
