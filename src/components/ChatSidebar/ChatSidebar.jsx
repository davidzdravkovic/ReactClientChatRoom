import { useState, useId } from 'react'
import './ChatSidebar.css'
import ChatListItem from '../ChatListItem/ChatListItem'
import { getAvatarColor } from '../../utils/avatarColor'
import { useChatContext } from '../../context/ChatContext'

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)

function ChatSidebar({
  chats = [],
  activeChat,
  onSelectChat,
  onSelectChatByName,
  waitRecentChat,
  typingByChat,
  onProfileImageSelect,
}) {
  const profileInputId = useId()
  const { currentUser, avatarByUserId } = useChatContext()
  const [searchQuery, setSearchQuery] = useState('')
  const currentUserColor = getAvatarColor(currentUser?.userName)
  const myAvatarUrl = avatarByUserId[currentUser?.userId]
  const chatList = chats

  function handleSearchUser(e) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q === '') return
    onSelectChatByName?.(q)
    setSearchQuery('')
  }

  function handleProfileFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onProfileImageSelect?.(file)
    e.target.value = ''
  }

  return (
    <aside className="chat-sidebar" role="complementary" aria-label="Conversations">
      <div className="chat-sidebar-header">
        <form
          className="chat-sidebar-search"
          role="search"
          aria-label="Search conversations"
          onSubmit={handleSearchUser}
        >
          <label htmlFor="chat-sidebar-search-input" className="chat-sidebar-search-label">
            Search conversations
          </label>
          <input
            id="chat-sidebar-search-input"
            className="chat-sidebar-input focus-ring"
            type="search"
            placeholder="Search"
            autoComplete="off"
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="chat-sidebar-search-btn focus-ring" aria-label="Search">
            <SearchIcon />
          </button>
        </form>
        <div className="chat-sidebar-user">
          <div className="chat-sidebar-avatar-shell">
            <input
              id={profileInputId}
              className="chat-sidebar-profile-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/*"
              onChange={handleProfileFileChange}
              tabIndex={-1}
            />
            <label
              htmlFor={profileInputId}
              className="chat-sidebar-profile-upload"
              title="Update profile photo"
              aria-label="Update profile photo"
              tabIndex={0}
            >
              <span
                className={`chat-sidebar-avatar${myAvatarUrl ? ' chat-sidebar-avatar--has-img' : ''}`}
                style={{
                  ['--avatar-bg']: currentUserColor.bg,
                  ['--avatar-border']: currentUserColor.border,
                }}
                aria-hidden="true"
              >
                {myAvatarUrl ? (
                  <img src={myAvatarUrl} alt="" className="chat-sidebar-avatar-img" />
                ) : (
                  (currentUser?.fullName?.[0] ?? currentUser?.userName?.[0] ?? 'U').toUpperCase()
                )}
              </span>
              <span className="chat-sidebar-profile-veil" aria-hidden="true" />
              <span className="chat-sidebar-profile-camera" aria-hidden="true">
                <CameraIcon />
              </span>
            </label>
          </div>
          <div className="chat-sidebar-user-info">
            <span className="chat-sidebar-username">{currentUser?.fullName ?? 'User'}</span>
            <span className="chat-sidebar-status">Online</span>
          </div>
        </div>
        <h2 className="chat-sidebar-title" id="chat-sidebar-list-label">Recent Chats</h2>
      </div>
      <ul
        className="chat-sidebar-list"
        aria-labelledby="chat-sidebar-list-label"
        role="list"
      >
        {chatList.map((chat) => (
          <ChatListItem
            key={chat.chatRoomId}
            chat={chat}
            isActive={activeChat?.chatRoomId === chat.chatRoomId}
            onSelect={onSelectChat}
            avatarUrl={avatarByUserId[chat.otherUserId]}
            typing={typingByChat}
          />
        ))}
      </ul>
      {!waitRecentChat && (
        <p className="chat-sidebar-loading" aria-live="polite">
          Loading conversations...
        </p>
      )}
     {waitRecentChat && chatList.length === 0 && (
        <p className="chat-sidebar-empty" aria-live="polite">
          No conversations yet. Start a chat from the main app.
        </p>
      )}
    </aside>
  )
}

export { ChatSidebar }
export default ChatSidebar
