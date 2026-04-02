/**
 * Pagination observability — disabled by default (no console noise).
 * Set to true to emit structured lines to the console during development.
 */
export const PAGINATION_OBSERVABILITY_ENABLED = false

/**
 * Structured pagination telemetry (console when enabled; swap sink later for analytics/OTel).
 * @param {string} event
 * @param {Record<string, unknown>} fields
 */
export function logPagination(event, fields) {
  if (!PAGINATION_OBSERVABILITY_ENABLED) return
  const line = {
    subsystem: 'pagination',
    ts: new Date().toISOString(),
    event,
    ...fields,
  }
  console.log('[pagination]', JSON.stringify(line))
}

/** Aligns with chatReducer message filtering for counts (for when logging is re-enabled). */
export function countFetchedMessagesInPayload(data) {
  if (!Array.isArray(data)) return 0
  return data.filter(
    (m) => m.messageId != null || m.Content != null || m.SenderId != null,
  ).length
}
