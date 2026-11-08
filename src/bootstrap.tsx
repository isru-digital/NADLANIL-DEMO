import React from 'react'
import type { ReactElement } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { StoreProvider } from './store'
import { PLATFORM_NAME } from './config'

/** Mounts the demo. Each look has its own entry file and passes its own home page. */
export function start(home?: ReactElement) {
  document.title = `${PLATFORM_NAME} - הדבר הבא בעולם המתווכים`

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <MotionConfig reducedMotion="user">
          <StoreProvider>
            <App home={home} />
          </StoreProvider>
        </MotionConfig>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
