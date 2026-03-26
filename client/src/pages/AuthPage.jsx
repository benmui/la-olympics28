import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [activeTab, setActiveTab] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setUsername('')
    setPassword('')
    setError('')
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (activeTab === 'signin') {
        await login(username, password)
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.')
          setLoading(false)
          return
        }
        await register(username, password)
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="text-5xl font-bold text-slate-900 tracking-tight mb-1">LA28</div>
        <div className="text-slate-500 text-base mb-4">Schedule Planner</div>
        {/* Olympic rings simulation */}
        <div className="flex items-center justify-center gap-0">
          <span className="w-4 h-4 rounded-full bg-blue-500 inline-block border-2 border-blue-500" />
          <span className="w-4 h-4 rounded-full bg-yellow-400 inline-block border-2 border-yellow-400 -ml-1" />
          <span className="w-4 h-4 rounded-full bg-slate-900 inline-block border-2 border-slate-900 -ml-1" />
          <span className="w-4 h-4 rounded-full bg-green-500 inline-block border-2 border-green-500 -ml-1" />
          <span className="w-4 h-4 rounded-full bg-red-500 inline-block border-2 border-red-500 -ml-1" />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-sm w-full mx-auto p-8">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange('signin')}
            className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors ${
              activeTab === 'signin'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'register'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your username"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder={activeTab === 'register' ? 'At least 6 characters' : 'Enter your password'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-50"
            />
            {activeTab === 'register' && (
              <p className="mt-1 text-xs text-slate-400">Min 6 characters</p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? activeTab === 'signin'
                ? 'Signing in...'
                : 'Creating account...'
              : activeTab === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
