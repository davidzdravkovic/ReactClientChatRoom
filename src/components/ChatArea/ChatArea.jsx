import './ChatArea.css'
import ChatEmpty from '../ChatEmpty/ChatEmpty'
import ChatConversation from '../ChatConversation/ChatConversation'
import ChatInputBar from '../ChatInputBar/ChatInputBar'
import { getAvatarColor } from '../../utils/avatarColor'
import { useChatContext } from '../../context/ChatContext'

function ChatArea({ activeChat, activeChatOnline, canAttachImage, onLogout, messages, typingForActiveChat, lastSeenMessageId = null, onOpenGallery, onMessageSent, onLoadOlder, onLoadNewer, onSeen, onTyping, onChatImageFile }) {
  const {avatarByUserId } = useChatContext()
  //From activeChat we are extracting for the current user info plus Ui display 2 paths for rendering empty chat or ChatConversation
  const correspondentName = activeChat?.correspondentName
  const avatarColor = getAvatarColor(correspondentName)
  const correspondentAvatarUrl = activeChat ? avatarByUserId[activeChat.otherUserId] : null

  return (
    <div className="chat-area" role="main" aria-label={activeChat ? `Chat with ${correspondentName}` : 'Select a conversation'}>
      <header className="chat-area-header">
        <div className="chat-area-who">
          <div className="chat-area-avatar-wrap">
            <div
              className={`chat-area-avatar${correspondentAvatarUrl ? ' chat-area-avatar--has-img' : ''}`}
              style={{
                ['--avatar-bg']: avatarColor.bg,
                ['--avatar-border']: avatarColor.border,
              }}
              aria-hidden="true"
            >
              {correspondentAvatarUrl ? (
                <img src={correspondentAvatarUrl} alt="" className="chat-area-avatar-img" />
              ) : (
                (correspondentName?.[0] ?? '?').toUpperCase()
              )}
            </div>
          </div>
          <div className="chat-area-info">
            <span className="chat-area-name">{correspondentName ?? 'Select a chat'}</span>
            <span
              className={`chat-area-status ${activeChatOnline ? 'chat-area-status--online' : 'chat-area-status--offline'}`}
              aria-live="polite"
            >
              {activeChat ? (activeChatOnline ? 'Online' : 'Offline') : 'Pick a conversation from the left'}
            </span>
          </div>
        </div>
        <button type="button" className="chat-area-logout focus-ring" onClick={onLogout} aria-label="Log out">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M10 17v-2h4v-6h-4V7l-5 5 5 5Zm9 4H13v-2h6V5h-6V3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z" />
          </svg>
        </button>
      </header>

      <div className="chat-area-body">
        {!activeChat && (
          <ChatEmpty />
        )}
         {activeChat && activeChat.initialFetchDone !== false && (
          <>
            <ChatConversation
              activeChat={activeChat}
              messages={messages}
              typingUser={typingForActiveChat}
              lastSeenMessageId={lastSeenMessageId}
              onLoadOlder={onLoadOlder}
              onLoadNewer={onLoadNewer}
              onSeen={onSeen}
            />
            <ChatInputBar
              activeChat={activeChat}
              canAttachImage={canAttachImage}
              onMessageSent={onMessageSent}
              onGalleryClick={onOpenGallery}
              onSendTyping={onTyping}
              onChatImageFile={onChatImageFile}
            />
          </>
        )}
        {activeChat && activeChat.initialFetchDone === false && (
          <div className="chat-area-transitioning-overlay" aria-live="assertive">
            Loading chat...
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatArea
