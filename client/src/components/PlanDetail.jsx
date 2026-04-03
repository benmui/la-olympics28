import React from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import { sportColor } from '../utils/colors'
import { SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime, hasConflict, conflictCount } from '../utils/time'

export default function PlanDetail({ planId, events }) {
  const { removeEvent } = usePlans()

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
                  Day {day}{date ? ` · ${date}` : ''}: {dayEvents.map(e => e.session_description || e.session_code).join(', ')}
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
            <div className="bg-slate-100 rounded-lg px-3 py-2 mb-2 flex justify-between items-center">
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

              return (
                <div key={event.id} className="mb-2">
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      conflict
                        ? 'bg-red-50 border-red-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Conflict icon */}
                    {conflict && (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    )}

                    {/* Time column */}
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatTime(event.start_time)}
                      </p>
                      <p className="text-xs text-slate-500">
                        – {formatTime(event.end_time)}
                      </p>
                      {event.session_code && (
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          {event.session_code}
                        </p>
                      )}
                    </div>

                    {/* Middle: details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${sportColor(event.sport)}`}
                        >
                          {event.sport}
                        </span>
                        {event.session_type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sessionTypeClass}`}>
                            {event.session_type}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm text-slate-700 mt-1 overflow-hidden"
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

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(event.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      title="Remove from plan"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
