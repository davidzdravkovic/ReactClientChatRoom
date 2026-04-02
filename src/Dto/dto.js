
export function createLogStruct(username, password, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "LOGIN_REQUEST",
    data: {
      username,
      password
    }
  };
}

// 2️⃣ CreateStruct
export function createCreateStruct(userName, password, name, email, sessionId = 0) {
  return {
    SessionId: sessionId,
    request: "CREATE_REQUEST",
    data: {
      userName,
      password,
      name,
      email
    }
  };
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
