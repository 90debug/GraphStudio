// ── Part color ────────────────────────────────────────────────
const PALETTE = [
  '#E8634A', '#5BB8D4', '#9B59B6', '#F39C12',
  '#27AE60', '#E91E63', '#1ABC9C', '#3498DB',
]

export function getPartColor(partName) {
  if (!partName) return PALETTE[0]
  let h = 0
  for (let i = 0; i < partName.length; i++) {
    h = partName.charCodeAt(i) + ((h << 5) - h)
  }
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ── Time format ───────────────────────────────────────────────
export function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── localStorage session ──────────────────────────────────────
const KEY = 'jwt_user_v1'

export function saveSession(data) {
  localStorage.setItem(KEY, JSON.stringify({ ...data, _savedAt: Date.now() }))
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

// ── Encode part name as Firebase-safe key ─────────────────────
// Firebase keys cannot contain . # $ [ ]
export function encodeKey(str) {
  return encodeURIComponent(str).replace(/%/g, '_')
}
