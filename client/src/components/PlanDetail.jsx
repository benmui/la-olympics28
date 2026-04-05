import React, { useEffect, useRef, useState } from 'react'
import { X, AlertTriangle, Ticket, Lock, ExternalLink } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import { sportColor } from '../utils/colors'
import { SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime, hasConflict, conflictCount } from '../utils/time'
import { formatEventDate } from '../utils/date'

export default function PlanDetail({ planId, events }) {
  const { removeEvent, updatePlanEvent, fetchPlanEvents } = usePlans()

  // Local mirror of tickets/purchased so inputs feel instant
  const [localData, setLocalData] = useState({})
  useEffect(() => {
    setLocalData(
      Object.fromEntries(events.map(e => [e.id, { tickets: e.tickets ?? '', purchased: !!e.purchased }]))
    )
  }, [events])

  const ticketsDebounceRef = useRef({})

  function handleTicketsChange(eventId, value) {
    setLocalData(prev => ({ ...prev, [eventId]: { ...prev[eventId], tickets: value } }))
    if (ticketsDebounceRef.current[eventId]) clearTimeout(ticketsDebounceRef.current[eventId])
    ticketsDebounceRef.current[eventId] = setTimeout(() => {
      updatePlanEvent(planId, eventId, { tickets: value === '' ? null : +value })
        .catch(err => console.error('Failed to save tickets:', err))
      delete ticketsDebounceRef.current[eventId]
    }, 500)
  }

  async function handlePurchasedChange(eventId, checked) {
    setLocalData(prev => ({ ...prev, [eventId]: { ...prev[eventId], purchased: checked } }))
    try {
      await updatePlanEvent(planId, eventId, { purchased: checked })
      await fetchPlanEvents(planId)
    } catch (err) {
      setLocalData(prev => ({ ...prev, [eventId]: { ...prev[eventId], purchased: !checked } }))
      console.error('Failed to update purchased status:', err)
    }
  }

  async function handleRemove(eventId) {
    try {
      await removeEvent(planId, eventId)
    } catch (err) {
      console.error('Failed to remove event:', err)
    }
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">No events in this plan yet. Browse events to add them.</p>
      </div>
    )
  }

  // Conflict summary
  const numConflicts = conflictCount(events)
  const conflictingEvents = events.filter(hasConflict)

  // Group conflicting events by games_day
  const conflictDayMap = {}
  for (const ev of conflictingEvents) {
    const key = ev.games_day
    if (!conflictDayMap[key]) conflictDayMap[key] = []
    conflictDayMap[key].push(ev)
  }
  const conflictDays = Object.keys(conflictDayMap).sort((a, b) => Number(a) - Number(b))

  // Group events by games_day
  const dayMap = {}
  for (const ev of events) {
    const key = ev.games_day
    if (!dayMap[key]) dayMap[key] = []
    dayMap[key].push(ev)
  }
  const sortedDays = Object.keys(dayMap).sort((a, b) => Number(a) - Number(b))

  // Build a lookup map for conflict resolution
  const eventById = {}
  for (const ev of events) {
    eventById[ev.id] = ev
  }

  return (
    <div>
      {/* Conflict summary banner */}
      {numConflicts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {numConflicts} event{numConflicts !== 1 ? 's' : ''} have timing conflicts
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {conflictDays.map(day => {
              const dayEvents = conflictDayMap[day]
              const date = dayEvents[0]?.date
              return (
                <li key={day} className="text-xs text-red-600 ml-5">
                  Day {day}{date ? ` · ${formatEventDate(date)}` : ''}: {dayEvents.map(e => e.session_description || e.session_code).join(', ')}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Events grouped by games_day */}
      {sortedDays.map(day => {
        const dayEvents = dayMap[day].slice().sort((a, b) => {
          if (!a.start_time) return 1
          if (!b.start_time) return -1
          return a.start_time.localeCompare(b.start_time)
        })
        const date = dayEvents[0]?.date

        return (
          <div key={day} className="mb-4">
            {/* Day header */}
            <div className="sticky top-[188px] z-10 bg-slate-100 rounded-lg px-3 py-2 mb-2 flex justify-between items-center shadow-sm">
              <span className="text-sm font-semibold text-slate-700">
                Day {day}{date ? ` · ${date}` : ''}
              </span>
              <span className="text-xs text-slate-500">
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Events */}
            {dayEvents.map(event => {
              const conflict = hasConflict(event)
              const sessionTypeClass =
                SESSION_TYPE_COLORS[event.session_type] ?? SESSION_TYPE_COLORS.default

              // Look up names of conflicting events
              const conflictNames = conflict
                ? (event.conflicts || [])
                    .map(cid => {
                      const ce = eventById[cid]
                      return ce ? (ce.session_description || ce.session_code || `Event ${cid}`) : `Event ${cid}`
                    })
                    .filter(Boolean)
                : []

              const local = localData[event.id] ?? { tickets: '', purchased: false }
              const isPurchased = !!local.purchased

              return (
                <div
                  key={event.id}
                  className={`mb-2 rounded-lg border overflow-hidden ${
                    isPurchased
                      ? 'border-green-400'
                      : conflict
                      ? 'border-red-400'
                      : 'border-slate-200'
                  }`}
                >
                  {/* ── Menu bar header ── */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 ${
                      isPurchased
                        ? 'bg-green-700'
                        : conflict
                        ? 'bg-red-800'
                        : 'bg-slate-700'
                    }`}
                  >
                    {/* Left: badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conflict && !isPurchased && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-300 shrink-0" />
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sportColor(event.sport)}`}>
                        {event.sport}
                      </span>
                      {event.session_type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sessionTypeClass}`}>
                          {event.session_type}
                        </span>
                      )}
                      {event.session_code && (
                        <span className="text-xs font-mono font-semibold bg-blue-500 text-white px-1.5 py-0.5 rounded">
                          {event.session_code}
                        </span>
                      )}
                      {isPurchased && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-medium">
                          Purchased
                        </span>
                      )}
                    </div>

                    {/* Right: remove / lock */}
                    {isPurchased ? (
                      <Lock className="w-4 h-4 text-green-300 shrink-0" title="Purchased — cannot remove" />
                    ) : (
                      <button
                        onClick={() => handleRemove(event.id)}
                        className="p-1 rounded text-slate-300 hover:bg-red-500 hover:text-white transition-colors shrink-0"
                        title="Remove from plan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* ── Card body ── */}
                  <div
                    className={`flex items-start gap-3 p-3 ${
                      isPurchased ? 'bg-green-50' : conflict ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    {/* Time column */}
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatTime(event.start_time)}
                      </p>
                      <p className="text-xs text-slate-500">
                        – {formatTime(event.end_time)}
                      </p>
                    </div>

                    {/* Middle: description + venue */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm text-slate-700 overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {event.session_description || event.session_code}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {event.venue}{event.zone ? ` · ${event.zone}` : ''}
                      </p>
                    </div>

                    {/* Right column: tickets + purchased toggle */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <Ticket className="w-3.5 h-3.5 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={local.tickets}
                          onChange={e => handleTicketsChange(event.id, e.target.value)}
                          placeholder="–"
                          className="w-12 text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </label>
                      <button
                        onClick={() => handlePurchasedChange(event.id, !isPurchased)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                          isPurchased ? 'bg-green-500' : 'bg-slate-200'
                        }`}
                        title={isPurchased ? 'Mark as not purchased' : 'Mark as purchased'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          isPurchased ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                      <span className={`text-xs -mt-1.5 ${isPurchased ? 'text-green-700 font-medium' : 'text-slate-400'}`}>
                        {isPurchased ? 'Purchased' : 'Purchased?'}
                      </span>
                    </div>

                    {/* Buy Tickets button */}
                    {event.session_code && (
                      <div className="px-3 pb-3">
                        <a
                          href={`https://tickets.la28.org/search/?affiliate=28T&searchterm=${encodeURIComponent(event.session_code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Buy Tickets
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Conflict detail */}
                  {conflict && conflictNames.length > 0 && (
                    <p className="text-xs text-red-500 mt-1 ml-3 pl-3 border-l-2 border-red-200">
                      Conflicts with: {conflictNames.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
