import React, { useEffect, useRef, useState } from 'react'
import { X, Ticket, Lock, ExternalLink, CalendarPlus } from 'lucide-react'
import { usePlans } from '../context/PlansContext'
import { sportColor, SESSION_TYPE_COLORS } from '../utils/colors'
import { formatTime } from '../utils/time'
import { downloadICS } from '../utils/ics'
import { formatEventDate } from '../utils/date'
import EventDetailContent from './EventDetailContent'

const TICKET_BASE = 'https://tickets.la28.org/search/?affiliate=28T&searchterm='

/**
 * Modal that shows full event details when an event is clicked in the Calendar view.
 * Includes tickets / purchased fields and ICS export.
 *
 * Props:
 *   event     — the event object (includes tickets, purchased from plan_events)
 *   planId    — the plan the event belongs to
 *   onClose   — callback to close the modal
 */
export default function EventModal({ event, planId, onClose }) {
  const { updatePlanEvent, fetchPlanEvents } = usePlans()

  const [tickets,   setTickets]   = useState(event.tickets ?? '')
  const [purchased, setPurchased] = useState(!!event.purchased)

  const ticketsDebounceRef = useRef(null)
  const backdropRef        = useRef(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose()
  }

  function handleTicketsChange(value) {
    setTickets(value)
    if (ticketsDebounceRef.current) clearTimeout(ticketsDebounceRef.current)
    ticketsDebounceRef.current = setTimeout(() => {
      updatePlanEvent(planId, event.id, { tickets: value === '' ? null : +value })
        .catch(err => console.error('Failed to save tickets:', err))
    }, 500)
  }

  async function handlePurchasedChange(checked) {
    setPurchased(checked)
    try {
      await updatePlanEvent(planId, event.id, { purchased: checked })
      await fetchPlanEvents(planId)
    } catch (err) {
      setPurchased(!checked)
      console.error('Failed to update purchased:', err)
    }
  }

  const sessionTypeClass = SESSION_TYPE_COLORS[event.session_type] ?? SESSION_TYPE_COLORS.default

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Dark header bar ── */}
        <div className={`flex items-center justify-between px-4 py-3 ${
          purchased ? 'bg-green-700' : 'bg-slate-700'
        }`}>
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
              <span className="text-xs font-mono font-semibold bg-blue-500 text-white px-1.5 py-0.5 rounded">
                {event.session_code}
              </span>
            )}
            {purchased && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-medium">
                Purchased
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-300 hover:bg-red-500 hover:text-white transition-colors shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={`p-4 ${purchased ? 'bg-green-50' : 'bg-white'}`}>
          {/* Event info (full variant — no badges, handled in header) */}
          <div className="mb-4">
            <p
              className="text-sm font-medium text-slate-800 mb-2"
              style={{ lineHeight: '1.4' }}
            >
              {event.session_description || event.session_code}
            </p>
            <div className="space-y-0.5">
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
          </div>

          {/* ── Tickets + Purchased ── */}
          <div className="flex items-center gap-6 py-3 border-t border-b border-slate-200 mb-4">
            {/* Ticket count */}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Ticket className="w-4 h-4 text-slate-400 shrink-0" />
              Tickets
              <input
                type="number"
                min="1"
                max="99"
                value={tickets}
                onChange={e => handleTicketsChange(e.target.value)}
                placeholder="–"
                className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 ml-1"
              />
            </label>

            {/* Purchased toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none ml-auto">
              <button
                onClick={() => handlePurchasedChange(!purchased)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  purchased ? 'bg-green-500' : 'bg-slate-200'
                }`}
                title={purchased ? 'Mark as not purchased' : 'Mark as purchased'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  purchased ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={purchased ? 'text-green-700 font-medium' : 'text-slate-500'}>
                {purchased ? 'Purchased' : 'Purchased?'}
              </span>
              {purchased && <Lock className="w-3.5 h-3.5 text-green-500" />}
            </label>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col gap-2">
            {event.session_code && (
              <a
                href={`${TICKET_BASE}${encodeURIComponent(event.session_code)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Buy Tickets
              </a>
            )}
            <button
              onClick={() => downloadICS(event)}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Export to Calendar (.ics)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
