import './ChatEmpty.css'

function ChatEmpty() {
  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="chat-empty-title">No chat selected</h3>
      <p className="chat-empty-text">
        Pick a conversation from the left
        <br />
        or start a new one
      </p>
      <button type="button" className="chat-empty-btn focus-ring">Send message</button>
    </div>
  )
}

export default ChatEmpty
