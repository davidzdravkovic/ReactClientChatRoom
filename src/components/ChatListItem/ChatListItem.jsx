import { memo } from 'react'
import './ChatListItem.css'
import { getAvatarColor } from '../../utils/avatarColor'

const ChatListItem = memo(function ChatListItem({ chat, isActive, onSelect, avatarUrl, typing}) {
  const { correspondentName, lastMessage, online, chatRoomId } = chat
  const typingUser = typing?.[chatRoomId] && typing[chatRoomId] !== null 
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
          className={`chat-list-item-avatar ${online ? 'chat-list-item-avatar--online' : 'chat-list-item-avatar--offline'}${avatarUrl ? ' chat-list-item-avatar--has-img' : ''}`}
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
          {typingUser ? 
          (<span className='typing'>{name} is typing</span> )
          :
          (<span className="chat-list-item-preview">{lastMessage ?? 'No messages yet'}</span>)
          }
        </div>
      </button>
    </li>
  )
})

export default ChatListItem
