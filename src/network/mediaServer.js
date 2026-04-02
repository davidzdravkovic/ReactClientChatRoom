/**
 * Media server (e.g. http://localhost:8081) – profile pictures and message attachments.
 * Response: binary body (application/octet-stream). We convert to blob URL for <img>.
 */

const MEDIA_BASE = 'http://localhost:8081'

/**
 * Fetch profile picture for a user. Returns object URL for the image or null on 404/error.
 * Caller should revoke the URL when no longer needed (e.g. cleanup) to avoid leaks.
 * @param {number|string} userId
 * @returns {Promise<string|null>} blob URL or null
 */
export async function fetchProfileImage(userId) {
  if (userId == null) return null
  try {
    const res = await fetch(`${MEDIA_BASE}/media/profile/${userId}`, { method: 'GET' })
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * Fetch message/chat image by media id. Returns blob URL or null.
 * Media server: GET /media/message/{mediaId}
 */
export async function fetchMessageImage(mediaId) {
  if (mediaId == null) return null
  try {
    const res = await fetch(`${MEDIA_BASE}/media/message/${mediaId}`, { method: 'GET' })
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export function getMediaBase() {
  return MEDIA_BASE
}
