import { useReducer, useEffect, useRef, useCallback } from 'react'
import { createChatRoomDTO, createChatRetieve, createFetchDTO, createSeenDTO, createSendMessageStruct,createFirstMessageDTO, createTypingRequest } from '../Dto/dto'
import { sendMessage, getSessionId } from '../network/wsConnection'
import { runImageMessageUploadPhases } from '../network/imageMessageUpload'
import { chatReducer, initialChatState } from '../reducers/chatReducer'
import { ChatSessionEnvironment } from '../controllers/ChatSessionEnvironment'

const FETCH_LIMIT = 14

/**
 * Single hook that owns chat state (reducer), WS subscription, and all chat-specific
 * actions. Keeps "one place" for state updates while keeping ChatPage a thin orchestrator.
 */
export function useChatPageState(currentUser) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const {
    chats,
    messages,
    activeChat,
    galleryOpen,
    galleryMediaIds,
    typingByChat,
    lastSeenMessageIdByChat,
    fullScreenImageUrl,
    waitRecentChat,
  } = state

  /** @type {React.MutableRefObject<Record<string, { messages: unknown[] }>>} */
  const optimisticMessagesByPeerRef = useRef({})
  const activeChatRef = useRef(activeChat)
  activeChatRef.current = activeChat
  const typingTimeoutRef = useRef({})
  const pendingGalleryRef = useRef(false)
  const chatSessionEnvRef = useRef(null)
  const bufferOfPendingMessagesRef = useRef({})
  const messageStorageRef = useRef({})

  useEffect(() => {
    const chatRequest = createChatRoomDTO(currentUser.userId, getSessionId())
    sendMessage(JSON.stringify(chatRequest))
  }, [currentUser?.userId])

  //Needs to run only ONCE in a single chat session
