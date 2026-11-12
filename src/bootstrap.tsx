import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { StoreProvider } from './store'
import { PLATFORM_NAME } from './config'

/** Mounts the demo. Each look has its own entry file and passes its own home page. */
type Extra = {
  join?: ReactElement
  routes?: ReactNode
  appRoutes?: ReactNode
  overlay?: ReactNode
  switcher?: ReactNode
  appIndex?: ReactElement
  gate?: (id: 'builder' | 'folder', screen: ReactElement) => ReactElement
}

export function start(home?: ReactElement, extra?: Extra) {
  document.title = `${PLATFORM_NAME} - הדבר הבא בעולם המתווכים`

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <MotionConfig reducedMotion="user">
          <StoreProvider>
            <App home={home} join={extra?.join} routes={extra?.routes} appRoutes={extra?.appRoutes} overlay={extra?.overlay} switcher={extra?.switcher} appIndex={extra?.appIndex} gate={extra?.gate} />
          </StoreProvider>
        </MotionConfig>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
