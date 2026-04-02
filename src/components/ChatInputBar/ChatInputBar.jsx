import { useState, useRef, useEffect } from 'react'
import './ChatInputBar.css'
import {  createTypingRequest } from '../../Dto/dto'
import { sendMessage as sendWsMessage, getSessionId } from '../../network/wsConnection'
import { useChatContext } from '../../context/ChatContext'

const TYPING_DEBOUNCE_MS = 300
const TYPING_IDLE_MS = 2500

function ChatInputBar({ activeChat, onMessageSent, onGalleryClick }) {
  const { currentUser } = useChatContext()
  const [text, setText] = useState('')
  const typingDebounceRef = useRef(null)
  const typingIdleRef = useRef(null)
  const lastTypingSentRef = useRef(false)
  const prevActiveChatRef = useRef(null)

  function sendTyping(typing) {
    if (!activeChat || !currentUser) return
    const payload = createTypingRequest(
      activeChat.correspondentName,
      currentUser.userName,
      currentUser.userId,
      activeChat.chatRoomId,
      typing,
      getSessionId()
    )
    sendWsMessage(JSON.stringify(payload))
    lastTypingSentRef.current = typing
  }

  function scheduleTypingStart() {
    if (!activeChat || !currentUser) return
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current)
      typingIdleRef.current = null
    }
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null
      sendTyping(true)
      typingIdleRef.current = setTimeout(() => {
        typingIdleRef.current = null
        sendTyping(false)
      }, TYPING_IDLE_MS)
    }, TYPING_DEBOUNCE_MS)
  }

  function cancelTypingAndSendStop() {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current)
      typingDebounceRef.current = null
    }
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current)
      typingIdleRef.current = null
    }
    if (lastTypingSentRef.current) {
      sendTyping(false)
    }
  }

  // When switching chat: send typing false for the previous chat and clear timers
  useEffect(() => {
    const prev = prevActiveChatRef.current
    prevActiveChatRef.current = activeChat
    if (prev && activeChat && prev.chatRoomId !== activeChat.chatRoomId && lastTypingSentRef.current) {
      const payload = createTypingRequest(prev.correspondentName, currentUser.userName, currentUser.userId, prev.chatRoomId, false, getSessionId())
      sendWsMessage(JSON.stringify(payload))
      lastTypingSentRef.current = false
    }
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current)
      typingDebounceRef.current = null
      typingIdleRef.current = null
    }
  }, [activeChat?.chatRoomId])

  function handleSubmit(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || !activeChat || !currentUser) return

    const now = new Date()
    const temporaryId = 1
    const timeStr = now.toISOString ? now.toISOString() : now.toLocaleString()

    // Optimistic: add bubble immediately with "Sending" (works even when server is offline)
    onMessageSent?.({
      currenUsername : currentUser.userName,
      correspondentName: activeChat.correspondentName,
      content,
      senderId: currentUser.userId,
      time: timeStr,
      temporaryId,
      chatRoomId: activeChat.chatRoomId,
      getSessionId: getSessionId(),
    })
    setText('')
    if(activeChat.state === `existingChat`) cancelTypingAndSendStop()
  }

  function handleInputChange(e) {
    setText(e.target.value)
     if(activeChat.state === `existingChat`) scheduleTypingStart()
  }

  function handleBlur() {
      if(activeChat.state === `existingChat`) cancelTypingAndSendStop()
  }

  return (
    <form
      className="chat-input-bar"
      role="form"
      aria-label="Compose message"
      onSubmit={handleSubmit}
    >
      <button type="button" className="chat-input-bar-btn chat-input-bar-btn--secondary focus-ring" aria-label="Add emoji">
        <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
          <path fill="currentColor" d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-18a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-3 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-3 6c-2.2 0-4.1-1.2-5.1-3l1.7-1c.7 1.2 2 2 3.4 2s2.7-.8 3.4-2l1.7 1c-1 1.8-2.9 3-5.1 3Z" />
        </svg>
      </button>
      <input
        className="chat-input-bar-input focus-ring"
        type="text"
        placeholder="Type a message…"
        aria-label="Message input"
        autoComplete="off"
        value={text}
        onChange={handleInputChange}
        onBlur={handleBlur}
      />
      <button type="submit" className="chat-input-bar-btn chat-input-bar-btn--send focus-ring" aria-label="Send message">
        <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
          <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
      <button type="button" className="chat-input-bar-btn chat-input-bar-btn--secondary focus-ring" aria-label="Attach image">
        <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
          <path fill="currentColor" d="M9 3a2 2 0 0 0-2 2v1H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1V5a2 2 0 0 0-2-2H9Zm0 2h6v1H9V5Zm3 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
        </svg>
      </button>
      <button
        type="button"
        className="chat-input-bar-btn chat-input-bar-btn--secondary focus-ring"
        aria-label="Gallery"
        onClick={onGalleryClick}
      >
        <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
          <path fill="currentColor" d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5Zm3-1a1 1 0 0 0-1 1v10.6l2.7-2.7a2 2 0 0 1 2.8 0l1.2 1.2 3.2-3.2a2 2 0 0 1 2.8 0L20 12.9V5a1 1 0 0 0-1-1H7Z" />
        </svg>
      </button>
    </form>
  )
}

export default ChatInputBar
