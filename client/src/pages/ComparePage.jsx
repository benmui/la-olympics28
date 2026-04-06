import React, { useState, useEffect } from 'react'
import { usePlans } from '../context/PlansContext'
import { api } from '../api'
import TimelineView from '../components/TimelineView'
import { sportColor } from '../utils/colors'
import { SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime, conflictCount, hasConflict } from '../utils/time'
import { formatEventDate } from '../utils/date'

export default function ComparePage() {
  const { plans } = usePlans()

  const [planAId, setPlanAId] = useState('')
  const [planBId, setPlanBId] = useState('')
  const [planAEvents, setPlanAEvents] = useState([])
  const [planBEvents, setPlanBEvents] = useState([])
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  // Fetch plan A events when planAId changes
  useEffect(() => {
    if (!planAId) { setPlanAEvents([]); return }
    setLoadingA(true)
    api.getPlanEvents(Number(planAId))
      .then(data => setPlanAEvents(data || []))
      .catch(err => { console.error('Failed to fetch plan A events:', err); setPlanAEvents([]) })
      .finally(() => setLoadingA(false))
  }, [planAId])

  // Fetch plan B events when planBId changes
  useEffect(() => {
    if (!planBId) { setPlanBEvents([]); return }
    setLoadingB(true)
    api.getPlanEvents(Number(planBId))
      .then(data => setPlanBEvents(data || []))
      .catch(err => { console.error('Failed to fetch plan B events:', err); setPlanBEvents([]) })
      .finally(() => setLoadingB(false))
  }, [planBId])

  // Compute all unique games_days from both plans, sorted numerically
  const allDays = Array.from(
    new Set([...planAEvents, ...planBEvents].map(e => e.games_day))
  ).sort((a, b) => Number(a) - Number(b))

  // Auto-select the first day when events load
  useEffect(() => {
    if (allDays.length > 0 && (selectedDay === null || !allDays.includes(selectedDay))) {
      setSelectedDay(allDays[0])
    }
    if (allDays.length === 0) {
      setSelectedDay(null)
    }
  }, [planAId, planBId, planAEvents.length, planBEvents.length]) // eslint-disable-line

  // Helpers to get the date string for a games_day
  function getDateForDay(day) {
    const ev = [...planAEvents, ...planBEvents].find(e => e.games_day === day)
    return ev?.date ?? ''
  }

  const planAInfo = plans.find(p => p.id === Number(planAId))
  const planBInfo = plans.find(p => p.id === Number(planBId))

  const planAName = planAInfo?.name ?? 'Plan A'
  const planBName = planBInfo?.name ?? 'Plan B'

  const planAConflicts = conflictCount(planAEvents)
  const planBConflicts = conflictCount(planBEvents)

  const planAUniqueSports = new Set(planAEvents.map(e => e.sport)).size
  const planBUniqueSports = new Set(planBEvents.map(e => e.sport)).size

  const planADays = new Set(planAEvents.map(e => e.games_day)).size
  const planBDays = new Set(planBEvents.map(e => e.games_day)).size

  // Filtered events for selected day
  const dayAEvents = selectedDay != null
    ? planAEvents.filter(e => String(e.games_day) === String(selectedDay))
    : []
  const dayBEvents = selectedDay != null
    ? planBEvents.filter(e => String(e.games_day) === String(selectedDay))
    : []

  const bothSelected = planAId && planBId

  return (
    <div>
      {/* Heading */}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Compare Plans</h1>

      {/* Plan selectors */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <PlanSelector
          label="Plan A"
          value={planAId}
          onChange={v => { setPlanAId(v); setSelectedDay(null) }}
          plans={plans}
          excludeId={planBId ? Number(planBId) : null}
        />
        <div className="flex items-center justify-center text-slate-400 font-bold text-lg select-none">
          vs
        </div>
        <PlanSelector
          label="Plan B"
          value={planBId}
          onChange={v => { setPlanBId(v); setSelectedDay(null) }}
          plans={plans}
          excludeId={planAId ? Number(planAId) : null}
        />
      </div>

      {/* Hint if fewer than 2 plans */}
      {plans.length < 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-6">
          Create at least 2 plans to compare them.
        </div>
      )}

      {/* Stats comparison */}
      {bothSelected && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            name={planAName}
            events={planAEvents.length}
            conflicts={planAConflicts}
            sports={planAUniqueSports}
            days={planADays}
            loading={loadingA}
            conflictVariant={
              planAConflicts < planBConflicts ? 'better' :
              planAConflicts > planBConflicts ? 'worse' : 'neutral'
            }
          />
          <StatCard
            name={planBName}
            events={planBEvents.length}
            conflicts={planBConflicts}
            sports={planBUniqueSports}
            days={planBDays}
            loading={loadingB}
            conflictVariant={
              planBConflicts < planAConflicts ? 'better' :
              planBConflicts > planAConflicts ? 'worse' : 'neutral'
            }
          />
        </div>
      )}

      {/* Day selector */}
      {bothSelected && allDays.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allDays.map(day => {
              const date = getDateForDay(day)
              const isActive = String(selectedDay) === String(day)
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Day {day}{date ? ` · ${formatEventDate(date)}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {bothSelected && selectedDay != null && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">
            Timeline — Day {selectedDay}
            {getDateForDay(selectedDay) ? ` · ${formatEventDate(getDateForDay(selectedDay))}` : ''}
          </h3>
          <TimelineView
            planAEvents={planAEvents}
            planBEvents={planBEvents}
            planAName={planAName}
            planBName={planBName}
            day={selectedDay}
          />
        </div>
      )}

      {/* Side-by-side event lists for selected day */}
      {bothSelected && selectedDay != null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DayEventList
            name={planAName}
            events={dayAEvents}
            loading={loadingA}
            colorVariant="a"
          />
          <DayEventList
            name={planBName}
            events={dayBEvents}
            loading={loadingB}
            colorVariant="b"
          />
        </div>
      )}

      {/* Empty / no selection states */}
      {!planAId && !planBId && plans.length >= 2 && (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Select two plans above to compare them.
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function PlanSelector({ label, value, onChange, plans, excludeId }) {
  return (
    <div className="flex-1">
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a plan…</option>
        {plans
          .filter(p => p.id !== excludeId)
          .map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
      </select>
    </div>
  )
}

function StatCard({ name, events, conflicts, sports, days, loading, conflictVariant }) {
  const conflictClass =
    conflictVariant === 'better'
      ? 'text-green-600 font-semibold'
      : conflictVariant === 'worse'
      ? 'text-red-600 font-semibold'
      : 'text-slate-700'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-sm font-bold text-slate-800 mb-3 truncate">{name}</h3>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : (
        <dl className="space-y-1.5">
          <StatRow label="Events" value={events} className="text-slate-700" />
          <StatRow label="Conflicts" value={conflicts} className={conflictClass} />
          <StatRow label="Unique sports" value={sports} className="text-slate-700" />
          <StatRow label="Days covered" value={days} className="text-slate-700" />
        </dl>
      )}
    </div>
  )
}

function StatRow({ label, value, className = '' }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-sm ${className}`}>{value}</dd>
    </div>
  )
}

function DayEventList({ name, events, loading, colorVariant }) {
  const accentClass = colorVariant === 'a' ? 'border-blue-400' : 'border-purple-400'

  const sorted = [...events].sort((a, b) => {
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return a.start_time.localeCompare(b.start_time)
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h3 className={`text-sm font-bold text-slate-800 mb-3 pl-2 border-l-4 ${accentClass}`}>
        {name}
      </h3>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No events on this day.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map(event => {
            const conflict = hasConflict(event)
            const sessionTypeClass =
              SESSION_TYPE_COLORS[event.session_type] ?? SESSION_TYPE_COLORS.default

            return (
              <li
                key={event.id}
                className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                  conflict
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium text-xs ${sportColor(event.sport)}`}>
                      {event.sport}
                    </span>
                    {event.session_type && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${sessionTypeClass}`}>
                        {event.session_type}
                      </span>
                    )}
                    {conflict && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        Conflict
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 font-medium truncate">
                    {event.session_description || event.session_code}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {formatTime(event.start_time)} – {formatTime(event.end_time)}
                  </p>
                  <p className="text-slate-400">
                    {event.venue}{event.zone ? ` · ${event.zone}` : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
