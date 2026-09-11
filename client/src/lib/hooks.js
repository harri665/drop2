import { useCallback, useEffect, useRef, useState } from 'react'

// Escape closes, and the page behind stops scrolling while an overlay is open.
export function useOverlay(onClose) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [])
}

// A boolean that flips on and resets itself — for "Copied!" style feedback.
export function useFlash(ms = 1600) {
  const [on, setOn] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flash = useCallback(() => {
    clearTimeout(timer.current)
    setOn(true)
    timer.current = setTimeout(() => setOn(false), ms)
  }, [ms])
  return [on, flash]
}

// Re-renders every `ms` so relative timestamps stay fresh.
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
