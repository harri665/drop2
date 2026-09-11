import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, ExternalLink, Link2Off, RefreshCw, Share } from 'lucide-react'
import { api, shareUrl } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { useFlash } from '../lib/hooks'
import { toast } from '../lib/toast'
import { Modal, ModalHeader, Spinner } from './ui'

export default function ShareModal({ item, onClose, onChange }) {
  const [slug, setSlug] = useState(item.shareSlug ?? '')
  const [syncedSlug, setSyncedSlug] = useState(item.shareSlug)
  const [busy, setBusy] = useState(null) // which action is running
  const [error, setError] = useState('')
  const [qr, setQr] = useState('')
  const [copied, flashCopied] = useFlash()

  // Keep the input in step when the link changes (regenerated here or on another device).
  if (item.shareSlug !== syncedSlug) {
    setSyncedSlug(item.shareSlug)
    setSlug(item.shareSlug ?? '')
  }

  const url = item.shareSlug ? shareUrl(item.shareSlug) : null
  const dirty = url && slug.trim() !== item.shareSlug
  const label = item.title || item.name || 'Text'

  useEffect(() => {
    if (!url) return
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#0b0b14', light: '#ffffff' } }).then(
      (data) => !cancelled && setQr(data)
    )
    return () => {
      cancelled = true
    }
  }, [url])

  async function run(name, action) {
    setBusy(name)
    setError('')
    try {
      onChange(await action())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function copyLink() {
    try {
      await copyText(url)
      flashCopied()
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Share" subtitle={label} onClose={onClose} />

      {!url ? (
        <div className="px-5 pb-5">
          <p className="text-sm leading-relaxed text-white/60">
            Create a link that opens this {item.kind === 'text' ? 'text' : 'file'} on any device — no PIN
            needed. You can change the link or turn it off any time.
          </p>
          <button
            className="btn btn-primary mt-5 h-11 w-full"
            onClick={() => run('create', () => api.share(item.id))}
            disabled={!!busy}
          >
            {busy === 'create' ? <Spinner size={16} /> : <Share size={16} />}
            Create share link
          </button>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      ) : (
        <div className="space-y-5 px-5 pb-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
            {qr && (
              <img
                src={qr}
                alt="QR code for the share link"
                className="h-36 w-36 shrink-0 rounded-2xl bg-white p-1.5 shadow-lg sm:h-32 sm:w-32"
              />
            )}
            <div className="flex w-full min-w-0 flex-col justify-center gap-2.5">
              <p className="text-xs text-white/50">Scan with your phone, or copy the link</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-xl bg-black/25 px-3 py-2.5 font-mono text-sm text-sky-200 ring-1 ring-white/10 hover:ring-white/25"
              >
                {url}
              </a>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1" onClick={copyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                {navigator.share ? (
                  <button
                    className="btn"
                    onClick={() => navigator.share({ title: label, url }).catch(() => {})}
                    aria-label="Share via…"
                  >
                    <Share size={16} />
                  </button>
                ) : (
                  <a className="btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open link">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (dirty) run('save', () => api.share(item.id, slug.trim()))
            }}
          >
            <label htmlFor="share-slug" className="text-xs font-medium text-white/55">
              Customize the link
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="flex h-11 min-w-0 flex-1 items-center rounded-[0.875rem] border border-white/12 bg-black/25 transition focus-within:border-violet-400/70 focus-within:ring-4 focus-within:ring-violet-500/20">
                <span className="pl-3.5 font-mono text-sm text-white/40">/s/</span>
                <input
                  id="share-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/\s/g, '-'))}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  maxLength={64}
                  className="h-full min-w-0 flex-1 bg-transparent pr-3 font-mono text-sm outline-none"
                />
              </div>
              <button className="btn h-11" type="submit" disabled={!dirty || !!busy}>
                {busy === 'save' ? <Spinner size={14} /> : 'Save'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          </form>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button className="btn" onClick={() => run('regenerate', () => api.share(item.id))} disabled={!!busy}>
              {busy === 'regenerate' ? <Spinner size={14} /> : <RefreshCw size={15} />}
              New random link
            </button>
            <button
              className="btn btn-danger ml-auto"
              onClick={() => run('stop', () => api.unshare(item.id))}
              disabled={!!busy}
            >
              {busy === 'stop' ? <Spinner size={14} /> : <Link2Off size={15} />}
              Stop sharing
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
