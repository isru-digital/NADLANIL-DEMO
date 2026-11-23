import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Camera, Check, Images, Lock, Smartphone, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { cities as knownCities } from '../data/demo'
import { useStore } from '../store'
import { saveOwnProfile, signedIn } from '../auth/session'
import { initials } from '../config/initials'
import { Modal } from '../components/ui'
import { PlacePicker } from '../components/PlacePicker'
import '../styles/profile-edit.css'

/**
 * "עריכת פרופיל" (Itzik 20.11.2026): one simple screen, the way a social app does it. A round picture from the
 * gallery or the camera, the name to appear under, a phone, the cities and neighbourhoods of work, and one button.
 *
 * What is saved is kept in this browser only (auth/session.ts says why): the screen says so in one quiet line.
 * The phone is never shown in the feed; the line under its field says that too.
 */
export default function ProfileEdit({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open && !!signedIn} onClose={onClose} title="עריכת פרופיל">
      {/* inside the window, so every opening starts from what is saved */}
      <Form onClose={onClose} />
    </Modal>
  )
}

type Errors = Partial<Record<'name' | 'phone' | 'cities' | 'photo' | 'save', string>>
/** the line of neighbourhoods as it is kept, back into names: "כפר גנים, אם המושבות" */
const splitHoods = (s: string) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
/** The side of the saved picture, in pixels: sharp on a phone at three times the largest size it is shown at. */
const OUT = 320

