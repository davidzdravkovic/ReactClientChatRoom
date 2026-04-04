import { useState, useRef, useEffect, useId, useCallback } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import './ChatInputBar.css'
import { useChatContext } from '../../context/ChatContext'
import { nextClientTemporaryId } from '../../utils/nextClientTemporaryId'

const TYPING_DEBOUNCE_MS = 300
const TYPING_IDLE_MS = 2500

function ChatInputBar({ activeChat, onMessageSent, onGalleryClick, onSendTyping, onChatImageFile }) {
  const { currentUser } = useChatContext()
  const [text, setText] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  //Typing
  const typingDebounceRef = useRef(null)
  const typingIdleRef = useRef(null)
  const lastTypingSentRef = useRef(false)
  const prevActiveChatRef = useRef(null)
  //Emojy
  const emojiPopoverRef = useRef(null)
  //Image
  const chatImageInputRef = useRef(null)
  const chatImageInputId = useId()
  const canAttachImage = activeChat?.state === 'existingChat' && activeChat?.chatRoomId != null
  /** Picked image shown in the bar; upload starts only when user presses Send. */
  const [pendingImage, setPendingImage] = useState(null)

  const clearPendingImage = useCallback(() => {
    setPendingImage((p) => {
      if (p?.url) URL.revokeObjectURL(p.url)
      return null
    })
  }, [])

  useEffect(() => {
    clearPendingImage()
  }, [activeChat?.chatRoomId, clearPendingImage])


  function scheduleTypingStart() {
    if (!activeChat || !currentUser) return
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current)
      typingIdleRef.current = null
    }
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null
      onSendTyping(activeChat.correspondentName, activeChat?.chatRoomId, true)
          lastTypingSentRef.current = true
      typingIdleRef.current = setTimeout(() => {
        typingIdleRef.current = null
        onSendTyping(activeChat.correspondentName, activeChat?.chatRoomId, false)
            lastTypingSentRef.current = false
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
      onSendTyping(activeChat.correspondentName, activeChat?.chatRoomId, false)
          lastTypingSentRef.current = false
    }
  }

  // When switching chat: send typing false for the previous chat and clear timers.
  // Cleanup uses `activeForThisEffect` (chat when this run committed), not `prev` from first mount.
  useEffect(() => {
    const activeForThisEffect = activeChat
    const prev = prevActiveChatRef.current
    prevActiveChatRef.current = activeChat
    if (prev && activeChat && prev.chatRoomId !== activeChat.chatRoomId && lastTypingSentRef.current) {
      onSendTyping(prev.correspondentName, prev.chatRoomId, false)
      lastTypingSentRef.current = false
    }
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current)
      if (lastTypingSentRef.current && activeForThisEffect?.correspondentName != null) {
        onSendTyping(
          activeForThisEffect.correspondentName,
          activeForThisEffect.chatRoomId,
          false,
        )
        lastTypingSentRef.current = false
      }
      typingDebounceRef.current = null
      typingIdleRef.current = null
    }
  }, [activeChat?.chatRoomId])

  useEffect(() => {
    if (!emojiPickerOpen) return
    const onPointerDown = (e) => {
      if (emojiPopoverRef.current && !emojiPopoverRef.current.contains(e.target)) {
        setEmojiPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [emojiPickerOpen])

  function handleEmojiSelect(emoji) {
    const ch = emoji?.native ?? ''
    if (ch) setText((t) => t + ch)
    setEmojiPickerOpen(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!activeChat || !currentUser) return

    if (pendingImage?.file) {
      const file = pendingImage.file
      clearPendingImage()
      onChatImageFile?.(file)
      cancelTypingAndSendStop()
    return
    }

    const content = text.trim()
    if (!content) return

    const now = new Date()
    const temporaryId = nextClientTemporaryId()
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
    })
    setText('')
    cancelTypingAndSendStop()
  }

  function handleInputChange(e) {
    setText(e.target.value)
    scheduleTypingStart()
  }

  function handleBlur() {
    cancelTypingAndSendStop()
  }

  //Set image pending
  function handleChatImageChange(e) {
    const f = e.target.files?.[0]
    if (f) {
      setPendingImage((p) => {
        if (p?.url) URL.revokeObjectURL(p.url)
        return { file: f, url: URL.createObjectURL(f) }
      })
    }
    e.target.value = ''
  }

  return (
    <form
      className="chat-input-bar"
      role="form"
      aria-label="Compose message"
      onSubmit={handleSubmit}
    >
      {pendingImage && (
        <div className="chat-input-bar-pending-image" aria-live="polite">
          <div className="chat-input-bar-pending-image-inner">
            <img
              src={pendingImage.url}
              alt=""
              className="chat-input-bar-pending-thumb"
            />
            <div className="chat-input-bar-pending-meta">
              <span className="chat-input-bar-pending-label">Image ready to send</span>
              <span className="chat-input-bar-pending-hint">Press send to upload</span>
            </div>
            <button
              type="button"
              className="chat-input-bar-pending-remove focus-ring"
              aria-label="Remove image"
              onClick={clearPendingImage}
            >
              x
            </button>
          </div>
        </div>
      )}
      <div className="chat-input-bar-row">
      <div className="chat-input-bar-emoji-wrap" ref={emojiPopoverRef}>
        <button
          type="button"
          className="chat-input-bar-btn chat-input-bar-btn--secondary focus-ring"
          aria-label="Add emoji"
          aria-expanded={emojiPickerOpen}
          aria-haspopup="dialog"
          onClick={() => setEmojiPickerOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
            <path fill="currentColor" d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-18a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-3 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-3 6c-2.2 0-4.1-1.2-5.1-3l1.7-1c.7 1.2 2 2 3.4 2s2.7-.8 3.4-2l1.7 1c-1 1.8-2.9 3-5.1 3Z" />
          </svg>
        </button>
        {emojiPickerOpen && (
          <div className="chat-input-bar-emoji-popover" role="dialog" aria-label="Emoji picker">
            <Picker data={data} theme="auto" onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
      </div>
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
      <button
        type="submit"
        className="chat-input-bar-btn chat-input-bar-btn--send focus-ring"
        aria-label={pendingImage ? 'Send image' : 'Send message'}
      >
        <svg viewBox="0 0 24 24" className="chat-input-bar-icon" aria-hidden="true">
          <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
      <input
        ref={chatImageInputRef}
        id={chatImageInputId}
        type="file"
        className="chat-input-bar-file-input"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChatImageChange}
      />
      <button
        type="button"
        className="chat-input-bar-btn chat-input-bar-btn--secondary focus-ring"
        aria-label="Attach image"
        disabled={!canAttachImage}
        title={canAttachImage ? 'Attach image' : 'Open an existing chat to send images'}
        onClick={() => canAttachImage && chatImageInputRef.current?.click()}
      >
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
      </div>
    </form>
  )
}

export default ChatInputBar
