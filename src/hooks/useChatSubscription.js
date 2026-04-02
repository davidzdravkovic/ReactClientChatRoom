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
          console.log('Received messages for chatIdentifier', echoed, 'current env chatIdentifier', env.conversationEpoch, 'env.state:', env.state)
          const { validSession, mergeMode } = env.fetchResponseCheck(echoed)
          if (!validSession) return
        //The response arrived to the valid session

        //The transition is complete with the first fetch response
        //Now we can decide the type of the ACTIVECHAT and we are ending for both types the transitioning state
          if(activeChatRef.current.transitioning) {
            //Derived data from already existing chat 
              const chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
              const userId = msgData.data.find((m) => m.SenderId != null && m.SenderId !== currentUser.userId)?.SenderId ?? null
              if(chatRoomId)  {
               activeChatRef.current.chatRoomId = chatRoomId
               if(userId) activeChatRef.current.otherUserId = userId
               activeChatRef.current.state = 'existingChat'
               env.state = 'existingChat'
              }
              else {
                //Derived data from the messages is not complete so we are considering it as new chat
                env.state = 'newChat'
                env.subState = 'noFirstMessageSent'
                activeChatRef.current.state = 'newChat'
              }
              

            console.log('Transitioning complete for', env.peerUserName)
            activeChatRef.current.transitioning = false
            env.setInitialFetchDone()
            dispatch({ type: 'SELECT_ACTIVE_CHAT', payload: activeChatRef.current })
            } 
            console.log('Dispatching messages for chatIdentifier', echoed, 'mergeMode', mergeMode)
           dispatch({ type: 'FETCH_MESSAGES_RESPONSE',payload: msgData, mergeMode,})
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

            const peer = env.peerUserName
            const pendingList = bufferOfPendingMessagesRef.current[peer] ?? []
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
            bufferOfPendingMessagesRef.current[peer] = []
          }

          break

        default:
          break
      }
    })

    return () => unsubscribe()
  }, [currentUser])
}
