import { useEffect, useRef } from 'react'
import { createSendMessageStruct } from '../Dto/dto'
import { subscribeMessages,sendMessage } from '../network/wsConnection'

const TYPING_STALE_MS = 5000
const MESSAGE_STORAGE_WINDOW = 14

function capMessageWindow(list, max = MESSAGE_STORAGE_WINDOW) {
  if (list.length <= max) return list
  //Before indexes of the result = lenght - max are dropped after are keept
  return list.slice(list.length - max)
}

export function useChatSubscription(
  currentUser,
  dispatch,
  activeChatRef,
  pendingGalleryRef,
  typingTimeoutRef,
  bufferOfPendingMessagesRef,
  chatSessionEnvRef,
  messageStorageRef,
) {
  const dispatcherRef = useRef(dispatch)
  dispatcherRef.current = dispatch


  function fanOutBuffereMessages(otherUserName,chatRoomId) {
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
  function setUpIfFirstMessage (otherUserName,chatRoomId,otherUserId) {
              const env = chatSessionEnvRef.current
              if (!env) return
             
          //If there are stale messages in the buffer fan out
          const pendingForPeer = otherUserName ? bufferOfPendingMessagesRef.current[otherUserName] : null
          if (pendingForPeer &&  pendingForPeer.length > 0) {
            fanOutBuffereMessages(otherUserName, chatRoomId)
          }
          //Change the current session if the response matches the current session with same username
           if (otherUserName !== env?.peerUserName) return
  

          if (env.state === 'newChat' && chatRoomId) {
            env.chatRoomId = chatRoomId
            env.state = 'existingChat' //the user now can send normal messages + can send image messages
            activeChatRef.current.chatRoomId = chatRoomId 
            activeChatRef.current.otherUserId = otherUserId //updates the avatar
            dispatch({ type: 'UPDATE_ACTIVE_CHAT', payload: activeChatRef.current })
          }

  }



  function appendLastMessageStorage(message) {
  const username = message.Sender
  if (!username) return

  if (!messageStorageRef.current[username])  messageStorageRef.current[username] = []

  const list = messageStorageRef.current[username]

  const exists = list.some((m) =>(m.messageId === message.messageId))
  if (exists) return

  let inserted = false

  for (let i = list.length - 1; i >= 0; i--) {
    if (message.messageId > list[i].messageId) {
        list.splice(i + 1, 0, message)
        inserted = true
        break
    }
  }

  
  if (!inserted) {
    //If the message is the smallest is added in front
    list.unshift(message)
  }

  //Keep the window of 14 messages chop from front
  if (list.length > MESSAGE_STORAGE_WINDOW) {
    list.splice(0, list.length - MESSAGE_STORAGE_WINDOW)
  }
}

 
  /**
   * Merge the trailing slice from FETCH (`messages`) with `messageStorageRef` for this peer.
   * Returns the new storage array (caller assigns to the ref).
   */
  function reconsidilation(messages, peerUserName) {
    if (!messageStorageRef.current[peerUserName]) {
      messageStorageRef.current[peerUserName] = []
    }
    const stored = messageStorageRef.current[peerUserName]

  
    if (messages.length === 0) {
      return stored
    }

    if (stored.length === 0) {
      return capMessageWindow(messages)
    }

    const fetchedLast = messages[messages.length - 1]
    const storedLast = stored[stored.length - 1]
    const fetchLastId = fetchedLast?.messageId
    const storageLastId = storedLast?.messageId

    // Server batch is strictly newer than everything in local storage → replace window.
    if (fetchLastId > storageLastId) {
      return capMessageWindow(messages)
    }

    // Same newest id → treat fetch as source of truth for this window.
    if (fetchLastId === storageLastId) {
      return capMessageWindow(messages)
    }

    //Local tail is newer than the last message in this fetch: append stored items with id > fetchLastId.
    //The split is index that is pointing to the less smallest from storage with messages -> message id
    let split = stored.length
    for (let i = stored.length - 1; i >= 0; i--) {
      const mid = stored[i]?.messageId

      if (mid <= fetchLastId) {
        split = i + 1
        break
      }
    }
  
    if (split === stored.length) {
      split = 0
    }
    //Local tail are the messages from the MESSAGESTORAGE who are bigger then the last message from the FETCHED messages response
    const localTail = stored.slice(split)
    const combined = [...messages, ...localTail]
    return capMessageWindow(combined)
  }

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

        //Made only entry for non existing chats maybe the user sent or received before this response !
                for (let i = 0; i < msgData.data.length; ++i) {
                const username = msgData.data[i].other_username
                if (!messageStorageRef.current[username])  messageStorageRef.current[username] = [] 
        
                    }

          dispatch({ type: 'RECENT_CHATROOM_RESPONSE', payload: msgData })
          break

                   
        case 'FETCH_MESSAGES_RESPONSE': {
      
              const env = chatSessionEnvRef.current
              if (!env) return
              const echoed = msgData.data.find((m) => m.chatIdentifier)?.chatIdentifier ?? null
              const { validSession, mergeMode } = env.fetchResponseCheck(echoed)
              
             if (!validSession) return

        

              const peerUserId = msgData.data.find((m) => m.otherUserId != null)?.otherUserId ?? null
              const barier = msgData.data.find((m)=> m.endOfInitialSize != null)?.endOfInitialSize ?? null
              const sizeOfData = msgData.data.length

             // Take lastMessages first, then slice the initial messages

              const lastMessages = msgData.data.slice(barier +1, sizeOfData)
              msgData.data = msgData.data.slice(0, barier)
              const finalStorageMessages = reconsidilation(lastMessages, env.peerUserName)
              //What if is new chat do we need fisrst to create the entry or this is creating if does not exists ?
              messageStorageRef.current[env.peerUserName] = finalStorageMessages
      

          if (!activeChatRef.current.initialFetchDone) {
            let lastInitialFetch = true
            const chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
            //EXISTINGCHAT
            if (chatRoomId) {
              if (activeChatRef.current.chatRoomId === null) activeChatRef.current.chatRoomId = chatRoomId
              env.chatRoomId = chatRoomId
              env.state = 'existingChat'
            }
            //NEWCHAT 
            else {
              const hasMessage = messageStorageRef?.current[env.peerUserName]?.length > 0
              if (!env.chatAcknowledge && !hasMessage ) {
              env.state = 'newChat'
              env.subState = 'noFirstMessageSent'
              }
              else if(env.chatAcknowledge) {
                //refetch for to refetch the first message sent
                //Why refetch, i uniform this cause the ACK and CHATROOM_ID can make race and one is only caring the message ACK
                //Either i should make a separate flag to differient them or i should like now take refetch always 
                // I do not set here to existing cause one more fetch is expected  
              lastInitialFetch = false
              
              }
              else if(hasMessage) {
               //here should take the messages from the storage
               //Here i need to extract the chatRoomId from the stored message 
               const firstMessage = messageStorageRef?.current[env.peerUserName][0]
               activeChatRef.current.chatRoomId = firstMessage.chatroom_id
               env.chatRoomId = firstMessage.chatroom_id 
              env.state = 'existingChat' 
              //Add the message from the storage with the initial all 14 or below
               const storageMessages = messageStorageRef?.current[env.peerUserName]
               //I need to be carefull how i gave the messages to fetch cause expects certain format 
               msgData.data = storageMessages
              }
            }     
            if(lastInitialFetch) 
             {activeChatRef.current.initialFetchDone = true
            if(activeChatRef.current.otherUserId === null) activeChatRef.current.otherUserId = peerUserId
            //Cause the initial fetch is true there is no new initial fetched by updating the state
            //Must be called to change the availability to send image cause component is dependent on this chat state transition 
            dispatch({ type: 'UPDATE_ACTIVE_CHAT', payload: activeChatRef.current })
              }
          }
          dispatch({ type: 'FETCH_MESSAGES_RESPONSE', payload: msgData, mergeMode })

          if (env.pendingSeed) {
            env.pendingSeed = false
            const raw = messageStorageRef.current[env.peerUserName] ?? []
            const formatted = raw.map(m => ({
              id: m.messageId ?? `temp-${m.temporaryId}`,
              content: m.Content,
              senderId: m.SenderId,
              time: m.Time,
              mediaId: m.mediaId,
              chatRoomId: m.chatroom_id,
              temporaryId: m.temporaryId,
            }))
            if (formatted.length > 0) {
              dispatcherRef.current({ type: 'SEED_FROM_STORAGE', payload: formatted })
            }
          }
          
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
        case 'MESSAGE_RESPONSE': {
          const chatRoomid = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
          const otherUserId = msgData.data.find((m) => m.SenderId != null)?.SenderId ?? null

          if (msgData.response === `MESSAGE_RESPONSE`) {
            const otherUserName = msgData.data.find((m) => m.Sender != null)?.Sender ?? null
            const message = msgData.data.find((m) => m.messageId != null)
            appendLastMessageStorage(message)
            setUpIfFirstMessage(otherUserName, chatRoomid, otherUserId)
          } 
          else if (msgData.response === `MESSAGE_ACK_RESPONSE`) {
            const otherUserName =msgData.data.find((m) => m.ReceiverUserName != null)?.ReceiverUserName ?? null
            if(!activeChatRef.current.initialFetchDone && otherUserName === chatSessionEnvRef.current.peerUserName) {
              chatSessionEnvRef.current.chatAcknowledge = true
            }
            setUpIfFirstMessage(otherUserName, chatRoomid, otherUserId)
          }

          dispatch({
            type: msgData.response,
            payload: msgData,
            activeChatId: activeChatRef.current?.chatRoomId,
            correspondentName: activeChatRef.current?.correspondentName,
            otherUserId: activeChatRef.current?.otherUserId,
            currentUserId: currentUser?.userId,
          })
          break
        }

        case 'ACTIVE_STATUS_RESPONSE':
          dispatch({ type: 'ACTIVE_STATUS_RESPONSE', payload: msgData })
          break

        case 'SEEN_RESPONSE':
          dispatch({ type: 'SEEN_RESPONSE', payload: msgData })
          break
        
        case 'CHATROOM_ID_RESPONSE': {
          const otherUserName = msgData.data.find((m) => m.receiver_UserName != null) ?.receiver_UserName ?? null
          const chatRoomId = msgData.data.find((m) => m.chatroom_id != null)?.chatroom_id ?? null
          const otherUserId = msgData.data.find((m) => m.receiver_id != null)?.receiver_id ?? null

           if(!activeChatRef.current.initialFetchDone) {
              chatSessionEnvRef.current.chatAcknowledge = true
             }
             setUpIfFirstMessage(otherUserName, chatRoomId, otherUserId)
          break
        }
        

        default:
          break
      }
    })

    return () => unsubscribe()
  }, [currentUser])
}
