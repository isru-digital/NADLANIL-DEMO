import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { folder } from '../data/demo'
import { DemoTag } from '../components/ui'
import FolderView from '../components/FolderView'
import '../styles/public.css'

/** The folder as the client sees it, full screen: /f/demo */
export default function FolderPublic() {
  useEffect(() => {
    const prev = document.title
    document.title = `תיק נכסים - ${folder.client}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="public">
      <FolderView />
      <div className="public-bar" role="region" aria-label="סרגל הדמו">
        <DemoTag />
        <Link to="/app/folder" className="public-edit public-edit-always">
          <ArrowRight />
          <span>חזרה למערכת</span>
        </Link>
      </div>
    </div>
  )
}
