import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { PLATFORM_NAME, asset } from '../config'
import { useStore } from '../store'

export const EASE = [0.22, 1, 0.36, 1] as const

/** The supplied logo mark. Always the real file, never a substitute icon. */
export function Logo({ size = 36, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="logo">
      <img src={asset('logo.png')} alt="" width={Math.round(size * 1.54)} height={size} style={{ height: size, width: 'auto' }} />
      {withName && <span className="logo-name">{PLATFORM_NAME}</span>}
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

export function DemoTag({ fixed = false }: { fixed?: boolean }) {
  return <span className={`demo-tag${fixed ? ' demo-tag-fixed' : ''}`}>נתוני דמו</span>
}

/** Scroll reveal: one easing family and rhythm for the whole product. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'article'
}) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
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
