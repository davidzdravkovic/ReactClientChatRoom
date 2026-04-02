/**
 * Parse server time (ISO or "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.ffffff")
 */
function parseTime(value) {
  if (value == null) return null
  if (value instanceof Date) return value
  const str = String(value).trim()
  if (!str) return null
  const d = new Date(str.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Format time for a message bubble: "2:50 PM", "11:03 AM"
 */
export function formatMessageTime(value) {
  const d = parseTime(value)
  if (!d) return ''
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Date key for grouping: "2026-01-27"
 */
export function getDateKey(value) {
  const d = parseTime(value)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Label for date separator: "Today", "Yesterday", "Monday", or "Jan 27, 2026"
 */
export function formatDateSeparator(value) {
  const d = parseTime(value)
  if (!d) return ''
  const today = new Date()
  const key = getDateKey(value)
  const todayKey = getDateKey(today)

  if (key === todayKey) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === getDateKey(yesterday)) return 'Yesterday'
  const daysDiff = Math.round((today - d) / (1000 * 60 * 60 * 24))
  if (daysDiff >= 2 && daysDiff <= 6) {
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Full datetime for tooltip: "Jan 27, 2026 at 2:50 PM"
 */
export function formatMessageTimeFull(value) {
  const d = parseTime(value)
  if (!d) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