function Form({ onClose }: { onClose: () => void }) {
  const me = signedIn!
  const { toast, builder, setBuilder } = useStore()
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(me.phone)
  const [cities, setCities] = useState<string[]>(me.cities)
  const [other, setOther] = useState('')
  // the neighbourhoods of work: kept as one line ("כפר גנים, אם המושבות"), picked from the cities' lists
  const [{ hoods, manual }, setPlaces] = useState<{ hoods: string[]; manual: string[] }>(() => ({ hoods: splitHoods(me.areas), manual: [] }))
  const areas = hoods.join(', ')
  const [photo, setPhoto] = useState(me.photo)
  const [raw, setRaw] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const form = useRef<HTMLFormElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)

  // the picture that was picked waits for its cut as a temporary address: it is let go when the screen closes
  useEffect(() => () => void (raw && URL.revokeObjectURL(raw)), [raw])

  const pick = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setErrors((e) => ({ ...e, photo: 'הקובץ הזה הוא לא תמונה. בוחרים תמונה מהגלריה או מצלמים.' }))
    setErrors((e) => ({ ...e, photo: undefined }))
    setRaw(URL.createObjectURL(file))
  }
  // a line of "what is wrong" leaves as soon as the person starts to put it right
  const mended = (f: keyof Errors) => setErrors((e) => (e[f] || e.save ? { ...e, [f]: undefined, save: undefined } : e))
  const toggle = (c: string) => {
    mended('cities')
    setCities((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]))
  }
  const addOther = () => {
    const c = other.trim()
    if (c.length < 2) return
    mended('cities')
    setCities((list) => (list.includes(c) ? list : [...list, c]))
    setOther('')
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    const list = other.trim().length >= 2 && !cities.includes(other.trim()) ? [...cities, other.trim()] : cities
    const digits = phone.replace(/\D/g, '')
    const bad: Errors = {}
    if (name.trim().length < 2) bad.name = 'כותבים שם של לפחות 2 אותיות.'
    // a broker signed up with a phone and a city; one of the staff works in no city and may leave both empty
    if (digits.length ? digits.length < 9 : me.isBroker) bad.phone = 'מספר הטלפון קצר מדי. למשל: 050-1234567'
    if (me.isBroker && list.length === 0) bad.cities = 'בוחרים לפחות עיר אחת.'
    setErrors(bad)
    const first = (['name', 'phone', 'cities'] as const).find((f) => bad[f])
    if (first) return form.current?.querySelector<HTMLElement>(`[data-f="${first}"]`)?.focus()

    const before = me.name
    const next = name.trim()
    if (!saveOwnProfile({ name: next, phone: phone.trim(), cities: list, areas: areas.trim(), photo })) {
      return setErrors({ save: 'לא הצלחנו לשמור בדפדפן הזה. אפשר לנסות שוב בלי התמונה.' })
    }
    // the personal page's draft follows the name, as long as its own name was not typed by hand
    if (builder.name === before && next !== before) setBuilder({ name: next })
    toast('הפרופיל נשמר')
    onClose()
  }

  const err = (f: keyof Errors) =>
    errors[f] ? (
      <em className="pfe-err" role="alert" data-err={f}>
        {errors[f]}
      </em>
    ) : null

  if (raw)
    return (
      <Cropper
        src={raw}
        onCancel={() => setRaw(null)}
        onFail={() => {
          setRaw(null)
          setErrors((e) => ({ ...e, photo: 'לא הצלחנו לפתוח את התמונה הזאת. אפשר לנסות תמונה אחרת.' }))
        }}
        onDone={(cut) => {
          setPhoto(cut)
          setRaw(null)
        }}
      />
    )

  const shown = name.trim() || me.name
  return (
    <form ref={form} className="modal-body pfe" onSubmit={save} noValidate data-profile-edit>
      {/* ------------------------------------------------------------ the picture */}
      <div className="pfe-photo">
        <button type="button" className="pfe-face" onClick={() => gallery.current?.click()} aria-label={photo ? 'החלפת תמונת הפרופיל' : 'העלאת תמונת פרופיל'} data-act="photo">
          <img src={photo || initials(shown)} alt="" width={112} height={112} data-photo={photo ? 'own' : 'initials'} />
          <i aria-hidden>
            <Camera />
          </i>
        </button>
        <div className="pfe-photo-acts">
          <button type="button" className="pfe-pill" onClick={() => gallery.current?.click()} data-act="from-gallery">
            <Images aria-hidden /> מהגלריה
          </button>
          <button type="button" className="pfe-pill" onClick={() => camera.current?.click()} data-act="from-camera">
            <Camera aria-hidden /> צילום
          </button>
          {photo && (
            <button type="button" className="pfe-pill is-quiet" onClick={() => setPhoto('')} data-act="remove-photo">
              <Trash2 aria-hidden /> הסרה
            </button>
          )}
        </div>
        {/* on a phone the second one opens the camera; on a computer both open the files window */}
        <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} data-f="photo-gallery" />
        <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} data-f="photo-camera" />
        {err('photo')}
      </div>

      {/* ------------------------------------------------------------ the details */}
      <label className="pfe-field">
        <span>שם תצוגה או כינוי</span>
        <input className="input" data-f="name" value={name} onChange={(e) => (mended('name'), setName(e.target.value))} maxLength={40} autoComplete="name" aria-invalid={!!errors.name} />
        {err('name') ?? <small>כך השם שלך יופיע בפיד, בפוסטים ובתגובות.</small>}
      </label>

      <label className="pfe-field">
        <span>טלפון</span>
        <input className="input ltr" data-f="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => (mended('phone'), setPhone(e.target.value))} maxLength={20} autoComplete="tel" placeholder="050-1234567" aria-invalid={!!errors.phone} />
        {err('phone') ?? (
          <small className="pfe-private">
            <Lock aria-hidden /> לא מוצג לאחרים בפיד.
          </small>
        )}
      </label>

      <fieldset className="pfe-field">
        <legend>ערים שעובדים בהן</legend>
        <div className="pfe-chips" role="group" aria-label="ערים">
          {[...knownCities, ...cities.filter((c) => !knownCities.includes(c))].map((c, i) => {
            const on = cities.includes(c)
            return (
              <button key={c} type="button" role="checkbox" aria-checked={on} className="pfe-chip" data-f={i === 0 ? 'cities' : undefined} data-city={c} onClick={() => toggle(c)}>
                {on && <Check aria-hidden />}
                {c}
              </button>
            )
          })}
        </div>
        <div className="pfe-other">
          <input
            className="input"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addOther()
              }
            }}
            maxLength={30}
            placeholder="עיר אחרת"
            aria-label="עיר אחרת"
            data-f="other-city"
          />
          <button type="button" className="btn btn-ghost" onClick={addOther} disabled={other.trim().length < 2}>
            הוספה
          </button>
        </div>
        {err('cities')}
      </fieldset>

      {/* the neighbourhoods come from the cities' own lists (23.11.2026): a letter opens every name that has it */}
      <fieldset className="pfe-field pfe-hoods">
        <legend>
          שכונות עבודה <i>לא חובה</i>
        </legend>
        <PlacePicker id="profile" what="client" cities={cities} value={{ streets: [], hoods, manual }} onChange={(next) => setPlaces({ hoods: next.hoods, manual: next.manual })} many streets={false} />
      </fieldset>

      {/* ------------------------------------------------------------ one button */}
      <div className="pfe-foot">
        {err('save')}
        <button type="submit" className="btn btn-gold btn-lg btn-block" data-act="save-profile">
          שמירה
        </button>
        <p className="pfe-note">
          <Smartphone aria-hidden /> בינתיים הפרטים נשמרים במכשיר הזה בלבד.
        </p>
      </div>
    </form>
  )
}

