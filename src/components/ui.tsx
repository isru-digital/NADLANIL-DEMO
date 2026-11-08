import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import { LOGO_FILE, PLATFORM_NAME, PLATFORM_TAGLINE, asset } from '../config'
import { useStore } from '../store'

export const EASE = [0.22, 1, 0.36, 1] as const

/** The platform name, with a trailing Latin suffix (for example "IL") picked out in gold. */
export function BrandName() {
  const m = PLATFORM_NAME.match(/^(.*\S)\s+([A-Za-z]{2,4})$/)
  if (!m) return <>{PLATFORM_NAME}</>
  return (
    <>
      {m[1]} <span className="brand-il">{m[2]}</span>
    </>
  )
}

/**
 * The name set between two thin gold rules and diamonds, with the slogan under it.
 * The ornaments are drawn in CSS, not typed as characters.
 */
export function BrandLockup({ size = 'md', slogan = true }: { size?: 'md' | 'lg'; slogan?: boolean }) {
  return (
    <div className={`brand-lockup${size === 'lg' ? ' is-lg' : ''}`}>
      <div className="brand-lockup-name">
        <i className="brand-rule is-start" aria-hidden />
        <i className="brand-diamond" aria-hidden />
        <span>
          <BrandName />
        </span>
        <i className="brand-diamond" aria-hidden />
        <i className="brand-rule is-end" aria-hidden />
      </div>
      {slogan && (
        <div className="brand-lockup-tag">
          {PLATFORM_TAGLINE.map((part, i) => {
            const [num, ...rest] = part.split(' ')
            return (
              <span key={part}>
                {i > 0 && <i aria-hidden />}
                <b className="num">{num}</b> {rest.join(' ')}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** The supplied logo mark. Always the real file, never a substitute icon. */
export function Logo({ size = 36, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="logo">
      <img src={asset(LOGO_FILE)} alt="" width={Math.round(size * 1.54)} height={size} style={{ height: size, width: 'auto' }} />
      {withName && (
        <span className="logo-name">
          <BrandName />
        </span>
      )}
    </span>
  )
}

export function Avatar({
  src,
  name,
  size = 44,
  ring = false,
}: {
  src: string
  name: string
  size?: number
  ring?: boolean
}) {
  return (
    <span className={`avatar${ring ? ' avatar-ring' : ''}`} style={{ '--size': `${size}px` } as CSSProperties}>
      <img src={asset(src)} alt={name} width={size} height={size} loading="lazy" decoding="async" />
    </span>
  )
}

export function Photo({
  src,
  alt,
  ratio = '3 / 2',
  className = '',
  eager = false,
  children,
}: {
  src?: string
  alt: string
  ratio?: string
  className?: string
  eager?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`photo ${className}`} style={{ aspectRatio: ratio }}>
      {src && (
        <img
          src={asset(src)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Back to the page the visitor was on before. When there is no history inside
 * the site (the page was opened directly), it goes to `fallback` instead.
 */
export function BackButton({
  fallback = '/app',
  label = 'חזרה',
  className = '',
}: {
  fallback?: string
  label?: string
  className?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const hasHistory = location.key !== 'default'
  return (
    <button
      type="button"
      className={`back-btn ${className}`}
      aria-label="חזרה לדף הקודם"
      onClick={() => (hasHistory ? navigate(-1) : navigate(fallback))}
    >
      <ArrowRight />
      <span>{label}</span>
    </button>
  )
}

export function DemoTag({ fixed = false }: { fixed?: boolean }) {
  return <span className={`demo-tag${fixed ? ' demo-tag-fixed' : ''}`}>נתוני דמו</span>
}

/**
 * Scroll reveal: one easing family and rhythm for the whole product.
 * A plain CSS transition (opacity + transform) switched on when the element
 * nears the screen, so scrolling stays smooth on phones.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'article'
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -60px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  const Comp = as as 'div'
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal${shown ? ' is-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Comp>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  wide = false,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  wide?: boolean
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            className={`modal${wide ? ' modal-wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {title && (
              <div className="modal-head">
                <div>
                  <h2>{title}</h2>
                  {subtitle && <p>{subtitle}</p>}
                </div>
                <button className="icon-btn" onClick={onClose} aria-label="סגירה">
                  <X />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Toaster() {
  const { toastMessage } = useStore()
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            className="toast"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <Check />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </header>
  )
}
