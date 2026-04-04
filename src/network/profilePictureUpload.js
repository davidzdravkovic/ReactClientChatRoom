import { sendMessage, subscribeMessages } from './wsConnection'
import {
  createUploadProfilePictureCommit,
  createUploadProfilePictureInit,
} from '../Dto/dto'
import { postProfilePictureCommit, putTempMediaBlob } from './mediaServer'

function parseWsJson(event) {
  try {
    return JSON.parse(event.data)
  } catch {
    return null
  }
}

/** Chat server Stringify sends approved as JSON string "true" / "false", not booleans. */
function isApprovedFlag(v) {
  return v === true || v === 'true'
}

/**
 * Wait for a single JSON WS frame with the given `response` string.
 * Other frames are ignored (your global subscription still receives them).
 */
export function waitForResponse(responseType, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timeout waiting for ${responseType}`))
    }, timeoutMs)

    const unsubscribe = subscribeMessages((event) => {
      const msg = parseWsJson(event)
      if (!msg || msg.response !== responseType) return
      clearTimeout(timer)
      unsubscribe()
      resolve(msg)
    })
  })
}

/**
 * WS INIT → PUT /media/temp → POST /media/commit → WS COMMIT.
 * `approved` from the chat server is the string "true" in JSON (see Stringify.cpp).
 */
export async function runProfilePictureUploadPhases(file, userId, sessionId) {
  const mimeType = file.type || 'application/octet-stream'
  const fileSizeBytes = file.size

  sendMessage(
    JSON.stringify(
      createUploadProfilePictureInit(userId, mimeType, fileSizeBytes, sessionId),
    ),
  )

  const initMsg = await waitForResponse('UPLOAD_PROFILE_PICTURE_RESPONSE')
  const initRow = initMsg.data?.[0]
  const uploadId =
    initRow?.uploadId != null ? Number(initRow.uploadId) : NaN
  if (!initRow || !isApprovedFlag(initRow.approved) || Number.isNaN(uploadId)) {
    console.warn('Profile upload init unexpected response:', initMsg)
    throw new Error('Profile upload init rejected')
  }
  const putOk = await putTempMediaBlob(uploadId, file, mimeType)
  if (!putOk) {
    throw new Error('Profile binary upload failed (media server PUT /media/temp)')
  }

  const movedOk = await postProfilePictureCommit(uploadId, userId)
  if (!movedOk) {
    throw new Error('Profile commit failed (media server POST /media/commit)')
  }

  sendMessage(
    JSON.stringify(
      createUploadProfilePictureCommit(userId, uploadId, sessionId),
    ),
  )

  const commitMsg = await waitForResponse('UPLOAD_PROFILE_PICTURE_FINISHED_RESPONSE')
  const commitRow = commitMsg.data?.[0]
  if (!commitRow || !isApprovedFlag(commitRow.approved)) {
    throw new Error(commitRow?.error || 'Profile upload commit failed')
  }

  return uploadId
}
