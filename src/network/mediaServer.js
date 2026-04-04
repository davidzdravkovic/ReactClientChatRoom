/**
 * Media server (`media_storage` / httplib) on http://localhost:8081 — see `Src/main.cpp`:
 * - PUT  /media/temp/:uploadId     — write temp .bin
 * - POST /media/commit/:id/:userId — move temp → ProfilePictures/{userId}.bin
 * - GET  /media/profile/:userId    — read profile bytes
 * - POST /media/message/commit/:id — temp → messages/{id}.bin
 * - GET  /media/message/:mediaId   — read message attachment
 */

const MEDIA_BASE = 'http://localhost:8081'

/**
 * Fetch profile picture for a user. Returns object URL for the image or null on 404/error.
 * Caller should revoke the URL when no longer needed (e.g. cleanup) to avoid leaks.
 * @param {number|string} userId
 * @returns {Promise<string|null>} blob URL or null
 */

//Creating url of received BLOB 
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

/** PUT binary to D:/Media/temp/{uploadId}.bin (matches media_storage `Put /media/temp/...`). */
export async function putTempMediaBlob(uploadId, body, mimeType) {
  if (uploadId == null) return false
  try {
    const res = await fetch(`${MEDIA_BASE}/media/temp/${uploadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
      },
      body,
    })
    return res.ok
  } catch {
    return false
  }
}

/** Move temp file to permanent profile path (matches `Post /media/commit/:uploadId/:userId`). */
/** Move temp → D:/Media/messages/{uploadId}.bin */
export async function postMessageImageCommit(uploadId) {
  if (uploadId == null) return false
  try {
    const res = await fetch(
      `${MEDIA_BASE}/media/message/commit/${encodeURIComponent(uploadId)}`,
      { method: 'POST' },
    )
    return res.ok
  } catch {
    return false
  }
}

export async function postProfilePictureCommit(uploadId, userId) {
  if (uploadId == null || userId == null) return false
  try {
    const res = await fetch(
      `${MEDIA_BASE}/media/commit/${encodeURIComponent(uploadId)}/${encodeURIComponent(userId)}`,
      { method: 'POST' },
    )
    return res.ok
  } catch {
    return false
  }
}
