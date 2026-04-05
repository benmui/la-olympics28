import React, { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import { sportColor, SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime } from '../utils/time'

function ticketUrl(sessionCode) {
  return `https://tickets.la28.org/search/?affiliate=28T&searchterm=${encodeURIComponent(sessionCode)}`
}

export default function EventCard({ event }) {
  const { activePlanId, isEventInPlan, addEvent, removeEvent } = usePlans()
  const [actionState, setActionState] = useState('idle') // 'idle' | 'loading' | 'error'

  const inPlan = activePlanId ? isEventInPlan(activePlanId, event.id) : false
  const sessionTypeClass =
    SESSION_TYPE_COLORS[event.session_type] ?? SESSION_TYPE_COLORS.default

  async function handleAdd() {
    if (!activePlanId || actionState === 'loading') return
    setActionState('loading')
    try {
      await addEvent(activePlanId, event.id)
      setActionState('idle')
    } catch {
      setActionState('error')
      setTimeout(() => setActionState('idle'), 2000)
    }
  }

  async function handleRemove() {
    if (!activePlanId || actionState === 'loading') return
    setActionState('loading')
    try {
      await removeEvent(activePlanId, event.id)
      setActionState('idle')
    } catch {
      setActionState('error')
      setTimeout(() => setActionState('idle'), 2000)
    }
  }

  const cardBorder = inPlan
    ? 'border border-slate-200 border-l-4 border-l-blue-400'
    : 'border border-slate-200'

  return (
    <div
      className={`bg-white shadow-sm rounded-xl p-4 hover:shadow-md transition-shadow ${cardBorder}`}
    >
      {/* Top row: sport badge + session type badge */}
      <div className="flex items-center justify-between gap-2">
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

      {/* Session description */}
      <p
        className="mt-2 text-sm text-slate-700 font-medium overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {event.session_description || event.session_code}
      </p>

      {/* Divider */}
      <div className="mt-3 border-t border-slate-100" />

      {/* Bottom info row */}
      <div className="mt-2 flex justify-between items-end">
        <div>
          <p className="text-xs text-slate-500">
            Day {event.games_day} · {event.date}
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-600 font-medium">{event.venue}</p>
          <p className="text-xs text-slate-400">{event.zone}</p>
          {event.session_code && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">{event.session_code}</p>
          )}
        </div>
      </div>

      {/* Buy Tickets link */}
      {event.session_code && (
        <div className="mt-3">
          <a
            href={ticketUrl(event.session_code)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buy Tickets
          </a>
        </div>
      )}

      {/* Add / Remove button */}
      <div className="mt-2">
        {!activePlanId ? (
          <button
            disabled
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 cursor-default"
          >
            Select a plan to add events
          </button>
        ) : actionState === 'error' ? (
          <button
            disabled
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 cursor-default"
          >
            Something went wrong — try again
          </button>
        ) : inPlan ? (
          <button
            onClick={handleRemove}
            disabled={actionState === 'loading'}
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              bg-green-50 text-green-700 border border-green-200
              hover:bg-red-50 hover:text-red-600 hover:border-red-200
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionState === 'loading' ? 'Removing…' : '✓ Added to plan'}
          </button>
        ) : (
          <button
            onClick={handleAdd}
            disabled={actionState === 'loading'}
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              bg-blue-50 text-blue-700 border border-blue-200
              hover:bg-blue-100
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionState === 'loading' ? 'Adding…' : 'Add to Plan'}
          </button>
        )}
      </div>
    </div>
  )
}
