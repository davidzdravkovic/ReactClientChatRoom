import { useEffect, useCallback } from 'react'
import './ChatToast.css'

function AlertOctagonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

/**
 * Top-centered toast for server-side chat errors (e.g. cannot DM yourself).
 * Matches app dark theme and design tokens in index.css.
 */
export function ChatToast({ alert, onDismiss }) {
  const dismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    if (!alert) return undefined
    const t = window.setTimeout(dismiss, 6800)
    return () => window.clearTimeout(t)
  }, [alert?.id, dismiss])

  useEffect(() => {
    if (!alert) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [alert, dismiss])

  if (!alert) return null

  return (
    <div className="chat-toast" role="alert" aria-live="polite">
      <div className="chat-toast-inner">
        <div className="chat-toast-icon-wrap">
          <AlertOctagonIcon />
        </div>
        <div className="chat-toast-body">
          <p className="chat-toast-title">Something went wrong</p>
          <p className="chat-toast-message">{alert.message}</p>
        </div>
        <button
          type="button"
          className="chat-toast-dismiss"
          onClick={dismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  )
}
