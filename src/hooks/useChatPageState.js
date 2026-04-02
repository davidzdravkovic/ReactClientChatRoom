import { useReducer, useEffect, useRef, useCallback } from 'react'
import { createChatRoomDTO, createChatRetieve, createFetchDTO, createSeenDTO, createSendMessageStruct,createFirstMessageDTO } from '../Dto/dto'
import { sendMessage, getSessionId } from '../network/wsConnection'
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

  const activeChatRef = useRef(activeChat)
  activeChatRef.current = activeChat
  const typingTimeoutRef = useRef({})
  const pendingGalleryRef = useRef(false)
  const chatSessionEnvRef = useRef(null)
  const bufferOfPendingMessagesRef = useRef({})

  useEffect(() => {
    const chatRequest = createChatRoomDTO(currentUser.userId, getSessionId())
    sendMessage(JSON.stringify(chatRequest))
  }, [currentUser?.userId])


  useEffect(() => {
    if (!activeChat) return
    const epoch = chatSessionEnvRef.current.conversationEpoch
    if (epoch == null) return
    //Change on ACTIVECHAT can fetch the initial messages only if the ACTIVECHAT is in transition
    if(chatSessionEnvRef.current.alreadyFetchedInitial()) return;
      
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



  const handleLoadOlder = useCallback(() => {
    const env = chatSessionEnvRef.current
    if (!env) return
    const oldestId = env.pagination.requestOlder(messages)
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
    if(chatSessionEnvRef.current?.state === 'transitioning') {
      console.log('Seen action during transitioning for', chatSessionEnvRef.current.peerUserName)
      return
    }
    else if(chatSessionEnvRef.current?.state === 'newChat') {
      console.log('Seen action during newChat transition for', chatSessionEnvRef.current.peerUserName)
      return
    }
    const chat = activeChatRef.current
    const pagination = chatSessionEnvRef.current?.pagination
    if (!chat || !currentUser || messageId == null) return
    if (pagination?.lastSeenSentId === messageId) return
    if (pagination) pagination.lastSeenSentId = messageId
    const req = createSeenDTO(chat.chatRoomId, currentUser.userId, messageId, getSessionId())
    sendMessage(JSON.stringify(req))
  }, [currentUser])

  const handleMessageSent = useCallback((payload) => {
    if(activeChatRef.current == null || currentUser == null) return 
    if(chatSessionEnvRef.current.state === 'transitioning') {
      console.log('Message sent during transitioning for', chatSessionEnvRef.current.peerUserName)
      return
    }
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
     if(chatSessionEnvRef.current.state === 'newChat') { 
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
      }
      else if(chatSessionEnvRef.current.subState === `firstMessageSent`) {
        console.log('Subsequent message sent for new chat with', chatSessionEnvRef.current.peerUserName)
        const pendingByPeer = bufferOfPendingMessagesRef.current
        const key = payload.correspondentName
        if (!pendingByPeer[key]) pendingByPeer[key] = []
        pendingByPeer[key].push(payload)
      }
    }
    else if(chatSessionEnvRef.current.state === 'existingChat') {
      console.log('Message sent for existing chat with', chatSessionEnvRef.current.peerUserName, 'chatRoomId:', activeChatRef.current.chatRoomId,payload.chatRoomId)

      
   const req  = createSendMessageStruct(
    payload.currenUsername,
    payload.correspondentName,
    payload.content,
    payload.senderId,
    payload.chatRoomId,
    payload.temporaryId,
    payload.getSessionId
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

     if (activeChatRef.current?.correspondentName === chat.correspondentName) return
        chatSessionEnvRef.current = new ChatSessionEnvironment({chat})
        chat.transitioning = true
    dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: chat })
  }, [])


  const  selectChatByName = useCallback((correspondentName) => {
    if (activeChatRef.current?.correspondentName === correspondentName) return
    const chat = chats.find((c) => c.correspondentName === correspondentName)
    if (chat) {
      chatSessionEnvRef.current = new ChatSessionEnvironment({chat})
      chat.transitioning = true
      dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: chat })
      return
    }
     console.log('Not found existing chat for', correspondentName)
     
      chatSessionEnvRef.current = new ChatSessionEnvironment({chat:{correspondentName: correspondentName, chatRoomId: null}})
      dispatch({ type: 'SELECT_ACTIVE_CHAT', payload:  {correspondentName:correspondentName, chatRoomId: null, transitioning: true}} )
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
    },
    subscriptionDeps: {
      dispatch,
      activeChatRef,
      pendingGalleryRef,
      typingTimeoutRef,
      chatSessionEnvRef,
      bufferOfPendingMessagesRef,
    },
  }
}
