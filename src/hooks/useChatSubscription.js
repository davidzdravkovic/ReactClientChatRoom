import { useEffect, useRef } from 'react'
import { createSendMessageStruct } from '../Dto/dto'
import { subscribeMessages,sendMessage } from '../network/wsConnection'

const TYPING_STALE_MS = 5000

export function useChatSubscription(
  currentUser,
  dispatch,
  activeChatRef,
  pendingGalleryRef,
  typingTimeoutRef,
  bufferOfPendingMessagesRef,
  chatSessionEnvRef,
) {
  const dispatcherRef = useRef(dispatch)
  dispatcherRef.current = dispatch


  useEffect(() => {
    if (!currentUser?.userId) return

    const unsubscribe = subscribeMessages((event) => {
      let msgData
      try {
        msgData = JSON.parse(event.data)
      } catch {
        return
      }


      switch (msgData.response) {
      

        case 'RECENT_CHATROOM_RESPONSE':
     
          dispatch({ type: 'RECENT_CHATROOM_RESPONSE', payload: msgData })
          break

        case 'FETCH_MESSAGES_RESPONSE': {
          const env = chatSessionEnvRef.current
          if (!env) return

          const echoed = msgData.data.find((m) => m.chatIdentifier)?.chatIdentifier ?? null
          const peerUserId = msgData.data.find((m) => m.otherUserId != null)?.otherUserId ?? null

          console.log('Received messages for chatIdentifier',echoed,'current env chatIdentifier',env.conversationEpoch,'env.state:',env.state)
          const { validSession, mergeMode } = env.fetchResponseCheck(echoed)
          if (!validSession) return

          if (!activeChatRef.current.initialFetchDone) {
            const chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
            //EXISTINGCHAT
            if (chatRoomId) {
              if (activeChatRef.current.chatRoomId === null) activeChatRef.current.chatRoomId = chatRoomId
              activeChatRef.current.state = 'existingChat'
              env.state = 'existingChat'
            }
            //NEWCHAT 
            else {
              env.state = 'newChat'
              env.subState = 'noFirstMessageSent'
              activeChatRef.current.state = 'newChat'
            }
            if (activeChatRef.current.otherUserId === null) activeChatRef.current.otherUserId = peerUserId
            console.log('Initial fetch complete for', env.peerUserName)
            activeChatRef.current.initialFetchDone = true
            //Cause the initial fetch is true there is no new initial fetched by updating the state
            dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: activeChatRef.current })
          }
          console.log('Dispatching messages for chatIdentifier', echoed, 'mergeMode', mergeMode)
          dispatch({ type: 'FETCH_MESSAGES_RESPONSE', payload: msgData, mergeMode })
          break
        }

        case 'FETCH_IMAGES_FOR_CHAT_RESPONSE':
          if (pendingGalleryRef.current) {
            dispatch({ type: 'FETCH_IMAGES_FOR_CHAT_RESPONSE', payload: msgData })
            pendingGalleryRef.current = false
          }
          break

        case 'TYPING_RESPONSE': {
          const chatRoomId = msgData.data[0]?.chatRoomId
          dispatch({ type: 'TYPING_RESPONSE', payload: msgData })
          if (chatRoomId != null) {
            if (typingTimeoutRef.current[chatRoomId]) {
              clearTimeout(typingTimeoutRef.current[chatRoomId])
              typingTimeoutRef.current[chatRoomId] = null
            }
            const isTyping = msgData.data[0]?.isTyping === 'true'
            const senderUserName = msgData.data[0]?.senderUserName
            if (isTyping && senderUserName) {
              typingTimeoutRef.current[chatRoomId] = setTimeout(() => {
                typingTimeoutRef.current[chatRoomId] = null
                dispatch({ type: 'TYPING_STALE_CLEAR', chatRoomId })
              }, TYPING_STALE_MS)
            }
          }
          break
        }

        case 'MESSAGE_ACK_RESPONSE':
        case 'MESSAGE_RESPONSE':
          //Update the state to EXISTINGCHAT if is first message for the ROOM 
          if(activeChatRef.current.chatRoomId === null) {
             activeChatRef.current.chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
            chatSessionEnvRef.current.chatRoomId = activeChatRef.current.chatRoomId
              console.log('Received chatRoomId for new chat transition on message response', activeChatRef.current.chatRoomId) 
              chatSessionEnvRef.current.state = 'existingChat'
             dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: activeChatRef.current }) }    
 
             dispatch({
            type: msgData.response,
            payload: msgData,
            activeChatId: activeChatRef.current?.chatRoomId,
            correspondentName: activeChatRef.current?.correspondentName,
            otherUserId: activeChatRef.current?.otherUserId,
            currentUserId: currentUser?.userId,
          })
          break

        case 'ACTIVE_STATUS_RESPONSE':
          dispatch({ type: 'ACTIVE_STATUS_RESPONSE', payload: msgData })
          break

        case 'SEEN_RESPONSE':
          dispatch({ type: 'SEEN_RESPONSE', payload: msgData })
          break
        
        case `CHATROOM_ID_RESPONSE`:
          console.log('Received chatRoomId response for', chatSessionEnvRef.current?.peerUserName, 'data:', msgData.data)
          const chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
          const otherUserId = msgData.data.find((m) => m.receiver_id != null)?.receiver_id ?? null
          const otherUserName = msgData.data.find((m) => m.receiver_UserName != null)?.receiver_UserName ?? null
  
          console.log('Received chatRoomId response for', chatSessionEnvRef.current?.peerUserName, 'chatRoomId:', chatRoomId, 'otherUserId:', otherUserId)
          if (chatSessionEnvRef.current?.state === 'newChat' && chatRoomId) {
            console.log('Received chatRoomId for new chat transition', chatRoomId)
            const env = chatSessionEnvRef.current
            env.chatRoomId = chatRoomId
            env.state = 'existingChat'
            activeChatRef.current.chatRoomId = chatRoomId
            activeChatRef.current.otherUserId = otherUserId
            activeChatRef.current.state = 'existingChat'
            dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: activeChatRef.current })

            //The peer name can be different at this point so the DTO needs to carry the username of the peer
        
            const pendingList = bufferOfPendingMessagesRef.current[otherUserName] ?? []
            pendingList.forEach((pending) => {
              const req = createSendMessageStruct(
                pending.currenUsername,
                pending.correspondentName,
                pending.content,
                pending.senderId,
                chatRoomId,
                pending.temporaryId,
                pending.getSessionId,
              )
              sendMessage(JSON.stringify(req))
            })
            bufferOfPendingMessagesRef.current[otherUserName] = []
          }

          break

        default:
          break
      }
    })

    return () => unsubscribe()
  }, [currentUser])
}
