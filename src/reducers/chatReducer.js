export const initialChatState = {
  chats: [],
  messages: [],
  activeChat: null,
  galleryOpen: false,
  galleryMediaIds: [],
  waitRecentChat: false,
  typingByChat: {},
  lastSeenMessageIdByChat: {},
  fullScreenImageUrl: null,
  counter: 0,
}

function formatChatsFromRecent(data) {
  return data.map((c) => ({
    chatRoomId: c.chatroom_id,
    correspondentName: c.other_username,
    lastMessage: c.content,
    online: c.online === true || c.online === 'true',
    otherUserId: c.other_userId,
    lastMessageTime: c.time,
  }))
}

/**
 * Server: SendMessageSuccessPayload / FirstMessageSuccessPayload (Stringify.cpp) expose
 * Content, SenderId, Sender, chatroom_id, messageId, Time (and send success adds mediaId, temporaryId).
 * No peer username on the wire when we are the sender — use active chat from the dispatch meta.
 */
function recentChatRowFromAckMessage(message, { correspondentName, otherUserId, currentUserId }) {
  const uid = currentUserId != null ? String(currentUserId) : null
  const senderId = message.SenderId != null ? String(message.SenderId) : null
  const incoming = uid != null && senderId != null && senderId !== uid

  const trim = (v) => {
    if (v == null) return null
    const t = String(v).trim()
    return t === '' ? null : t
  }

  const correspondentNameResolved = incoming
    ? trim(message.Sender)
    : trim(correspondentName)

  const otherUserIdResolved = incoming ? message.SenderId : otherUserId ?? null

  return {
    chatRoomId: message.chatroom_id,
    correspondentName: correspondentNameResolved,
    lastMessage: message.Content,
    lastMessageTime: message.Time,
    online: false,
    otherUserId: otherUserIdResolved,
  }
}

function parseFetchedMessages(data) {
  //Only valid messages
  const messageList = data.filter(
    (m) => m.messageId != null || m.Content != null || m.SenderId != null
  )


  //Extract the seen from the other
  let lastSeenIdByOther = null
  for (const item of data) {
    if (item.last_seen_message_id_by_other != null) {
      lastSeenIdByOther = item.last_seen_message_id_by_other
      break
    }
  }
  //Format the messages from the server
  const fetchedMessages = messageList.map((m) => ({
    id: m.messageId,
    content: m.Content,
    senderId: m.SenderId,
    time: m.Time,
    mediaId: m.mediaId,
    chatRoomId: m.chatroom_id,
  }))
  //Extract he chat room id from the messages if any
  const chatRoomId = fetchedMessages.find((m) => m.chatRoomId != null)?.chatRoomId ?? null
  return { fetchedMessages, lastSeenIdByOther, chatRoomId }
}

function mergeMessages(prev, fetchedMessages, mergeMode) {
  //Merge the messages
  if (mergeMode === 'prepend') return [...fetchedMessages, ...prev]
  if (mergeMode === 'append') return [...prev, ...fetchedMessages]
  return fetchedMessages
}

