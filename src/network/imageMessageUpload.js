import { sendMessage, subscribeMessages } from './wsConnection'
import { createUploadImageMessageCommit, createUploadImageMessageFinalize, createUploadImageMessageInit } from '../Dto/dto'
import { postMessageImageCommit, putTempMediaBlob } from './mediaServer'
import { nextClientTemporaryId } from '../utils/nextClientTemporaryId'

function parseWsJson(event) {
  try {
    return JSON.parse(event.data)
  } catch {
    return null
  }
}

/** Single place: reducer revokes `localPreviewUrl` when the row is removed. */
function cleanupOptimisticImage(dispatch, tempId) {
  dispatch({ type: 'REMOVE_OPTIMISTIC_BY_TEMP_ID', temporaryId: tempId })
}

export function waitForResponse(responseType, clientId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeMessages((event) => {
      const msg = parseWsJson(event)
      if (!msg || msg.response !== responseType) return
      const row = msg.data?.[0]
      if (row == null) return
      if (clientId != null && row.clientId !== clientId) return

      clearTimeout(timer)
      unsubscribe()
      resolve(msg)
    })
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timeout waiting for ${responseType}`))
    }, timeoutMs)
  })
}

/**
 * INIT (WS) → PUT /media/temp → POST /media/message/commit → COMMIT (WS) → FINALIZE (WS).
 * Optimistic row uses temporaryId === clientId; FINALIZE messageTempId must match.
 */
export async function runImageMessageUploadPhases(file, dispatch, ctx) {
  const {
    userId,
    sessionId,
    senderUserName,
    receiverUserName,
    clientId: externalClientId,
  } = ctx

  const clientId = externalClientId ?? nextClientTemporaryId()
  const localPreviewUrl = URL.createObjectURL(file)
  const timeStr = new Date().toISOString()

  dispatch({
    type: 'OPTIMISTIC_MESSAGE',
    payload: {
      id: `temp-${clientId}`,
      temporaryId: clientId,
      content: ' ',
      senderId: userId,
      time: timeStr,
      mediaId: null,
      localPreviewUrl,
    },
  })

  try {
    const mimeType = file.type || 'application/octet-stream'
    const fileSizeBytes = file.size

    sendMessage(
      JSON.stringify(
        createUploadImageMessageInit(
          userId,
          clientId,
          mimeType,
          fileSizeBytes,
          sessionId,
        ),
      ),
    )

    const initMsg = await waitForResponse('UPLOAD_IMAGE_MESSAGE_RESPONSE', clientId)
    const initRow = initMsg.data?.[0]
    if (initRow == null) {
      throw new Error('Image upload INIT: missing response row')
    }
    const uploadId = initRow.uploadId

    if (uploadId === null || uploadId < 0) {
      throw new Error('Not valid uploadID returned by server')
    }

    if (initRow.approved !== 'true') {
      throw new Error('Image upload INIT rejected')
    }

  
    const putOk = await postMessageImageCommit(uploadId, file, mimeType)
    if (!putOk) {
      throw new Error('Image POST /media/message/commit failed')
    }

    sendMessage(
      JSON.stringify(
        createUploadImageMessageCommit(
          userId,
          clientId,
          uploadId,
          senderUserName,
          receiverUserName,
          sessionId,
        ),
      ),
    )

    const commitMsg = await waitForResponse('UPLOAD_IMAGE_MESSAGE_FINISHED_RESPONSE', clientId)
    const commitRow = commitMsg.data?.[0]

    if (commitRow == null) {
      throw new Error('Image upload COMMIT: missing response row')
    }
    if (commitRow.approved !== 'true') {
      throw new Error('Image upload COMMIT failed')
    }

    sendMessage(
      JSON.stringify(
        createUploadImageMessageFinalize(
          userId,
          clientId,
          clientId,
          uploadId,
          senderUserName,
          receiverUserName,
          sessionId,
        ),
      ),
    )
  } catch (e) {
    cleanupOptimisticImage(dispatch, clientId)
    throw e
  }
}
