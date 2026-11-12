import type { ReactElement, ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layout/AppShell'
import { Toaster } from './components/ui'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Community from './pages/Community'
import Brokers from './pages/Brokers'
import Crm from './pages/Crm'
import Builder from './pages/Builder'
import FolderPage from './pages/FolderPage'
import PublicPage from './pages/PublicPage'
import FolderPublic from './pages/FolderPublic'
import Join from './pages/Join'
import VersionSwitch from './components/VersionSwitch'

type Props = {
  home?: ReactElement
  join?: ReactElement
  routes?: ReactNode
  appRoutes?: ReactNode
  overlay?: ReactNode
  switcher?: ReactNode
  /** the first screen inside the app, in place of the dashboard */
  appIndex?: ReactElement
  /** wraps the landing page builder and the folder, so a look can close them to some members */
  gate?: (id: 'builder' | 'folder', screen: ReactElement) => ReactElement
}

export default function App({ home, join, routes, appRoutes, overlay, switcher, appIndex, gate }: Props) {
  return (
    <>
      <Routes>
        <Route path="/" element={home ?? <Home />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={appIndex ?? <Dashboard />} />
          <Route path="community" element={<Community />} />
          <Route path="brokers" element={<Brokers />} />
          <Route path="crm" element={<Crm />} />
          <Route path="builder" element={gate ? gate('builder', <Builder />) : <Builder />} />
          <Route path="folder" element={gate ? gate('folder', <FolderPage />) : <FolderPage />} />
          {appRoutes}
        </Route>
        <Route path="/join" element={join ?? <Join />} />
        <Route path="/b/demo" element={<PublicPage />} />
        <Route path="/f/demo" element={<FolderPublic />} />
        {routes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      {switcher ?? <VersionSwitch />}
      {overlay}
    </>
  )
}
