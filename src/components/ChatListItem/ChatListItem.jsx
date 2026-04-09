import { memo } from 'react'
import './ChatListItem.css'
import { getAvatarColor } from '../../utils/avatarColor'

/** Small camera in the last-message preview row (not the contact avatar). */
function LastMessagePhotoIcon() {
  return (
    <svg
      className="chat-list-item-preview-photo-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M9 3a2 2 0 0 0-2 2v1H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1V5a2 2 0 0 0-2-2H9Zm0 2h6v1H9V5Zm3 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
      />
    </svg>
  )
}



const ChatListItem = memo(function ChatListItem({ chat, isActive, onSelect, avatarUrl, typing}) {
  const { correspondentName, lastMessage, online, chatRoomId } =
    chat
  const typingUser = typing?.[chatRoomId] && typing[chatRoomId] !== null
  const previewText = lastMessage !== ""
  /** Row is from a real last message (recent/ack) but text is empty — e.g. image with no caption and no media_id on the wire. */
  const name = correspondentName
  const initials = (name)
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
  const avatarColor = getAvatarColor(name)
  const statusLabel = online ? 'Online' : 'Offline'

  return (
    <li className="chat-list-item">
      <button
        type="button"
        className={`chat-list-item-btn ${isActive ? 'chat-list-item-btn--active' : ''} ${online ? 'chat-list-item-btn--online' : 'chat-list-item-btn--offline'}`}
        onClick={() => onSelect?.(chat)}
        title={`${name} · ${statusLabel}`}
        aria-label={`Chat with ${name}, ${statusLabel}`}
      >
        <div
          className={`chat-list-item-avatar ${online ? 'chat-list-item-avatar--online' : 'chat-list-item-avatar--offline'}${
            avatarUrl ? ' chat-list-item-avatar--has-img' : ''
          }`}
          style={{
            ['--avatar-bg']: avatarColor.bg,
            ['--avatar-border']: avatarColor.border,
          }}
          aria-hidden="true"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="chat-list-item-avatar-img" />
          ) : (
            <span className="chat-list-item-avatar-initials">{initials}</span>
          )}
          <span className="chat-list-item-avatar-status" aria-label={statusLabel}>
            <span className="chat-list-item-avatar-status-dot" />
          </span>
        </div>
        <div className="chat-list-item-body">
          <span className="chat-list-item-name">{name}</span>
          <span className={`chat-list-item-status ${online ? 'chat-list-item-status--online' : 'chat-list-item-status--offline'}`}>
            {statusLabel}
          </span>
          {typingUser ? (
            <span className="chat-list-item-preview chat-list-item-preview--typing">
              <span className="typing">Typing</span>
            </span>
          ) : !previewText ? (
            <span
              className="chat-list-item-preview chat-list-item-preview--photo"
              title={'Photo'}
            >
              <LastMessagePhotoIcon />
              <span className="chat-list-item-preview-photo-text">
                {'Photo'}
              </span>
            </span>
          ) : previewText ? (
            <span className="chat-list-item-preview">{lastMessage} </span>
          ) : null}
        </div>
      </button>
    </li>
  )
})

export default ChatListItem
