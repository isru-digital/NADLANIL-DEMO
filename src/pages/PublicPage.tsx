import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil } from 'lucide-react'
import { templates } from '../data/demo'
import type { TemplateId } from '../data/demo'
import { useStore } from '../store'
import { BackButton, DemoTag, EASE } from '../components/ui'
import LandingTemplate from '../templates/LandingTemplate'
import '../styles/public.css'

/** The published broker landing page, full screen: /b/demo */
export default function PublicPage() {
  const { builder, crm, toast, setBuilder } = useStore()
  const [params] = useSearchParams()
  const override = params.get('t') as TemplateId | null
  const template = templates.some((t) => t.id === override) ? override! : builder.template

  useEffect(() => {
    const prev = document.title
    document.title = `${builder.name} - ${builder.title}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [builder.name, builder.title])

  return (
    <div className="public">
      <motion.div
        key={template}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <LandingTemplate data={{ ...builder, template }} properties={crm} onAction={toast} />
      </motion.div>

      <div className="public-bar" role="region" aria-label="סרגל הדמו">
        <BackButton fallback="/app/builder" className="is-icon public-back" />
        <DemoTag />
        <div className="public-switch" role="group" aria-label="החלפת תבנית">
          {templates.map((t) => (
            <button key={t.id} aria-pressed={template === t.id} onClick={() => setBuilder({ template: t.id })}>
              {t.name}
            </button>
          ))}
        </div>
        <Link to="/app/builder" className="public-edit">
          <Pencil />
          <span>חזרה לעריכה</span>
        </Link>
      </div>
    </div>
  )
}
