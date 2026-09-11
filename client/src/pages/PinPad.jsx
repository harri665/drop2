import { useEffect, useState } from 'react'
import { Delete, Lock } from 'lucide-react'
import { api } from '../lib/api'

const PIN_LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'back']

const vibrate = (pattern) => navigator.vibrate?.(pattern)

export default function PinPad({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | error | success
  const [message, setMessage] = useState('')
  const [lockedFor, setLockedFor] = useState(0)

  const busy = status === 'checking' || status === 'success' || lockedFor > 0

  useEffect(() => {
    if (lockedFor <= 0) return
    const timer = setTimeout(() => setLockedFor((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [lockedFor])

  async function submit(code) {
    setStatus('checking')
    try {
      await api.login(code)
      setStatus('success')
      vibrate(15)
      setTimeout(onUnlock, 250)
    } catch (err) {
      vibrate([40, 40, 40])
      setStatus('error')
      if (err.status === 429) {
        setLockedFor(err.body?.retryAfter ?? 60)
        setMessage('')
      } else if (err.status === 401) {
        const left = err.body?.attemptsLeft
        setMessage(left != null ? `Wrong PIN · ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Wrong PIN')
      } else {
        setMessage(err.message)
      }
      setTimeout(() => {
        setPin('')
        setStatus('idle')
      }, 500)
    }
  }

  function press(key) {
    if (busy) return
    if (key === 'back') return setPin((p) => p.slice(0, -1))
    if (pin.length >= PIN_LENGTH) return
    vibrate(8)
    const next = pin + key
    setPin(next)
    setMessage('')
    if (next.length === PIN_LENGTH) submit(next)
  }

  // Physical keyboard support for desktop.
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Escape') setPin('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const minutes = Math.floor(lockedFor / 60)
  const seconds = String(lockedFor % 60).padStart(2, '0')

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm animate-pop rounded-[2rem] px-6 pb-8 pt-8 sm:px-8">
        <div className="flex flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Lock size={20} className="text-white/80" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Enter your PIN</h1>

          <div
            className={`mt-6 flex gap-3.5 ${status === 'error' ? 'animate-shake' : ''}`}
            role="status"
            aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
          >
            {Array.from({ length: PIN_LENGTH }, (_, i) => {
              const filled = i < pin.length
              const color =
                status === 'error'
                  ? 'bg-red-400 border-red-400'
                  : status === 'success'
                    ? 'bg-emerald-400 border-emerald-400'
                    : filled
                      ? 'bg-white border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                      : 'border-white/30'
              return (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${color} ${filled ? 'scale-110' : ''}`}
                />
              )
            })}
          </div>

          <p className="mt-4 h-5 text-sm text-red-300" aria-live="polite">
            {lockedFor > 0 ? (
              <span className="text-amber-200">
                Too many attempts — try again in {minutes}:{seconds}
              </span>
            ) : (
              message
            )}
          </p>
        </div>

        <div className="mx-auto mt-4 grid max-w-[18rem] grid-cols-3 gap-3.5">
          {KEYS.map((key, i) =>
            key === null ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={busy}
                aria-label={key === 'back' ? 'Delete digit' : key}
                className={`grid aspect-square select-none place-items-center rounded-full text-2xl font-medium transition active:scale-90 disabled:opacity-40 ${
                  key === 'back'
                    ? 'text-white/70 hover:bg-white/10 active:bg-white/15'
                    : 'border border-white/12 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-white/[0.13] active:bg-white/25'
                }`}
              >
                {key === 'back' ? <Delete size={24} /> : key}
              </button>
            )
          )}
        </div>
      </div>
    </main>
  )
}
