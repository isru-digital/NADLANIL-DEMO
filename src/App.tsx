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

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="community" element={<Community />} />
          <Route path="brokers" element={<Brokers />} />
          <Route path="crm" element={<Crm />} />
          <Route path="builder" element={<Builder />} />
          <Route path="folder" element={<FolderPage />} />
        </Route>
        <Route path="/join" element={<Join />} />
        <Route path="/b/demo" element={<PublicPage />} />
        <Route path="/f/demo" element={<FolderPublic />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
