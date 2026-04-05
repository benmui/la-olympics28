// Games Day 0 = Friday, July 14, 2028
const DAY0 = new Date(2028, 6, 14)

function gamesDayToDate(gamesDay) {
  const d = new Date(DAY0)
  d.setDate(DAY0.getDate() + Number(gamesDay))
  return d
}

function icsDate(gamesDay) {
  const d = gamesDayToDate(gamesDay)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function icsTime(t) {
  // "14:00" → "140000"
  if (!t) return '000000'
  return t.replace(':', '') + '00'
}

function escapeICS(str) {
  return (str ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICS(event) {
  const dateStr  = icsDate(event.games_day)
  const uid      = `la28-${event.id}@la28planner`
  const summary  = escapeICS(`${event.sport}${event.session_description ? ' – ' + event.session_description : ''}`)
  const location = escapeICS([event.venue, event.zone].filter(Boolean).join(', '))
  const description = escapeICS(
    [
      event.session_code   ? `Session Code: ${event.session_code}`   : null,
      event.session_type   ? `Session Type: ${event.session_type}`   : null,
      event.zone           ? `Zone: ${event.zone}`                   : null,
    ].filter(Boolean).join('\\n')
  )

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LA28 Schedule Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=America/Los_Angeles:${dateStr}T${icsTime(event.start_time)}`,
    `DTEND;TZID=America/Los_Angeles:${dateStr}T${icsTime(event.end_time)}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(event) {
  const content  = generateICS(event)
  const blob     = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  const filename = `la28-${(event.session_code || event.sport || 'event').replace(/\s+/g, '_')}.ics`
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}
