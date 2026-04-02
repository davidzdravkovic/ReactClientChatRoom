import { useEffect } from 'react'
import './ImageLightbox.css'

function ImageLightbox({ imageUrl, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!imageUrl) return null

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Image full size">
      <div
        className="image-lightbox-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="image-lightbox-content">
        <img src={imageUrl} alt="" className="image-lightbox-img" />
        <button
          type="button"
          className="image-lightbox-close focus-ring"
          onClick={onClose}
          aria-label="Close full size view"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
            <path d="M12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293a1 1 0 0 0-1.414-1.414L12 10.586z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ImageLightbox
