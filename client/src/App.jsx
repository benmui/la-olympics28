import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlansProvider } from './context/PlansContext'
import AuthPage from './pages/AuthPage'
import BrowsePage from './pages/BrowsePage'
import PlansPage from './pages/PlansPage'
import ComparePage from './pages/ComparePage'
import Header from './components/Header'

function MainApp() {
  const [tab, setTab] = useState('browse')
  return (
    <div className="min-h-screen bg-slate-50">
      <Header tab={tab} onTabChange={setTab} />
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {tab === 'browse' && <BrowsePage />}
        {tab === 'plans' && <PlansPage />}
        {tab === 'compare' && <ComparePage />}
      </main>
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
