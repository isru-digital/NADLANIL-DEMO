import { useEffect } from 'react'
import { folder } from '../data/demo'
import { BackButton, DemoTag } from '../components/ui'
import FolderView from '../components/FolderView'
import HomeStrip from '../components/HomeStrip'
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
      <HomeStrip />
      <FolderView />
      <div className="public-bar" role="region" aria-label="סרגל הדמו">
        <BackButton fallback="/app/folder" className="public-back" />
        <DemoTag />
      </div>
    </div>
  )
}
