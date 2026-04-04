import { memo } from 'react'
import './MessageBubble.css'
import { useChatContext } from '../../context/ChatContext'

const MessageBubble = memo(function MessageBubble({ isMine, isSeen, isSending = false, showSeenIndicator = false, senderUserName, content, time, timeFull, hasImage, imageUrl, mediaId, imageLoading, showAvatar = true, avatarUrl }) {
  //LoadMessageImage function clicking on the image bubble is fetching the url for that bubble
  
  const { loadMessageImage, onMessageImageClick } = useChatContext()

  const bubbleClass = [
    'message-bubble',
    isMine ? 'message-bubble--mine' : 'message-bubble--theirs',
    showAvatar ? '' : 'message-bubble--consecutive',
  ].filter(Boolean).join(' ')

  return (
    <div className={bubbleClass}>
      {!isMine && showAvatar && (
        <div className="message-bubble-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="message-bubble-avatar-img" />
          ) : (
            (senderUserName?.[0] ?? '?').toUpperCase()
          )}
        </div>
      )}
      {!isMine && !showAvatar && <div className="message-bubble-avatar-spacer" aria-hidden="true" />}
      <div className={`message-bubble-body${hasImage && (!content || !String(content).trim()) ? ' message-bubble-body--image-only' : ''}`}>
        {!isMine && showAvatar && senderUserName && (
          <div className="message-bubble-sender">{senderUserName}</div>
        )}
        
        {hasImage ? ( // The message is image/media
          <div className="message-bubble-image-wrap">
            <div className="message-bubble-image">
              {imageUrl ? (
                <button
                  type="button"
                  className="message-bubble-image-btn focus-ring"
                  onClick={() => onMessageImageClick?.(imageUrl)}
                  aria-label="View image full screen"
                >
                  <img src={imageUrl} alt="" className="message-bubble-image-img" loading="lazy" />
                  <span className="message-bubble-image-overlay" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </span>
                </button>
              // We have the image in a buffer but not loaded yet
              ) : imageLoading ? (
                <div className="message-bubble-image-loading">
                  <span className="message-bubble-image-spinner" aria-hidden="true" />
                  <span className="message-bubble-image-loading-text">Loading…</span>
                </div>
              ) : // We do not have image so then the media server can try to fetch 
                (
                <button
                  type="button"
                  className="message-bubble-image-load focus-ring"
                  onClick={() => loadMessageImage?.(mediaId)}
                  aria-label="Load image"
                >
                  <span className="message-bubble-image-load-icon" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </span>
                  <span className="message-bubble-image-load-label">Tap to load image</span>
                </button>
              )}
            </div>
            {content && String(content).trim() && (
              <div className="message-bubble-image-caption message-bubble-text">{content}</div>
            )}
          </div>
        ) : (
          <div className="message-bubble-text">{content}</div>
        )}
        <div className="message-bubble-footer">
          <time className="message-bubble-time" dateTime={timeFull || undefined} title={timeFull || undefined}>
            {time}
          </time>
          {isMine && isSending && (
            <span className="message-bubble-sending" aria-label="Sending" title="Sending…">
              Sending…
            </span>
          )}
          {isMine && !isSending && showSeenIndicator && (
            <span
              className={`message-bubble-seen ${isSeen ? 'message-bubble-seen--read' : ''}`}
              aria-label={isSeen ? 'Read by recipient' : 'Sent'}
              title={isSeen ? 'Seen' : 'Sent'}
            >
              {isSeen ? (
                <>
                  <svg className="message-bubble-seen-icon message-bubble-seen-icon--double" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 6l3 3 6-7" />
                    <path d="M13 6l3 3 6-7" />
                  </svg>
                  <span className="message-bubble-seen-label">Seen</span>
                </>
              ) : (
                <svg className="message-bubble-seen-icon message-bubble-seen-icon--single" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6l3 3 6-7" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

export default MessageBubble