export function chatReducer(state, action) {
  switch (action.type) {
    
    case 'RECENT_CHATROOM_RESPONSE':
      return {
        ...state,
        chats: formatChatsFromRecent(action.payload.data),
        waitRecentChat: true,
      }

    case 'FETCH_MESSAGES_RESPONSE': {
      const { fetchedMessages, lastSeenIdByOther, chatRoomId } = parseFetchedMessages(
        action.payload.data
      )

      const messages = mergeMessages(state.messages, fetchedMessages, action.mergeMode)
      let lastSeen = state.lastSeenMessageIdByChat
      if (lastSeenIdByOther != null && chatRoomId != null) {
        lastSeen = { ...lastSeen, [chatRoomId]: lastSeenIdByOther }
      }
      return { ...state, messages:messages, lastSeenMessageIdByChat: lastSeen }
    }

    case 'FETCH_IMAGES_FOR_CHAT_RESPONSE': {
      const ids = action.payload.data
        .map((item) => item.imageId)
        .filter((id) => id != null && String(id).trim() !== '')
      return { ...state, galleryMediaIds: ids, galleryOpen: true }
    }

    case 'TYPING_RESPONSE': {
      const chatRoomId = action.payload.data[0].chatRoomId
      const senderUserName = action.payload.data[0].senderUserName
      const isTyping = action.payload.data[0].isTyping === 'true'
      if (chatRoomId == null) return state
      const next =
        isTyping && senderUserName ? { senderUserName, isTyping } : null
      return {
        ...state,
        typingByChat: { ...state.typingByChat, [chatRoomId]: next },
      }
    }

    case 'TYPING_STALE_CLEAR': {
      const { chatRoomId } = action
      return {
        ...state,
        typingByChat: { ...state.typingByChat, [chatRoomId]: null },
      }
    }

    case 'MESSAGE_ACK_RESPONSE':
    case 'MESSAGE_RESPONSE': {
      const message = action.payload.data[0]
      const chatRoomId = message.chatroom_id

      const ackMeta = {
        correspondentName: action.correspondentName,
        otherUserId: action.otherUserId,
        currentUserId: action.currentUserId,
      }

      let chats = state.chats
      const updatedChat = chatRoomId != null ? chats.find((c) => c.chatRoomId === chatRoomId) : null
      if (updatedChat) {
        chats = [
          { ...updatedChat, lastMessage: message.Content, lastMessageTime: message.Time },
          ...chats.filter((c) => c.chatRoomId !== chatRoomId),
        ]
      } else if (chatRoomId != null) {
        const row = recentChatRowFromAckMessage(message, ackMeta)
        if (row.correspondentName) {
          chats = [row, ...chats.filter((c) => c.chatRoomId !== chatRoomId)]
        }
      }

      let typingByChat = { ...state.typingByChat, [chatRoomId]: null }

      let messages = state.messages
      //for now lets just update the message
       
        const serverMsg = {
          id: message.messageId,
          content: message.Content,
          senderId: message.SenderId,
          time: message.Time,
          mediaId: message.mediaId,
        }
        const tempId = message.temporaryId
        if (tempId != null) {
          const idx = messages.findIndex((msg) => msg.temporaryId === tempId)
          if (idx >= 0) {
            const next = [...messages]
            next[idx] = serverMsg
            messages = next
          } else {
            messages = [...messages, serverMsg]
          }
        } else {
          messages = [...messages, serverMsg]
        }
      

      return { ...state, chats, typingByChat, messages }
    }

    case 'ACTIVE_STATUS_RESPONSE': {
      const { userName, status } = action.payload.data[0]
      const index = state.chats.findIndex((c) => c.correspondentName === userName)
      if (index < 0) return state
      const updatedChat = {
        ...state.chats[index],
        online: status === 'true',
      }
      const chats = [
        ...state.chats.slice(0, index),
        updatedChat,
        ...state.chats.slice(index + 1),
      ]
      return { ...state, chats }
    }

    case 'SEEN_RESPONSE': {
      const chatRoomId = action.payload.data[0]?.chatroom_id
      const lastSeenId = action.payload.data[0]?.last_seen_message_id
      if (chatRoomId == null || lastSeenId == null) return state
      return {
        ...state,
        lastSeenMessageIdByChat: {
          ...state.lastSeenMessageIdByChat,
          [chatRoomId]: lastSeenId,
        },
      }
    }

    case 'SELECT_ACTIVE_CHAT':
      return { ...state, activeChat: action.payload, messages: [] }

      case `SELECT_CHAT_BY_NAME`:
      return { ...state, activeChat: action.payload, messages: [] }

    case 'OPTIMISTIC_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }

    case 'CLOSE_GALLERY':
      return { ...state, galleryOpen: false, galleryMediaIds: [] }

    case 'SET_FULLSCREEN_IMAGE':
      return { ...state, fullScreenImageUrl: action.payload }

    case 'CLEAR_FULLSCREEN_IMAGE':
      return { ...state, fullScreenImageUrl: null }
    
    case `SET_COUNTER_FOR_PAGINATION`:
       return {...state, counter : state.counter + 1}  

    default:
      console.warn('Unhandled action type:', action.type)
      return state
  }
}
