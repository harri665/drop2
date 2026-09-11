import { createPortal } from 'react-dom'
import { Check, Copy, Download, Share2, X } from 'lucide-react'
import { fileUrl } from '../lib/api'
import { canCopyImages, copyImage } from '../lib/clipboard'
import { formatBytes } from '../lib/format'
import { useFlash, useOverlay } from '../lib/hooks'
import { toast } from '../lib/toast'

export default function Lightbox({ item, onClose, onShare }) {
  const [copied, flashCopied] = useFlash()
  useOverlay(onClose)

  async function copy() {
    try {
      await copyImage(fileUrl(item))
      flashCopied()
    } catch {
      toast.error('This browser could not copy the image')
    }
  }

  const stop = (e) => e.stopPropagation()

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-pop flex-col bg-black/80 backdrop-blur-2xl" onClick={onClose}>
      <div
        className="flex items-center gap-1 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
        onClick={stop}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-xs text-white/50">{formatBytes(item.size)}</p>
        </div>
        {canCopyImages && (
          <button className="icon-btn" onClick={copy} title="Copy image" aria-label="Copy image">
            {copied ? <Check size={18} className="text-emerald-300" /> : <Copy size={18} />}
          </button>
        )}
        <a className="icon-btn" href={fileUrl(item, { download: true })} download={item.name} title="Download" aria-label="Download">
          <Download size={18} />
        </a>
        <button className="icon-btn" onClick={onShare} title="Share link" aria-label="Share link">
          <Share2 size={18} />
        </button>
        <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 pt-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 sm:pt-0">
        <img
          src={fileUrl(item)}
          alt={item.name}
          onClick={stop}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl shadow-black/60"
        />
      </div>
    </div>,
    document.body
  )
}
