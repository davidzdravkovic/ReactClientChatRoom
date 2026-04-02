/**
 * Returns a consistent, UX-friendly color for a string (e.g. username).
 * Same name always gets the same color. Palette chosen for contrast and variety.
 */
const PALETTE = [
  { bg: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)', border: 'rgba(99, 102, 241, 0.55)' },   // indigo
  { bg: 'linear-gradient(145deg, #22c55e 0%, #16a34a 100%)', border: 'rgba(34, 197, 94, 0.55)' },   // emerald
  { bg: 'linear-gradient(145deg, #0ea5e9 0%, #0284c7 100%)', border: 'rgba(14, 165, 233, 0.55)' },   // sky
  { bg: 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)', border: 'rgba(245, 158, 11, 0.55)' },   // amber
  { bg: 'linear-gradient(145deg, #ec4899 0%, #db2777 100%)', border: 'rgba(236, 72, 153, 0.55)' },   // pink
  { bg: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 100%)', border: 'rgba(139, 92, 246, 0.55)' },   // violet
  { bg: 'linear-gradient(145deg, #06b6d4 0%, #0891b2 100%)', border: 'rgba(6, 182, 212, 0.55)' },    // cyan
  { bg: 'linear-gradient(145deg, #f43f5e 0%, #e11d48 100%)', border: 'rgba(244, 63, 94, 0.55)' },   // rose
  { bg: 'linear-gradient(145deg, #14b8a6 0%, #0d9488 100%)', border: 'rgba(20, 184, 166, 0.55)' },   // teal
  { bg: 'linear-gradient(145deg, #a855f7 0%, #9333ea 100%)', border: 'rgba(168, 85, 247, 0.55)' },   // purple
  { bg: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 100%)', border: 'rgba(59, 130, 246, 0.55)' },   // blue
  { bg: 'linear-gradient(145deg, #eab308 0%, #ca8a04 100%)', border: 'rgba(234, 179, 8, 0.55)' },    // yellow
  { bg: 'linear-gradient(145deg, #fb923c 0%, #ea580c 100%)', border: 'rgba(251, 146, 60, 0.55)' },   // orange
  { bg: 'linear-gradient(145deg, #2dd4bf 0%, #14b8a6 100%)', border: 'rgba(45, 212, 191, 0.55)' },   // aqua
  { bg: 'linear-gradient(145deg, #f472b6 0%, #ec4899 100%)', border: 'rgba(244, 114, 182, 0.55)' },  // fuchsia
  { bg: 'linear-gradient(145deg, #64748b 0%, #475569 100%)', border: 'rgba(100, 116, 139, 0.55)' },  // slate
]

function hashString(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function getAvatarColor(name) {
  const i = hashString(name || '?') % PALETTE.length
  return PALETTE[i]
}
