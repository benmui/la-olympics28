import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlansProvider } from './context/PlansContext'
import AuthPage from './pages/AuthPage'
import BrowsePage from './pages/BrowsePage'
import PlansPage from './pages/PlansPage'
import ComparePage from './pages/ComparePage'
import CalendarPage from './pages/CalendarPage'
import Header from './components/Header'

function Footer() {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    fetch('/api/meta')
      .then(r => r.ok ? r.json() : null)
      .then(data => setMeta(data))
      .catch(() => {})
  }, [])

  if (!meta?.version) return null

  return (
    <footer className="mt-12 border-t border-slate-200 py-4 text-center text-xs text-slate-400">
      Schedule data: {meta.source_file ?? `${meta.version}`} · Imported {meta.imported_on}
    </footer>
  )
}

function MainApp() {
  const [tab, setTab] = useState('browse')
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header tab={tab} onTabChange={setTab} />
      <main className="flex-1 max-w-screen-xl mx-auto px-4 py-8 w-full">
        {tab === 'browse' && <BrowsePage />}
        {tab === 'plans' && <PlansPage />}
        {tab === 'compare' && <ComparePage />}
        {tab === 'calendar' && <CalendarPage />}
      </main>
      <Footer />
    </div>
  )
}

function AppContent() {
  const { user } = useAuth()
  if (!user) return <AuthPage />
  return <PlansProvider><MainApp /></PlansProvider>
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
