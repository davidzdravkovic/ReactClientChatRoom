export function createLogStruct(username, password, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: 'LOGIN_REQUEST',
    data: {
      username,
      password,
    },
  }
}

/** Same envelope as login: SessionId + request + data. Server: CREATE_REQUEST → CREATE_RESPONSE. */
export function createCreateStruct(userName, password, name, email, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: 'CREATE_REQUEST',
    data: {
      userName,
      password,
      name,
      email,
    },
  }
}

// 3️⃣ ChatRetieve — clientFetchEpoch is echoed on FETCH_MESSAGES_RESPONSE so stale fetches after chat switch are ignored
export function createChatRetieve(
  senderUserName,
  receiverUserName,
  limit,
  beforeMessageId = null,
  afterMessageId = null,
  sessionId = 0,
  identifier
) {
  const data = {
    senderUserName,
    receiverUserName,
    limit,
    beforeMessageId,
    afterMessageId,
  }
  if (identifier != null) {
    data.identifier = identifier
  }

  return {
    SessionId: sessionId,
    request: 'FETCH_MESSAGES_REQUEST',
    data,
  }
}

// 4️⃣ ChatRoomDTO
export function createChatRoomDTO(userID, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "RECENT_CHATROOM_REQUEST",
    data: {
      userID
    }
  };
}

// 5️⃣ SendMessageStruct
export function createSendMessageStruct(senderUserName, receiverUserName, content, senderId, chatroom_id, temporaryId, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "MESSAGE_REQUEST",
    data: {
      senderUserName,
      receiverUserName,
      content,
      senderId,
      chatroom_id,
      temporaryId
    }
  };
}

// 6️⃣ TypingRequest
export function createTypingRequest(receiverUser, senderUserName, senderId, chatroom_id, typing, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "TYPING_REQUEST",
    data: {
      receiverUser,
      senderUserName,
      senderId,
      chatroom_id,
      typing
    }
  };
}

// 7️⃣ SeenDTO
export function createSeenDTO(chatroom_id, user_id, last_seen_message_id, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "SEEN_REQUEST",
    data: {
      chatroom_id,
      user_id,
      last_seen_message_id
    }
  };
}

// 8️⃣ FetchDTO
export function createFetchDTO(chatroom_id, user_id, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "FETCH_IMAGES_FOR_CHAT_REQUEST",
    data: {
      chatroom_id,
      user_id
    }
  };
}

/** Chat image message — phase 1 (matches DeserializeMediaMessage INIT). */
export function createUploadImageMessageInit(
  userId,
  clientId,
  mimeType,
  fileSizeBytes,
  sessionId = 0,
) {
  return {
    SessionId: sessionId,
    request: 'UPLOAD_IMAGE_MESSAGE_REQUEST',
    data: {
      userId,
      stage: 'INIT',
      clientId,
      mimeType,
      fileSizeBytes,
    },
  }
}

/** After PUT /media/temp and POST /media/message/commit — creates PENDING_MEDIA message in DB. */
export function createUploadImageMessageCommit(
  userId,
  clientId,
  uploadId,
  senderUserName,
  receiverUserName,
  sessionId = 0,
) {
  return {
    SessionId: sessionId,
    request: 'UPLOAD_IMAGE_MESSAGE_REQUEST',
    data: {
      userId,
      stage: 'COMMIT',
      clientId,
      uploadId,
      senderUserName,
      receiverUserName,
    },
  }
}

/**
 * Marks message READY; server sends MESSAGE_ACK + MESSAGE_RESPONSE.
 * `messageTempId` must match the optimistic row's `temporaryId` (same as INIT `clientId`).
 */
export function createUploadImageMessageFinalize(
  userId,
  clientId,
  messageTempId,
  uploadId,
  senderUserName,
  receiverUserName,
  sessionId = 0,
) {
  return {
    SessionId: sessionId,
    request: 'UPLOAD_IMAGE_MESSAGE_REQUEST',
    data: {
      userId,
      stage: 'FINALIZE',
      clientId,
      messageTempId,
      uploadId,
      senderUserName,
      receiverUserName,
    },
  }
}

/** Profile image: phase 1 — server creates TEMP media row, returns uploadId (media id). */
export function createUploadProfilePictureInit(
  userId,
  mimeType,
  fileSizeBytes,
  sessionId = 0,
) {
  return {
    SessionId: sessionId,
    request: 'UPLOAD_PROFILE_PICTURE_REQUEST',
    data: {
      userId,
      stage: 'INIT',
      mimeType,
      fileSizeBytes,
    },
  }
}

/** Profile image: phase 2 — after bytes are on the media server, mark READY and attach profile. */
export function createUploadProfilePictureCommit(userId, uploadId, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: 'UPLOAD_PROFILE_PICTURE_REQUEST',
    data: {
      userId,
      stage: 'COMMIT',
      uploadId,
    },
  }
}

export function createFirstMessageDTO(senderUserName, receiverUserName, content, senderId, temporaryId, sessionId = 0, ) {
  return {
    SessionId: sessionId,
    request: "FIRST_MESSAGE_REQUEST",
    data: {
      senderUserName,
      receiverUserName,
      content,
      senderId,
      temporaryId
    }
  };
}
