import React from 'react'
import { sportSolidColor } from '../utils/colors'
import { formatTime, hasConflict, eventTimelinePosition, TIMELINE_START, TIMELINE_END, TIMELINE_RANGE } from '../utils/time'

// Hours to render on the ruler: 7 AM through 11 PM
const RULER_HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 7..23

function hourLabel(h) {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function hourLeftPercent(hour) {
  return (((hour * 60) - TIMELINE_START) / TIMELINE_RANGE) * 100
}

function EventBar({ event }) {
  const { left, width } = eventTimelinePosition(event)
  const conflict = hasConflict(event)
  const bgColor = sportSolidColor(event.sport)
  const tooltip = `${event.sport}\n${event.session_description || event.session_code || ''}\n${formatTime(event.start_time)} – ${formatTime(event.end_time)}`

  return (
    <div
      title={tooltip}
      style={{
        position: 'absolute',
        left,
        width,
        minWidth: '1%',
        top: '2px',
        bottom: '2px',
        backgroundColor: bgColor,
        opacity: 0.85,
      }}
      className={`rounded overflow-hidden flex items-center px-1 cursor-default ${
        conflict ? 'ring-2 ring-red-500' : ''
      }`}
    >
      <span
        className="text-white text-xs font-medium truncate leading-tight select-none"
        style={{ fontSize: '10px' }}
      >
        {event.sport}
      </span>
    </div>
  )
}

export default function TimelineView({ planAEvents, planBEvents, planAName, planBName, day }) {
  // Filter events to just this games_day
  const aEvents = (planAEvents || []).filter(e => String(e.games_day) === String(day))
  const bEvents = (planBEvents || []).filter(e => String(e.games_day) === String(day))

  return (
    <div className="relative overflow-x-auto bg-white rounded-xl border border-slate-200 p-4">
      {/* Time ruler */}
      <div className="flex items-end mb-1 ml-20 relative" style={{ height: '24px' }}>
        {RULER_HOURS.map(hour => {
          const leftPct = hourLeftPercent(hour)
          if (leftPct < 0 || leftPct > 100) return null
          return (
            <div
              key={hour}
              style={{ position: 'absolute', left: `${leftPct.toFixed(4)}%` }}
              className="flex flex-col items-center"
            >
              <span className="text-xs text-slate-400 leading-none whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>
                {hourLabel(hour)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Plan rows */}
      {[
        { name: planAName, eventsForRow: aEvents, key: 'a' },
        { name: planBName, eventsForRow: bEvents, key: 'b' },
      ].map(({ name, eventsForRow, key }) => (
        <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
          {/* Label */}
          <div className="w-20 shrink-0 text-xs font-medium text-slate-600 truncate text-right" title={name}>
            {name || '—'}
          </div>

          {/* Timeline bar */}
          <div className="flex-1 relative h-12 bg-slate-50 rounded border border-slate-100">
            {/* Hour gridlines */}
            {RULER_HOURS.map(hour => {
              const leftPct = hourLeftPercent(hour)
              if (leftPct <= 0 || leftPct >= 100) return null
              return (
                <div
                  key={hour}
                  style={{ position: 'absolute', left: `${leftPct.toFixed(4)}%`, top: 0, bottom: 0 }}
                  className="border-l border-slate-100"
                />
              )
            })}

            {/* Event bars */}
            {eventsForRow.map(event => (
              <EventBar key={event.id} event={event} />
            ))}

            {/* Empty state */}
            {eventsForRow.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-slate-300">No events</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
