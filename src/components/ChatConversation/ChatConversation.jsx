import { useEffect, useRef } from 'react'
import './ChatConversation.css'
import MessageBubble from '../MessageBubble/MessageBubble'
import { useChatContext } from '../../context/ChatContext'
import { buildConversationItems } from './chatConversationItems'
import { getAvatarColor } from '../../utils/avatarColor'

      const topThreshold = 100
      const bottomThreshold = 250


function ChatConversation({ activeChat, messages, typingUser, lastSeenMessageId = null, onLoadOlder, onLoadNewer, onSeen }) {
  const { currentUser, avatarByUserId, messageImageByMediaId, loadingMediaIds,setCounterPagination } = useChatContext()

  const showTyping = typingUser?.isTyping && typingUser?.senderUserName && typingUser.senderUserName !== currentUser?.userName
  const correspondentLabel = activeChat?.correspondentName ?? typingUser?.senderUserName ?? ''
  const typingAvatarUrl =
    activeChat?.otherUserId != null ? avatarByUserId[activeChat.otherUserId] : null
  const typingAvatarColor = getAvatarColor(correspondentLabel)
  const scrollRef = useRef(null)
  const triggerScrollPos = useRef(false)


 if (!activeChat) return null

  const items = buildConversationItems({
    messages,
    currentUser,
    correspondentName: activeChat.correspondentName,
    lastSeenMessageId,
    avatarByUserId,
    messageImageByMediaId,
    loadingMediaIds,
  })
    const setSeen = () => {
    if (!activeChat || !messages?.length) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.senderId === currentUser.userId) return
    const msgId = lastMsg.id
    if (msgId == null) return
    onSeen(msgId)
  }


  //On new message scroll the user to the bottom ##New message append message fetch or message request (if the user is at the threshold)##
  //On typing show the typing indicator and scroll to the bottom if the user is near the bottom
useEffect(() => {

 
  const el = scrollRef.current
  if (!el) return


  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < bottomThreshold
  if (atBottom) {
    el.scrollTo({ top: el.scrollHeight })
    triggerScrollPos.current = false
    setSeen()
  }
}, [messages, showTyping])
   
    
      const onScroll = () => {
      const el = scrollRef.current
      if (!el) return 
      const notAtTop = el.scrollTop > topThreshold  
      const notAtBottom =el.scrollHeight - el.scrollTop - el.clientHeight > bottomThreshold
      const neutral = (notAtTop) && (notAtBottom)
      if(neutral) {
        triggerScrollPos.current = true;
        return;
      }
     if(triggerScrollPos.current === true) {
      if(!notAtBottom) {
        onLoadNewer?.()
        setCounterPagination?.()
        triggerScrollPos.current = false;
        setSeen()
      }
      else if(!notAtTop) {
        onLoadOlder?.()
        setCounterPagination?.()
        triggerScrollPos.current = false;
      }
     }
    }

 

  return (
    <div className="chat-conversation">
      <div className="chat-conversation-scroll" ref={scrollRef} onScroll={() => {onScroll()}}>
        {items.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="chat-conversation-date" role="separator">
                <span>{item.label}</span>
              </div>
            )
          }
          const { message, isMine, isSeen, isSending, showSeenIndicator, senderUserName, showAvatar, formattedTime, timeFull, hasImage, imageUrl, mediaId, imageLoading, avatarUrl } = item
          return (
            <MessageBubble
              key={item.key}
              isMine={isMine}
              isSeen={isSeen}
              isSending={isSending}
              showSeenIndicator={showSeenIndicator}
              senderUserName={senderUserName}
              content={message.content}
              time={formattedTime}
              timeFull={timeFull}
              hasImage={hasImage}
              imageUrl={imageUrl}
              mediaId={mediaId}
              imageLoading={imageLoading}
              showAvatar={showAvatar}
              avatarUrl={avatarUrl}
            />
          )
        })}
        {showTyping && (
          <div className="chat-conversation-typing" role="status" aria-live="polite" aria-label={`${typingUser.senderUserName} is typing`}>
            <div
              className={`chat-conversation-typing-avatar${typingAvatarUrl ? ' chat-conversation-typing-avatar--has-img' : ''}`}
              style={{
                ['--avatar-bg']: typingAvatarColor.bg,
                ['--avatar-border']: typingAvatarColor.border,
              }}
              aria-hidden="true"
            >
              {typingAvatarUrl ? (
                <img src={typingAvatarUrl} alt="" className="chat-conversation-typing-avatar-img" />
              ) : (
                (correspondentLabel?.[0] ?? typingUser.senderUserName?.[0] ?? '?').toUpperCase()
              )}
            </div>
            <div className="chat-conversation-typing-bubble">
              <span className="chat-conversation-typing-dots" aria-hidden="true">
                <span className="chat-conversation-typing-dot" />
                <span className="chat-conversation-typing-dot" />
                <span className="chat-conversation-typing-dot" />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatConversation
