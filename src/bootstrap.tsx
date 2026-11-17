import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { StoreProvider } from './store'
import { PLATFORM_NAME } from './config'
import { siteOpen } from './config/construction'
import Construction from './construction/Construction'

/** Mounts the demo. Each look has its own entry file and passes its own home page. */
type Extra = {
  join?: ReactElement
  routes?: ReactNode
  appRoutes?: ReactNode
  overlay?: ReactNode
  switcher?: ReactNode
  appIndex?: ReactElement
  gate?: (id: 'builder' | 'folder', screen: ReactElement) => ReactElement
  appGuard?: (app: ReactElement) => ReactElement
}

export function start(home?: ReactElement, extra?: Extra) {
  // while the site is being upgraded, a visitor sees one page; Itzik's own browser sees the real site
  siteOpen().then((open) => (open ? mount(home, extra) : curtain()))
}

function curtain() {
  document.title = `${PLATFORM_NAME} | האתר בבנייה`
  ReactDOM.createRoot(document.getElementById('root')!).render(<Construction />)
}

function mount(home?: ReactElement, extra?: Extra) {
  document.title = `${PLATFORM_NAME} - הדבר הבא בעולם המתווכים`

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <MotionConfig reducedMotion="user">
          <StoreProvider>
            <App home={home} join={extra?.join} routes={extra?.routes} appRoutes={extra?.appRoutes} overlay={extra?.overlay} switcher={extra?.switcher} appIndex={extra?.appIndex} gate={extra?.gate} appGuard={extra?.appGuard} />
          </StoreProvider>
        </MotionConfig>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
