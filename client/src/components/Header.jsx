import { useAuth } from '../context/AuthContext'
import { usePlans } from '../context/PlansContext'
import { LogOut } from 'lucide-react'

const TABS = [
  { id: 'browse', label: 'Browse Events' },
  { id: 'plans', label: 'My Plans' },
  { id: 'compare', label: 'Compare Plans' },
  { id: 'calendar', label: 'Calendar' },
]

export default function Header({ tab, onTabChange }) {
  const { user, logout } = useAuth()
  const { plans, activePlanId, activePlan, setActivePlanId, createPlan } = usePlans()

  const handlePlanChange = async (e) => {
    const value = e.target.value
    if (value === 'new') {
      const name = window.prompt('Enter a name for your new plan:')
      if (name && name.trim()) {
        await createPlan(name.trim())
      }
      // Reset the select back to the current active plan
      e.target.value = activePlanId ?? ''
    } else {
      setActivePlanId(Number(value))
    }
  }

  return (
    <header className="bg-slate-900 sticky top-0 z-30">
      {/* Top row */}
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: branding */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-base tracking-tight">LA28</span>
          <span className="text-slate-600 select-none">/</span>
          <span className="text-slate-400 text-sm">Schedule Planner</span>
        </div>

        {/* Right: plan selector + username chip + logout */}
        <div className="flex items-center gap-3">
          {/* Plan selector */}
          <div className="flex items-center gap-1.5">
            {activePlan && (
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block flex-shrink-0" />
            )}
            <span className="text-slate-400 text-xs">Plan:</span>
            <select
              className="bg-slate-700 text-white border-0 rounded-md text-sm px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={activePlanId ?? ''}
              onChange={handlePlanChange}
            >
              {plans.length === 0 ? (
                <option value="" disabled>No plans yet</option>
              ) : (
                plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))
              )}
              <option value="new">＋ New Plan</option>
            </select>
          </div>

          {/* Username chip */}
          <div className="bg-slate-700 rounded-full px-3 py-1 text-sm text-slate-300 select-none">
            {user?.username}
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Bottom row: tab navigation */}
      <div className="bg-slate-800">
        <div className="max-w-screen-xl mx-auto px-4">
          <nav className="flex items-center gap-1 py-1.5">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  tab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