/* ================================================================ the cut to a circle */

const STAGE = 264
const MAX_ZOOM = 3

/**
 * The picture under a round window: dragged with a finger or the mouse (or the arrow keys), made bigger with the
 * slider. What is inside the circle is saved as a small square picture; every screen shows it round.
 */
function Cropper({ src, onDone, onCancel, onFail }: { src: string; onDone: (cut: string) => void; onCancel: () => void; onFail: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const el = new Image()
    el.onload = () => (el.naturalWidth > 0 ? setImg(el) : onFail())
    el.onerror = onFail
    el.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // the picture always covers the round window: at its smallest its short side is the window's side
  const k = img ? (STAGE / Math.min(img.naturalWidth, img.naturalHeight)) * zoom : 1
  const w = img ? img.naturalWidth * k : STAGE
  const h = img ? img.naturalHeight * k : STAGE
  const hold = (x: number, y: number, width = w, height = h) => {
    const mx = Math.max(0, (width - STAGE) / 2)
    const my = Math.max(0, (height - STAGE) / 2)
    return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) }
  }
  const zoomTo = (z: number) => {
    if (!img) return
    const next = Math.min(MAX_ZOOM, Math.max(1, z))
    const nk = (STAGE / Math.min(img.naturalWidth, img.naturalHeight)) * next
    setZoom(next)
    // what is in the middle of the window stays in the middle
    setPos((p) => hold((p.x * next) / zoom, (p.y * next) / zoom, img.naturalWidth * nk, img.naturalHeight * nk))
  }

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setPos(hold(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y))
  }
  const up = () => (drag.current = null)
  const keys = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key]
    if (!step) return
    e.preventDefault()
    setPos((p) => hold(p.x + step[0], p.y + step[1]))
  }

  const done = () => {
    if (!img) return
    const c = document.createElement('canvas')
    c.width = c.height = OUT
    const ctx = c.getContext('2d')
    if (!ctx) return onFail()
    const r = OUT / STAGE
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, OUT, OUT)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (STAGE / 2 + pos.x - w / 2) * r, (STAGE / 2 + pos.y - h / 2) * r, w * r, h * r)
    onDone(c.toDataURL('image/jpeg', 0.86))
  }

  return (
    <div className="modal-body pfe pfe-crop" data-crop>
      <p className="pfe-crop-lead">גוררים את התמונה למקום, ומגדילים אם צריך.</p>
      <div
        className="pfe-stage"
        style={{ width: STAGE, height: STAGE }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={keys}
        tabIndex={0}
        role="group"
        aria-label="מיקום התמונה בתוך העיגול. אפשר לגרור, או להזיז עם מקשי החצים"
        data-stage
      >
        {img && <img src={src} alt="" draggable={false} style={{ width: w, height: h, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} />}
        <span className="pfe-ring" aria-hidden />
      </div>
      <div className="pfe-zoom">
        <button type="button" onClick={() => zoomTo(zoom - 0.25)} aria-label="הקטנה" disabled={zoom <= 1}>
          <ZoomOut />
        </button>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="הגדלת התמונה" data-f="zoom" />
        <button type="button" onClick={() => zoomTo(zoom + 0.25)} aria-label="הגדלה" disabled={zoom >= MAX_ZOOM}>
          <ZoomIn />
        </button>
      </div>
      <div className="pfe-crop-acts">
        <button type="button" className="btn btn-gold btn-lg" onClick={done} disabled={!img} data-act="crop-done">
          <Check /> אישור
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onCancel} data-act="crop-cancel">
          ביטול
        </button>
      </div>
    </div>
  )
}
