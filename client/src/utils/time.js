export const TIMELINE_START = 7 * 60   // 7:00 AM in minutes
export const TIMELINE_END   = 24 * 60  // midnight in minutes
export const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START

/**
 * Parse "HH:MM" string into total minutes.
 * Returns -1 if input is null/undefined.
 */
export function timeToMin(timeStr) {
  if (timeStr == null) return -1
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert 24h "HH:MM" to 12h format, e.g. "14:30" → "2:30 PM"
 */
export function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hourStr, minuteStr] = timeStr.split(':')
  let hour = parseInt(hourStr, 10)
  const minute = minuteStr
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${ampm}`
}

/**
 * Returns true if the event has one or more conflicts.
 */
export function hasConflict(event) {
  return Array.isArray(event.conflicts) && event.conflicts.length > 0
}

/**
 * Count how many events in an array have conflicts.
 */
export function conflictCount(events) {
  if (!Array.isArray(events)) return 0
  return events.filter(hasConflict).length
}

/**
 * Returns { left, width } as percentage strings for positioning an event
 * on a timeline that spans TIMELINE_START to TIMELINE_END.
 */
export function eventTimelinePosition(event) {
  const start = timeToMin(event.start_time)
  const end   = timeToMin(event.end_time)

  const safeStart = Math.max(start, TIMELINE_START)
  const safeEnd   = Math.min(end > 0 ? end : TIMELINE_END, TIMELINE_END)

  const left  = ((safeStart - TIMELINE_START) / TIMELINE_RANGE) * 100
  const width = ((safeEnd - safeStart) / TIMELINE_RANGE) * 100

  return {
    left:  `${Math.max(0, left).toFixed(4)}%`,
    width: `${Math.max(0, width).toFixed(4)}%`,
  }
}
