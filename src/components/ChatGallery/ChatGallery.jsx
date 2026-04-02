import { useState, useEffect, useRef } from 'react'
import './ChatGallery.css'
import { fetchMessageImage } from '../../network/mediaServer'

function ChatGallery({ mediaIds, onClose }) {
  const [imageUrls, setImageUrls] = useState([]) // [{ id, url }]
  const [lightboxUrl, setLightboxUrl] = useState(null) // full-size view
  const urlsRef = useRef([])

  useEffect(() => {
    if (!mediaIds?.length) {
      urlsRef.current.forEach(({ url }) => url && URL.revokeObjectURL(url))
      urlsRef.current = []
      setImageUrls([])
      return
    }
    let cancelled = false
    Promise.all(
      mediaIds.map(async (id) => {
        const url = await fetchMessageImage(id)
        return { id, url }
      })
    ).then((results) => {
      if (cancelled) {
        results.forEach((r) => r.url && URL.revokeObjectURL(r.url))
        return
      }
      const valid = results.filter((r) => r.url)
      urlsRef.current.forEach(({ url }) => url && URL.revokeObjectURL(url))
      urlsRef.current = valid
      setImageUrls(valid)
    })
    return () => {
      cancelled = true
    }
  }, [mediaIds?.join(',')])

  useEffect(() => {
    return () => {
      urlsRef.current.forEach(({ url }) => url && URL.revokeObjectURL(url))
      urlsRef.current = []
    }
  }, [])

  return (
    <div className="chat-gallery-overlay" role="dialog" aria-modal="true" aria-label="Chat gallery">
      <div className="chat-gallery-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="chat-gallery-modal">
        <div className="chat-gallery-header">
          <h2 className="chat-gallery-title">Gallery</h2>
          <button
            type="button"
            className="chat-gallery-close focus-ring"
            onClick={onClose}
            aria-label="Close gallery"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              <path d="M12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293a1 1 0 0 0-1.414-1.414L12 10.586z" />
            </svg>
          </button>
        </div>
        <div className="chat-gallery-grid">
          {imageUrls.length === 0 && mediaIds?.length > 0 && (
            <p className="chat-gallery-loading">Loading images…</p>
          )}
          {imageUrls.length === 0 && (!mediaIds || mediaIds.length === 0) && (
            <p className="chat-gallery-empty">No images in this chat.</p>
          )}
          {imageUrls.map(({ id, url }) => (
            <button
              key={id}
              type="button"
              className="chat-gallery-item"
              onClick={() => setLightboxUrl(url)}
              aria-label="View image full size"
            >
              <span className="chat-gallery-item-inner">
                <img src={url} alt="" className="chat-gallery-img" />
              </span>
            </button>
          ))}
        </div>
      </div>
      {lightboxUrl && (
        <div className="chat-gallery-lightbox" role="dialog" aria-modal="true" aria-label="Image full size">
          <div
            className="chat-gallery-lightbox-backdrop"
            onClick={() => setLightboxUrl(null)}
            aria-hidden="true"
          />
          <div className="chat-gallery-lightbox-content">
            <img src={lightboxUrl} alt="" className="chat-gallery-lightbox-img" />
            <button
              type="button"
              className="chat-gallery-lightbox-close focus-ring"
              onClick={() => setLightboxUrl(null)}
              aria-label="Close full size view"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <path d="M12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293a1 1 0 0 0-1.414-1.414L12 10.586z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatGallery
