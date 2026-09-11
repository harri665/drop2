import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Check, CircleAlert, Trash2, X } from 'lucide-react'
import { useOverlay } from '../lib/hooks'
import { getToasts, subscribe } from '../lib/toast'

export function Spinner({ size = 20, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-white/80 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function Modal({ onClose, dismissOnBackdrop = true, className = '', children }) {
  useOverlay(onClose)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => dismissOnBackdrop && e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`glass max-h-[calc(100dvh-1.5rem)] w-full max-w-lg animate-pop overflow-y-auto rounded-3xl ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start gap-3 p-5 pb-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="truncate text-sm text-white/50">{subtitle}</p>}
      </div>
      <button className="icon-btn -mr-1 -mt-1" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>
    </div>
  )
}

// First tap arms it, second tap deletes — no browser confirm() dialogs.
export function DeleteButton({ onConfirm, compact = false, className = '' }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  if (armed) {
    return (
      <button
        className={`btn btn-danger animate-pop ${compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-3'} ${className}`}
        onClick={onConfirm}
      >
        Delete?
      </button>
    )
  }
  return (
    <button
      className={`icon-btn hover:bg-red-500/15 hover:text-red-300 ${compact ? 'h-8 w-8' : ''} ${className}`}
      onClick={() => setArmed(true)}
      title="Delete"
      aria-label="Delete"
    >
      <Trash2 size={compact ? 16 : 17} />
    </button>
  )
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts)
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass flex max-w-md animate-rise items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm shadow-2xl"
        >
          {t.type === 'success' && <Check size={16} className="shrink-0 text-emerald-300" />}
          {t.type === 'error' && <CircleAlert size={16} className="shrink-0 text-red-300" />}
          <span className="min-w-0 break-words">{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  )
}

const URL_RE = /https?:\/\/[^\s<>"'`]+/g
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/

// Renders text with URLs turned into tappable links — handy for sending a link to your phone.
export function Linkified({ text }) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '')
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:decoration-sky-300"
      >
        {url}
      </a>
    )
    last = match.index + url.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
