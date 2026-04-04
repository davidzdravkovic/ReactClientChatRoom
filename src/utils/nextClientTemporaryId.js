/** Upper bound for C++ `int` temporaryId on the server (signed 32-bit). */
const INT32_MAX = 2147483647

let seq = 0

/**
 * Next client-side temporary message id, safe for server `int temporaryId`.
 * Monotonic per page load; wraps 1..INT32_MAX.
 */
export function nextClientTemporaryId() {
  seq += 1
  if (seq > INT32_MAX) seq = 1
  return seq
}
