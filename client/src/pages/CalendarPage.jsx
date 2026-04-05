import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import { formatTime } from '../utils/time'
import EventModal from '../components/EventModal'

// ── Date helpers ─────────────────────────────────────────────────────────────
// Games Day 0 = Friday, July 14, 2028
const DAY0 = new Date(2028, 6, 14)

function gamesDayToDate(gamesDay) {
  const d = new Date(DAY0)
  d.setDate(DAY0.getDate() + Number(gamesDay))
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatHour(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Week view config
const START_HOUR = 8   // 8 AM
const END_HOUR = 24    // midnight
const HOUR_HEIGHT = 64 // px per hour

// ── Event color ──────────────────────────────────────────────────────────────
function eventClasses(purchased) {
  return purchased
    ? 'bg-green-50 border-l-green-500 text-green-900'
    : 'bg-slate-100 border-l-slate-400 text-slate-700'
}

// ── Week View ────────────────────────────────────────────────────────────────
function WeekView({ events, weekStart, onEventClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Day header row */}
      <div
        className="grid border-b border-slate-200 bg-slate-50"
        style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
      >
        <div className="border-r border-slate-200" />
        {days.map((day, i) => (
          <div
            key={i}
            className={`text-center py-2 border-r border-slate-200 last:border-r-0 ${
              i === 0 || i === 6 ? 'bg-slate-100' : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {DAY_NAMES[day.getDay()]}
            </p>
            <p className="text-xl font-semibold text-slate-800 leading-tight">
              {day.getDate()}
            </p>
            <p className="text-xs text-slate-400">
              {MONTH_NAMES[day.getMonth()].slice(0, 3)}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto" style={{ maxHeight: '620px' }}>
        <div className="flex" style={{ minHeight: totalHeight }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 border-r border-slate-200 relative" style={{ minHeight: totalHeight }}>
            {hours.map(hour => (
              <div
                key={hour}
                className="absolute w-full border-b border-slate-100"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                {hour !== START_HOUR && (
                  <span className="absolute right-2 -top-2.5 text-xs text-slate-400 select-none">
                    {formatHour(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const dayEvents = events.filter(e =>
              isSameDay(gamesDayToDate(e.games_day), day)
            )
            return (
              <div
                key={i}
                className={`flex-1 relative border-r border-slate-200 last:border-r-0 ${
                  i === 0 || i === 6 ? 'bg-slate-50/60' : ''
                }`}
                style={{ minHeight: totalHeight }}
              >
                {/* Hour grid lines */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full border-b border-slate-100"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const startMin = timeToMinutes(event.start_time)
                  const endMin   = timeToMinutes(event.end_time) || startMin + 60
                  const clampStart = Math.max(startMin, START_HOUR * 60)
                  const clampEnd   = Math.min(endMin, END_HOUR * 60)
                  const top    = ((clampStart - START_HOUR * 60) / 60) * HOUR_HEIGHT
                  const height = Math.max(((clampEnd - clampStart) / 60) * HOUR_HEIGHT - 2, 22)
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 border-l-2 overflow-hidden cursor-pointer hover:brightness-95 transition-all ${eventClasses(event.purchased)}`}
                      style={{ top: top + 1, height }}
                      title={`${event.sport} · ${formatTime(event.start_time)}–${formatTime(event.end_time)} · ${event.venue}`}
                    >
                      <p className="text-xs font-semibold leading-tight truncate">{event.sport}</p>
                      {height > 38 && (
                        <p className="text-xs leading-tight truncate opacity-75">
                          {event.session_description || event.session_code}
                        </p>
                      )}
                      {height > 54 && (
                        <p className="text-xs leading-tight opacity-60">
                          {formatTime(event.start_time)}–{formatTime(event.end_time)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Month View ───────────────────────────────────────────────────────────────
function MonthView({ events, year, month, onEventClick }) {
  const firstDay  = new Date(year, month, 1)
  const lastDate  = new Date(year, month + 1, 0).getDate()
  const startPad  = firstDay.getDay()

  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Day name headers */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {DAY_NAMES.map(name => (
          <div
            key={name}
            className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide py-2 border-r border-slate-200 last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const date      = day ? new Date(year, month, day) : null
          const isWeekend = i % 7 === 0 || i % 7 === 6
          const dayEvents = date
            ? events.filter(e => isSameDay(gamesDayToDate(e.games_day), date))
            : []

          return (
            <div
              key={i}
              className={`min-h-[96px] p-1.5 border-r border-b border-slate-200 last:border-r-0 ${
                !day ? 'bg-slate-50/50' : isWeekend ? 'bg-slate-50' : 'bg-white'
              }`}
            >
              {day && (
                <>
                  <p className={`text-sm font-semibold mb-1 leading-none ${
                    dayEvents.length > 0 ? 'text-slate-800' : 'text-slate-300'
                  }`}>
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`text-xs rounded px-1 py-0.5 truncate border-l-2 cursor-pointer hover:brightness-95 transition-all ${eventClasses(event.purchased)}`}
                        title={`${event.sport} · ${formatTime(event.start_time)}–${formatTime(event.end_time)} · ${event.venue}`}
                      >
                        <span className="font-semibold">{formatTime(event.start_time)}</span>{' '}
                        {event.sport}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── CalendarPage ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { plans, planEvents, fetchPlanEvents, activePlanId } = usePlans()

  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [view, setView]         = useState('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(DAY0))
  const [monthYear, setMonthYear] = useState({ year: 2028, month: 6 }) // July 2028
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Default to the active plan
  useEffect(() => {
    if (activePlanId && !selectedPlanId) setSelectedPlanId(activePlanId)
  }, [activePlanId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch events when plan changes
  useEffect(() => {
    if (selectedPlanId) fetchPlanEvents(selectedPlanId)
  }, [selectedPlanId, fetchPlanEvents])

  const events = selectedPlanId ? (planEvents[selectedPlanId] || []) : []

  // Jump to the first event's week/month when a plan first loads
  const jumpedPlanRef = useRef(null)
  useEffect(() => {
    if (!events.length || selectedPlanId === jumpedPlanRef.current) return
    const sorted = [...events].sort((a, b) => Number(a.games_day) - Number(b.games_day))
    const firstDate = gamesDayToDate(sorted[0].games_day)
    setWeekStart(startOfWeek(firstDate))
    setMonthYear({ year: firstDate.getFullYear(), month: firstDate.getMonth() })
    jumpedPlanRef.current = selectedPlanId
  }, [events, selectedPlanId])

  // Navigation
  function prevWeek()  { setWeekStart(d => addDays(d, -7)) }
  function nextWeek()  { setWeekStart(d => addDays(d,  7)) }
  function prevMonth() {
    setMonthYear(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  }
  function nextMonth() {
    setMonthYear(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )
  }

  const weekEnd   = addDays(weekStart, 6)
  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${
    weekStart.getMonth() !== weekEnd.getMonth()
      ? MONTH_NAMES[weekEnd.getMonth()] + ' '
      : ''
  }${weekEnd.getDate()}, ${weekEnd.getFullYear()}`

  return (
    <div>
      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Plan selector */}
        <select
          value={selectedPlanId ?? ''}
          onChange={e => {
            const id = Number(e.target.value) || null
            setSelectedPlanId(id)
            jumpedPlanRef.current = null // allow re-jump for new plan
          }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
        >
          <option value="">Select a plan…</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Week / Month toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {['week', 'month'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors border-l first:border-l-0 border-slate-200 ${
                view === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Prev / label / Next */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={view === 'week' ? prevWeek : prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[220px] text-center">
            {view === 'week'
              ? weekLabel
              : `${MONTH_NAMES[monthYear.month]} ${monthYear.year}`}
          </span>
          <button
            onClick={view === 'week' ? nextWeek : nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-50 border-l-2 border-green-500" />
          Purchased
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border-l-2 border-slate-400" />
          Planned (not purchased)
        </span>
      </div>

      {/* ── Calendar ── */}
      {!selectedPlanId ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          Select a plan above to view its events on the calendar.
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          This plan has no events yet.
        </div>
      ) : view === 'week' ? (
        <WeekView events={events} weekStart={weekStart} onEventClick={setSelectedEvent} />
      ) : (
        <MonthView events={events} year={monthYear.year} month={monthYear.month} onEventClick={setSelectedEvent} />
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          planId={selectedPlanId}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
