/**
 * Date utilities for ISO date strings ("2028-07-14").
 *
 * IMPORTANT: always parse with new Date(y, m-1, d) — NOT new Date(isoStr).
 * The latter parses as midnight UTC which renders as the previous day in Pacific time.
 */

/**
 * Parse an ISO date string to a local Date object.
 * "2028-07-14" → new Date(2028, 6, 14)  (local midnight, not UTC)
 */
export function parseISODate(isoStr) {
  if (!isoStr) return null
  const [y, m, d] = isoStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/**
 * Format an ISO date string for display.
 * "2028-07-14" → "Monday, July 14"
 */
export function formatEventDate(isoStr) {
  const d = parseISODate(isoStr)
  if (!d) return isoStr ?? ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Format an ISO date string for compact display.
 * "2028-07-14" → "Jul 14"
 */
export function formatDateCompact(isoStr) {
  const d = parseISODate(isoStr)
  if (!d) return isoStr ?? ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
