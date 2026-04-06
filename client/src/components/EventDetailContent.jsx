import React from 'react'
import { sportColor, SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime } from '../utils/time'
import { formatEventDate } from '../utils/date'

/**
 * Shared event information display used across Browse (card), Calendar (modal), etc.
 *
 * Props:
 *   event       — the event object
 *   compact     — true for the Browse grid card (tighter spacing, clamped description)
 */
export default function EventDetailContent({ event, compact = false }) {
  const sessionTypeClass = SESSION_TYPE_COLORS[event.session_type] ?? SESSION_TYPE_COLORS.default

  return (
    <div>
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sportColor(event.sport)}`}>
          {event.sport}
        </span>
        {event.session_type && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${sessionTypeClass}`}>
            {event.session_type}
          </span>
        )}
        {event.session_code && (
          <span className="text-xs font-mono font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
            {event.session_code}
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className={`mt-2 text-sm text-slate-700 font-medium ${compact ? 'overflow-hidden' : ''}`}
        style={compact ? {
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } : undefined}
      >
        {event.session_description || event.session_code}
      </p>

      {compact ? (
        /* Compact layout: divider + two-column bottom row */
        <>
          <div className="mt-3 border-t border-slate-100" />
          <div className="mt-2 flex justify-between items-end">
            <div>
              <p className="text-xs text-slate-500">Day {event.games_day} · {formatEventDate(event.date)}</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatTime(event.start_time)} – {formatTime(event.end_time)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 font-medium">{event.venue}</p>
              <p className="text-xs text-slate-400">{event.zone}</p>
            </div>
          </div>
        </>
      ) : (
        /* Full layout: stacked rows */
        <div className="mt-3 space-y-1">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Day {event.games_day}</span>
            {event.date ? ` · ${formatEventDate(event.date)}` : ''}
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-medium">{event.venue}</span>
            {event.zone ? ` · ${event.zone}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