//ActiveChat carries the flag (UI logic + first initial fetch), set to true on chat clicking
//While initialfetch is not done (false) this effect needs to run only ONCE -> Only ONE state update during this phase on activeChat
//Set to false on the first fetch 
  useEffect(() => {
    if (!activeChat) return
    if (activeChat.initialFetchDone === true) return
    const env = chatSessionEnvRef.current
    if (!env) return
    const epoch = env.conversationEpoch
    if (epoch == null) return
    const fetchMessagesRequest = createChatRetieve(
      currentUser.userName,
      activeChat.correspondentName,
      FETCH_LIMIT,
      0,
      0,
      getSessionId(),
      epoch,
    )
    sendMessage(JSON.stringify(fetchMessagesRequest))
  }, [activeChat, currentUser.userName])

  function prevChatRemoveEntry () {

      const prevEnv = chatSessionEnvRef.current
      const prevPeerName = prevEnv?.peerUserName ?? activeChatRef.current?.correspondentName
      if (prevEnv?.state === 'newChat' && prevPeerName && messageStorageRef.current[prevPeerName]) {
      delete messageStorageRef.current[prevPeerName]
    }

  }



  const handleLoadOlder = useCallback(() => {
    const env = chatSessionEnvRef.current
    if (!env) return
    const oldestId = env.pagination.requestOlder(messages)
    console.log(`the oldest id is ${oldestId}`)
    if (oldestId == null) return
    const chat = activeChatRef.current
    if (!chat) return
    const req = createChatRetieve(
      currentUser.userName,
      chat.correspondentName,
      FETCH_LIMIT,
      oldestId,
      0,
      getSessionId(),
      env.conversationEpoch,
    )
    sendMessage(JSON.stringify(req))
  }, [messages, currentUser.userName])

  const handleLoadNewer = useCallback(() => {
    const env = chatSessionEnvRef.current
    if (!env) return
    const newestId = env.pagination.requestNewer(messages)
    if (newestId == null) return
    const chat = activeChatRef.current
    if (!chat) return
    const req = createChatRetieve(
      currentUser.userName,
      chat.correspondentName,
      FETCH_LIMIT,
      0,
      newestId,
      getSessionId(),
      env.conversationEpoch,
    )
    sendMessage(JSON.stringify(req))
  }, [messages, currentUser.userName])

  const handleSeen = useCallback((messageId) => {
    // No seen until initial fetch has finished for this session
    const chat = activeChatRef.current
    if (chat?.initialFetchDone === false) {
      console.log('Seen action before initial fetch for', chatSessionEnvRef.current?.peerUserName)
      return
    }
    if (chatSessionEnvRef.current?.state === 'newChat') {
      console.log('Seen action during newChat transition for', chatSessionEnvRef.current.peerUserName)
      return
    }
    const pagination = chatSessionEnvRef.current?.pagination
    if (!chat || !currentUser || messageId == null) return
    if (pagination?.lastSeenSentId === messageId) return
    if (pagination) pagination.lastSeenSentId = messageId
    const req = createSeenDTO(chat.chatRoomId, currentUser.userId, messageId, getSessionId())
    sendMessage(JSON.stringify(req))
  }, [currentUser])

  const handleMessageSent = useCallback((payload) => {
    
    if(activeChatRef.current == null || currentUser == null) return 
    if (activeChatRef.current.initialFetchDone === false) {
      console.log('Message sent before initial fetch for', chatSessionEnvRef.current?.peerUserName)
      return
    }
    if (chatSessionEnvRef.current.firstOptimistic) {
      const peer = chatSessionEnvRef.current.peerUserName
      if (!messageStorageRef.current[peer]) messageStorageRef.current[peer] = []
      messageStorageRef.current[peer].push({
        Content: payload.content,
        SenderId: payload.senderId,
        Time: payload.time,
        temporaryId: payload.temporaryId,
      })

      if (!chatSessionEnvRef.current.pagination.inFlight) {
        const formatted = messageStorageRef.current[peer].map(m => ({
          id: m.messageId ?? `temp-${m.temporaryId}`,
          content: m.Content,
          senderId: m.SenderId,
          time: m.Time,
          mediaId: m.mediaId,
          chatRoomId: m.chatroom_id,
          temporaryId: m.temporaryId,
        }))
        dispatch({ type: 'SEED_FROM_STORAGE', payload: formatted })
      } else {
        chatSessionEnvRef.current.pendingSeed = true
      }
      chatSessionEnvRef.current.firstOptimistic = false
    } else {
      dispatch({
        type: 'OPTIMISTIC_MESSAGE',
        payload: {
          id: `temp-${payload.temporaryId}`,
          content: payload.content,
          senderId: payload.senderId,
          time: payload.time,
          temporaryId: payload.temporaryId,
        },
      })
    }

     if(chatSessionEnvRef.current?.state === 'newChat') { 
      if(chatSessionEnvRef.current.subState === `noFirstMessageSent`) {
        console.log('First message sent for new chat with', chatSessionEnvRef.current.peerUserName)
        const req = createFirstMessageDTO (
          payload.currenUsername,
          payload.correspondentName,
          payload.content,
          payload.senderId,
          payload.temporaryId,
          getSessionId(),
        )
         sendMessage(JSON.stringify(req))
         chatSessionEnvRef.current.subState = `firstMessageSent`
         return
      }
      else if(chatSessionEnvRef.current.subState === `firstMessageSent`) {
        console.log('Subsequent message sent for new chat with', chatSessionEnvRef.current.peerUserName)
        const pendingByPeer = bufferOfPendingMessagesRef.current
        const key = payload.correspondentName
        if (!pendingByPeer[key]) pendingByPeer[key] = []
        pendingByPeer[key].push(payload)
      }
      return
    }
    else if(chatSessionEnvRef.current?.state === 'existingChat') {
      console.log('Message sent for existing chat with', chatSessionEnvRef.current.peerUserName, 'chatRoomId:', activeChatRef.current.chatRoomId,payload.chatRoomId)

      
   const req  = createSendMessageStruct(
    payload.currenUsername,
    payload.correspondentName,
    payload.content,
    payload.senderId,
    payload.chatRoomId,
    payload.temporaryId,
    getSessionId(),
  )

   sendMessage(JSON.stringify(req))
    }

  }, [])

  const requestGalleryImages = useCallback(() => {
    if (!activeChat || !currentUser) return
    pendingGalleryRef.current = true
    const req = createFetchDTO(activeChat.chatRoomId, currentUser.userId, getSessionId())
    sendMessage(JSON.stringify(req))
  }, [activeChat, currentUser])

  const selectChat = useCallback((chat) => {
    //Selecting chat by from recent chat LIST
    if (activeChatRef.current?.correspondentName === chat.correspondentName) return

    //If prev chat was newChat it removes the entry from messageStorageRef
        prevChatRemoveEntry () 
    chatSessionEnvRef.current = new ChatSessionEnvironment(chat.chatRoomId, chat.correspondentName)
    chat.initialFetchDone = false
    dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: chat })
  }, [])


  const  selectChatByName = useCallback((correspondentName) => {
    //Selecting chat by SEARCH
    if (activeChatRef.current?.correspondentName === correspondentName) return
    //If prev chat was newChat it removes the entry from messageStorageRef
    prevChatRemoveEntry()
    const chat = chats.find((c) => c.correspondentName === correspondentName)
    //If the searched user is already in the recent chats
    if (chat) {
      //Creation of the session environment for the lifecycle of one chat 
      selectChat(chat)
      return
    }
    //The user is not fetched in the recent chats, or maybe the recent chats response is late or missing.
    //There can be still existing chat with this user 
      chatSessionEnvRef.current = new ChatSessionEnvironment(null, correspondentName)
      dispatch({type: 'SELECT_ACTIVE_CHAT',
        payload: {
          correspondentName,
          chatRoomId: null,
          initialFetchDone: false,
          otherUserId: null,
        },
      })
  }, [chats])


  const closeGallery = useCallback(() => {
    dispatch({ type: 'CLOSE_GALLERY' })
  }, [])

  const setFullscreenImage = useCallback((url) => {
    dispatch({ type: 'SET_FULLSCREEN_IMAGE', payload: url })
  }, [])

  const clearFullscreenImage = useCallback(() => {
    dispatch({ type: 'CLEAR_FULLSCREEN_IMAGE' })
  }, [])

  const setCounterPagination = useCallback(() => {
    dispatch({ type: 'SET_COUNTER_FOR_PAGINATION' })
  }, [])

  
 function onTyping (peerUserName, chatRoomId, typing) {
  if(chatSessionEnvRef.current.state !== `existingChat`) return
    if (!activeChat || !currentUser) return

    const payload = createTypingRequest(
      peerUserName,
      currentUser.userName,
      currentUser.userId,
      chatRoomId,
      typing,
      getSessionId()
    )
    sendMessage(JSON.stringify(payload))

 }

  const handleChatImageFile = useCallback(
    async (file) => {
      if (!file || !currentUser?.userId) return
      const chat = activeChatRef.current
      if (chatSessionEnvRef.current?.state !== 'existingChat') return
      try {
        await runImageMessageUploadPhases(file, dispatch, {
          userId: currentUser.userId,
          sessionId: getSessionId(),
          senderUserName: currentUser.userName,
          receiverUserName: chat.correspondentName,
        })
      } 
      catch (e) {
        console.error('Chat image upload failed:', e)
      }
    },
    [currentUser?.userId, currentUser?.userName, dispatch],
  )

  return {
    state: {
      chats,
      messages,
      activeChat,
      galleryOpen,
      galleryMediaIds,
      waitRecentChat,
      typingByChat,
      lastSeenMessageIdByChat,
      fullScreenImageUrl,
    },
    actions: {
      selectChat,
      selectChatByName,
      handleLoadOlder,
      handleLoadNewer,
      handleSeen,
      handleMessageSent,
      requestGalleryImages,
      closeGallery,
      setFullscreenImage,
      clearFullscreenImage,
      setCounterPagination,
      onTyping,
      handleChatImageFile,
    },
    subscriptionDeps: {
      dispatch,
      activeChatRef,
      pendingGalleryRef,
      typingTimeoutRef,
      chatSessionEnvRef,
      bufferOfPendingMessagesRef,
      optimisticMessagesByPeerRef,
      messageStorageRef,

    },
  }
}
