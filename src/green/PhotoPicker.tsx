import { useRef, useState } from 'react'
import { ExternalLink, ImagePlus, X } from 'lucide-react'
import { asset } from '../config'

/**
 * Photos for a property in the new CRM card (green version, Itzik 13.11.2026): up to three, each up to 2 MB, with a
 * link to TinyPNG for making a heavy photo lighter. There is no server: a photo is made smaller in the browser and
 * kept in this browser only, as part of the card.
 */
export const MAX_PHOTOS = 3
export const MAX_BYTES = 2 * 1024 * 1024
const TINYPNG = 'https://tinypng.com/'
/** The longest side a photo is kept at: enough for a card and a post, light enough to stay in the browser. */
const SIDE = 960

/** Reads an image file and returns it smaller, as a JPEG data address. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error('no canvas'))
      // a white ground, so a see-through PNG does not turn black as a JPEG
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('not an image'))
    }
    img.src = url
  })
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)

export default function PhotoPicker({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const full = photos.length >= MAX_PHOTOS

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - photos.length
    const picked = [...files]
    const notes: string[] = []
    if (picked.length > room) notes.push(`אפשר להעלות עד ${MAX_PHOTOS} תמונות. נוספו רק ${room === 1 ? 'אחת' : room}.`)
    const next = [...photos]
    setBusy(true)
    for (const file of picked.slice(0, room)) {
      if (!file.type.startsWith('image/')) {
        notes.push(`"${file.name}" הוא לא קובץ תמונה.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        notes.push(`"${file.name}" שוקלת ${mb(file.size)} מגה. המקסימום הוא 2 מגה, אפשר להקטין אותה ב-TinyPNG.`)
        continue
      }
      try {
        next.push(await shrink(file))
      } catch {
        notes.push(`לא הצלחנו לקרוא את "${file.name}". נסו קובץ JPG או PNG.`)
      }
    }
    setBusy(false)
    setError(notes.join(' '))
    onChange(next)
    // the same file can be picked again after it was removed
    if (input.current) input.current.value = ''
  }

  return (
    <div className="field ga-photos" data-count={photos.length}>
      <span className="field-label">
        תמונות הנכס <small>עד {MAX_PHOTOS} תמונות, עד 2 מגה לתמונה</small>
      </span>
      <div className="ga-photo-grid">
        {photos.map((p, i) => (
          <figure key={i} className="ga-photo">
            <img src={asset(p)} alt={`תמונה ${i + 1}`} />
            {i === 0 && <figcaption>ראשית</figcaption>}
            <button
              type="button"
              aria-label={`הסרת תמונה ${i + 1}`}
              onClick={() => {
                setError('')
                onChange(photos.filter((_, j) => j !== i))
              }}
            >
              <X />
            </button>
          </figure>
        ))}
        {!full && (
          <label className={`ga-photo-add${busy ? ' is-busy' : ''}`}>
            <input ref={input} type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} disabled={busy} data-f="photos" />
            <ImagePlus />
            <span>{busy ? 'מעלה...' : photos.length ? 'עוד תמונה' : 'הוספת תמונות'}</span>
          </label>
        )}
      </div>
      {error && (
        <em className="ga-photo-err" role="alert">
          {error}
        </em>
      )}
      <a className="ga-tiny" href={TINYPNG} target="_blank" rel="noopener noreferrer" data-act="tinypng">
        תמונה כבדה מדי? אפשר להקטין אותה בחינם ב-TinyPNG <ExternalLink />
      </a>
    </div>
  )
}

/** The photos after the first one, small, on a property's card on the board. */
export function CardPhotos({ images }: { images?: string[] }) {
  if (!images || images.length < 2) return null
  return (
    <div className="ga-card-photos" aria-label={`${images.length} תמונות`}>
      {images.slice(1).map((p, i) => (
        <img key={i} src={asset(p)} alt="" loading="lazy" />
      ))}
      <span>
        <b className="num">{images.length}</b> תמונות
      </span>
    </div>
  )
}
