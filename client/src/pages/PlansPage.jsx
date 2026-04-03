import React, { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, X, Download } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import PlanDetail from '../components/PlanDetail'
import { conflictCount } from '../utils/time'

export default function PlansPage() {
  const {
    plans,
    activePlanId,
    setActivePlanId,
    planEvents,
    fetchPlanEvents,
    createPlan,
    deletePlan,
    updatePlan,
  } = usePlans()

  // New plan inline form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit state: { [planId]: { name: string } }
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const newInputRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    if (showNewForm && newInputRef.current) {
      newInputRef.current.focus()
    }
  }, [showNewForm])

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  // Fetch events for the active plan whenever it changes
  useEffect(() => {
    if (activePlanId) {
      fetchPlanEvents(activePlanId)
    }
  }, [activePlanId, fetchPlanEvents])

  async function handleCreatePlan() {
    const name = newPlanName.trim()
    if (!name) return
    setCreating(true)
    try {
      await createPlan(name)
      setNewPlanName('')
      setShowNewForm(false)
    } catch (err) {
      console.error('Create plan failed:', err)
    } finally {
      setCreating(false)
    }
  }

  function handleNewKeyDown(e) {
    if (e.key === 'Enter') handleCreatePlan()
    if (e.key === 'Escape') {
      setShowNewForm(false)
      setNewPlanName('')
    }
  }

  function startEdit(plan) {
    setEditingId(plan.id)
    setEditName(plan.name)
    setConfirmDeleteId(null)
  }

  async function saveEdit(planId) {
    const name = editName.trim()
    if (!name) return
    try {
      await updatePlan(planId, name)
    } catch (err) {
      console.error('Update plan failed:', err)
    } finally {
      setEditingId(null)
    }
  }

  function handleEditKeyDown(e, planId) {
    if (e.key === 'Enter') saveEdit(planId)
    if (e.key === 'Escape') setEditingId(null)
  }

  async function handleDelete(planId) {
    try {
      await deletePlan(planId)
    } catch (err) {
      console.error('Delete plan failed:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Stats for the active plan
  const activeEvents = activePlanId ? (planEvents[activePlanId] || []) : []
  const uniqueSports = new Set(activeEvents.map(e => e.sport)).size
  const uniqueDays = new Set(activeEvents.map(e => e.games_day)).size
  const conflicts = conflictCount(activeEvents)

  const activePlan = plans.find(p => p.id === activePlanId) ?? null

  function exportCSV() {
    const headers = ['Day', 'Date', 'Start Time', 'End Time', 'Session Code', 'Sport', 'Session Description', 'Session Type', 'Venue', 'Zone']
    const rows = activeEvents
      .slice()
      .sort((a, b) => {
        if (Number(a.games_day) !== Number(b.games_day)) return Number(a.games_day) - Number(b.games_day)
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
      .map(e => [e.games_day, e.date, e.start_time, e.end_time, e.session_code, e.sport, e.session_description, e.session_type, e.venue, e.zone]
        .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
      )
    const csv = [headers.map(h => `"${h}"`), ...rows].map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${(activePlan?.name ?? 'plan').replace(/[^a-z0-9]/gi, '_')}_schedule.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* ── Left panel: plans list ── */}
      <div className="w-full md:w-72 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-4 self-start">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">My Plans</h2>
          <button
            onClick={() => {
              setShowNewForm(true)
              setEditingId(null)
              setConfirmDeleteId(null)
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>

        {/* New plan form */}
        {showNewForm && (
          <div className="mb-3">
            <input
              ref={newInputRef}
              type="text"
              value={newPlanName}
              onChange={e => setNewPlanName(e.target.value)}
              onKeyDown={handleNewKeyDown}
              placeholder="Plan name..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreatePlan}
                disabled={creating || !newPlanName.trim()}
                className="flex-1 text-xs font-medium bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewPlanName('') }}
                className="flex-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plans list */}
        {plans.length === 0 && !showNewForm && (
          <p className="text-xs text-slate-400 text-center py-4">No plans yet. Create one!</p>
        )}

        <ul className="space-y-1">
          {plans.map(plan => {
            const isActive = plan.id === activePlanId
            const isEditing = editingId === plan.id
            const isConfirmingDelete = confirmDeleteId === plan.id
            const eventCount = planEvents[plan.id]?.length ?? 0

            return (
              <li key={plan.id}>
                {isEditing ? (
                  /* Edit mode */
                  <div className="px-3 py-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => handleEditKeyDown(e, plan.id)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 mb-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveEdit(plan.id)}
                        disabled={!editName.trim()}
                        className="flex items-center gap-1 text-xs font-medium bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 rounded px-2 py-1 hover:bg-slate-200 transition-colors"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : isConfirmingDelete ? (
                  /* Confirm delete */
                  <div className="px-3 py-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-700 font-medium mb-1.5">Delete "{plan.name}"?</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="flex-1 text-xs font-medium bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 text-xs font-medium bg-slate-100 text-slate-600 rounded px-2 py-1 hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal view */
                  <div
                    onClick={() => setActivePlanId(plan.id)}
                    className={`flex items-center gap-2 cursor-pointer rounded-lg border-l-4 transition-colors group ${
                      isActive
                        ? 'bg-blue-50 border-blue-500 px-3 py-2.5 rounded-r-lg'
                        : 'border-transparent px-3 py-2.5 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{plan.name}</p>
                      <p className="text-xs text-slate-500">{eventCount} event{eventCount !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Action icons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(plan) }}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Rename plan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(plan.id); setEditingId(null) }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Right panel: plan detail ── */}
      <div className="flex-1 min-w-0">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="text-sm">Create your first plan to start building your schedule.</p>
          </div>
        ) : !activePlanId ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="text-sm">Select a plan to view its events.</p>
          </div>
        ) : (
          <div>
            {/* Plan name heading */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-800">
                {activePlan?.name ?? 'Plan'}
              </h2>
              {activeEvents.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
                  title="Export to CSV (Google Sheets compatible)"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 mb-4">
              <StatChip label={`${activeEvents.length} event${activeEvents.length !== 1 ? 's' : ''}`} />
              <StatChip label={`${uniqueSports} sport${uniqueSports !== 1 ? 's' : ''}`} />
              <StatChip label={`${uniqueDays} day${uniqueDays !== 1 ? 's' : ''} with events`} />
              <StatChip
                label={`${conflicts} conflict${conflicts !== 1 ? 's' : ''}`}
                variant={conflicts > 0 ? 'danger' : 'default'}
              />
            </div>

            <PlanDetail
              planId={activePlanId}
              events={planEvents[activePlanId] || []}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StatChip({ label, variant = 'default' }) {
  const variantClass =
    variant === 'danger'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${variantClass}`}>
      {label}
    </span>
  )
}
