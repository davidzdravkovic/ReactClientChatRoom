import { useReducer, useEffect, useRef, useCallback } from 'react'
import { createChatRoomDTO, createChatRetieve, createFetchDTO, createSeenDTO, createSendMessageStruct,createFirstMessageDTO, createTypingRequest } from '../Dto/dto'
import { sendMessage, getSessionId } from '../network/wsConnection'
import { runImageMessageUploadPhases } from '../network/imageMessageUpload'
import { nextClientTemporaryId } from '../utils/nextClientTemporaryId'
import { chatReducer, initialChatState } from '../reducers/chatReducer'
import { ChatSessionEnvironment } from '../controllers/ChatSessionEnvironment'
import { devError, devLog } from '../utils/logger'

const FETCH_LIMIT = 14

const SELF_CHAT_ALERT_MESSAGE = "You can't chat with yourself."

function isOwnUsername(currentUserName, peerName) {
  const me = currentUserName?.trim()
  const peer = peerName?.trim()
  return Boolean(me && peer && me === peer)
}

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
    chatAlert,
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
  const temporaryStorageRef = useRef({})
  /** Prefetch for sidebar search (peer not in recent list): peer until FETCH or PEER_USER_NOT_FOUND. */
  const prefetchUnknownPeerRef = useRef(null)

  function isPrefetchingUnknownPeer() {
    const p = prefetchUnknownPeerRef.current
    if (!p) return false
    return activeChatRef.current?.correspondentName !== chatSessionEnvRef.current?.peerUserName
  }

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
    if (prevPeerName && temporaryStorageRef.current[prevPeerName]?.length === 0) {
      delete temporaryStorageRef.current[prevPeerName]
    }
  }



  const handleLoadOlder = useCallback(() => {
    if (isPrefetchingUnknownPeer()) return
    const env = chatSessionEnvRef.current
    if (!env) return
    const oldestId = env.pagination.requestOlder(messages)
    devLog(`the oldest id is ${oldestId}`)
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
    if (isPrefetchingUnknownPeer()) return
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
    if (isPrefetchingUnknownPeer()) return
    // No seen until initial fetch has finished for this session
    const chat = activeChatRef.current
    if (chat?.initialFetchDone === false) {
      devLog('Seen action before initial fetch for', chatSessionEnvRef.current?.peerUserName)
      return
    }
    if (chatSessionEnvRef.current?.state === 'newChat') {
      devLog('Seen action during newChat transition for', chatSessionEnvRef.current?.peerUserName)
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
    if (isPrefetchingUnknownPeer()) return
    if (isOwnUsername(payload.currenUsername, payload.correspondentName)) {
      dispatch({
        type: 'SHOW_CHAT_ALERT',
        message: SELF_CHAT_ALERT_MESSAGE,
        variant: 'error',
      })
      return
    }
    if (activeChatRef.current.initialFetchDone === false) {
      devLog('Message sent before initial fetch for', chatSessionEnvRef.current?.peerUserName)
      return
    }

    const sess = chatSessionEnvRef.current
    if (!sess) return

//Always show the optimistic message

      const peerUsername = sess.peerUserName
      if (!temporaryStorageRef.current[peerUsername]) temporaryStorageRef.current[peerUsername] = []
      temporaryStorageRef.current[peerUsername].push(payload)

      const optimistic = {
        id: `temp-${payload.temporaryId}`,
        content: payload.content,
        senderId: payload.senderId,
        time: payload.time,
        temporaryId: payload.temporaryId,
      }

    //Transition to the last view 
    //All messages after the while the state is inFlight are just storing in temp Storage and released on first FETCH RESPONSE
    if (sess.chatView === `initial`) {
      if (!sess.pagination.inFlight) {
        sess.chatView = `last_view`
        dispatch({ type: 'FETCH_MESSAGES_RESPONSE', payload: { data: [...(messageStorageRef.current[peerUsername] ?? [])] }, mergeMode: 'initial' })
        dispatch({ type: 'OPTIMISTIC_MESSAGE', payload: optimistic })
      } else {
        sess.pendingSeed = true
      }
    }
    else {
      dispatch({ type: 'OPTIMISTIC_MESSAGE', payload: optimistic })
    }

     if (sess.state === 'newChat') { 
      if (sess.subState === `noFirstMessageSent`) {
        devLog('First message sent for new chat with', sess.peerUserName)
        const req = createFirstMessageDTO (
          payload.currenUsername,
          payload.correspondentName,
          payload.content,
          payload.senderId,
          payload.temporaryId,
          getSessionId(),
        )
         sendMessage(JSON.stringify(req))
         sess.subState = `firstMessageSent`
         return
      }
      else if (sess.subState === `firstMessageSent`) {
        const pendingByPeer = bufferOfPendingMessagesRef.current
        const key = payload.correspondentName
        if (!pendingByPeer[key]) pendingByPeer[key] = []
        pendingByPeer[key].push(payload)
      }
      return
    }
    else if (sess.state === 'existingChat') {
      devLog('Message sent for existing chat with', sess.peerUserName, 'chatRoomId:', activeChatRef.current?.chatRoomId, payload.chatRoomId)

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
    if (activeChat.chatRoomId == null) return
    pendingGalleryRef.current = true
    const req = createFetchDTO(activeChat.chatRoomId, currentUser.userId, getSessionId())
    sendMessage(JSON.stringify(req))
  }, [activeChat, currentUser])

  const selectChat = useCallback((chat) => {
    //Selecting chat by from recent chat LIST
    if (activeChatRef.current?.correspondentName === chat.correspondentName) return

    prefetchUnknownPeerRef.current = null

    if (isOwnUsername(currentUser?.userName, chat?.correspondentName)) {
      dispatch({
        type: 'SHOW_CHAT_ALERT',
        message: SELF_CHAT_ALERT_MESSAGE,
        variant: 'error',
      })
      return
    }

    //If prev chat was newChat it removes the entry from messageStorageRef
        prevChatRemoveEntry () 
    chatSessionEnvRef.current = new ChatSessionEnvironment(chat.chatRoomId, chat.correspondentName)
    chat.initialFetchDone = false
    dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: chat })
  }, [currentUser?.userName])


  const  selectChatByName = useCallback((correspondentName) => {
    //Selecting chat by SEARCH
    if (activeChatRef.current?.correspondentName === correspondentName) return
    if (isOwnUsername(currentUser?.userName, correspondentName)) {
      dispatch({
        type: 'SHOW_CHAT_ALERT',
        message: SELF_CHAT_ALERT_MESSAGE,
        variant: 'error',
      })
      return
    }
    //If prev chat was newChat it removes the entry from messageStorageRef
    prevChatRemoveEntry()
    const chat = chats.find((c) => c.correspondentName === correspondentName)
    //If the searched user is already in the recent chats
    if (chat) {
      //Creation of the session environment for the lifecycle of one chat 
      selectChat(chat)
      return
    }
    // Not in recent list: keep visible active chat; prefetch with new env + epoch; commit on FETCH_MESSAGES_RESPONSE.
    const peer = String(correspondentName).trim()
    prefetchUnknownPeerRef.current = { peer }
    chatSessionEnvRef.current = new ChatSessionEnvironment(null, peer)
    sendMessage(
      JSON.stringify(
        createChatRetieve(
          currentUser.userName,
          peer,
          FETCH_LIMIT,
          0,
          0,
          getSessionId(),
          chatSessionEnvRef.current.conversationEpoch,
        ),
      ),
    )
  }, [chats, currentUser?.userName, selectChat])


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

  const clearChatAlert = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT_ALERT' })
  }, [])

  
 function onTyping (peerUserName, chatRoomId, typing) {
  if (isPrefetchingUnknownPeer()) return
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
      if (isPrefetchingUnknownPeer()) return
      const chat = activeChatRef.current
      if (!chat) return
      if (chatSessionEnvRef.current?.state !== 'existingChat') return

      const env = chatSessionEnvRef.current
      if (!env) return
      const peerUsername = env.peerUserName
      const clientId = nextClientTemporaryId()

      if (!temporaryStorageRef.current[peerUsername]) temporaryStorageRef.current[peerUsername] = []
      temporaryStorageRef.current[peerUsername].push({
        temporaryId: clientId,
        senderId: currentUser.userId,
        content: ' ',
        time: new Date().toISOString(),
      })

      if (env.chatView === 'initial') {
        if (!env.pagination.inFlight) {
          env.chatView = 'last_view'
          dispatch({ type: 'FETCH_MESSAGES_RESPONSE', payload: { data: [...(messageStorageRef.current[peerUsername] ?? [])] }, mergeMode: 'initial' })
        } else {
          env.pendingSeed = true
        }
      }

      try {
        await runImageMessageUploadPhases(file, dispatch, {
          userId: currentUser.userId,
          sessionId: getSessionId(),
          senderUserName: currentUser.userName,
          receiverUserName: chat.correspondentName,
          clientId,
        })
      } 
      catch (e) {
        devError('Chat image upload failed:', e)
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
      chatAlert,
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
      clearChatAlert,
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
      temporaryStorageRef,
      prefetchUnknownPeerRef,
    },
  }
}
