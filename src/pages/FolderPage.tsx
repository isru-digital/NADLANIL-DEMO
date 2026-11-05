import { Link } from 'react-router-dom'
import { Copy, ExternalLink, Eye, Heart, Send } from 'lucide-react'
import { folder } from '../data/demo'
import { useStore } from '../store'
import { PageHead } from '../components/ui'
import FolderView from '../components/FolderView'

export default function FolderPage() {
  const { toast } = useStore()
  const url = `${window.location.origin}${import.meta.env.BASE_URL}f/demo`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast('קישור הפולדר הועתק')
    } catch {
      toast('לא ניתן להעתיק בדפדפן הזה')
    }
  }

  return (
    <>
      <PageHead
        eyebrow="פולדר דיגיטלי"
        title={`תיק נכסים - ${folder.client}`}
        subtitle="תיק ממותג שנשלח ללקוח בקישור אחד. הלקוח רואה את הנכסים, את ההערות שלך, ומסמן מה אהב."
      >
        <div className="folder-toolbar">
          <button className="btn btn-ghost" onClick={copy}>
            <Copy />
            העתקת קישור
          </button>
          <Link to="/f/demo" className="btn btn-gold">
            <ExternalLink />
            תצוגת לקוח
          </Link>
        </div>
      </PageHead>

      <div className="folder-stats">
        <div className="card">
          <Send />
          <div>
            <strong>נשלח ללקוח</strong>
            <span>אתמול, 18:40</span>
          </div>
        </div>
        <div className="card">
          <Eye />
          <div>
            <strong>
              <span className="num">3</span> צפיות
            </strong>
            <span>האחרונה לפני שעתיים</span>
          </div>
        </div>
        <div className="card">
          <Heart />
          <div>
            <strong>
              <span className="num">2</span> נכסים סומנו
            </strong>
            <span>הווילה ודופלקס הגג</span>
          </div>
        </div>
      </div>

      <div className="folder-frame">
        <FolderView />
      </div>
    </>
  )
}
