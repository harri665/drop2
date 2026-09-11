import { Check, Copy, Download, Link, Share2 } from 'lucide-react'
import { fileUrl } from '../lib/api'
import { canCopyImages, copyImage } from '../lib/clipboard'
import { fileIcon } from '../lib/fileIcon'
import { extension, formatBytes, timeAgo } from '../lib/format'
import { useFlash } from '../lib/hooks'
import { toast } from '../lib/toast'
import { DeleteButton } from './ui'

export default function MediaTile({ item, onOpen, onShare, onDelete }) {
  const [copied, flashCopied] = useFlash()
  const isImage = item.kind === 'image'
  const Icon = fileIcon(item.mime, item.name)

  async function copy() {
    try {
      await copyImage(fileUrl(item))
      flashCopied()
    } catch {
      toast.error('This browser could not copy the image')
    }
  }

  return (
    <figure className="glass-card group relative aspect-square animate-rise overflow-hidden rounded-2xl">
      {isImage ? (
        <button onClick={onOpen} className="block h-full w-full" aria-label={`View ${item.name}`}>
          <img
            src={fileUrl(item)}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        </button>
      ) : (
        <a
          href={fileUrl(item, { download: true })}
          download={item.name}
          className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 pb-12 text-center"
        >
          <Icon size={42} strokeWidth={1.4} className="text-violet-200/80" />
          {extension(item.name) && (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
              {extension(item.name)}
            </span>
          )}
          <span className="line-clamp-2 break-all text-xs font-medium text-white/85">{item.name}</span>
        </a>
      )}

      {item.shareSlug && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-300/30 backdrop-blur-md">
          <Link size={11} />
          Shared
        </span>
      )}

      {/* Always visible on touch screens; revealed on hover with a mouse. */}
      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-1.5 pb-1.5 pt-8 transition-opacity duration-200 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
        <div className="flex items-center justify-between px-1.5 pb-0.5 text-[11px] text-white/60">
          <span>{timeAgo(item.createdAt)}</span>
          <span>{formatBytes(item.size)}</span>
        </div>
        <div className="flex items-center">
          {isImage && canCopyImages && (
            <button className="icon-btn h-8 w-8" onClick={copy} title="Copy image" aria-label="Copy image">
              {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
            </button>
          )}
          <a
            className="icon-btn h-8 w-8"
            href={fileUrl(item, { download: true })}
            download={item.name}
            title="Download"
            aria-label="Download"
          >
            <Download size={16} />
          </a>
          <button
            className={`icon-btn h-8 w-8 ${item.shareSlug ? 'text-emerald-300' : ''}`}
            onClick={onShare}
            title="Share link"
            aria-label="Share link"
          >
            <Share2 size={16} />
          </button>
          <DeleteButton onConfirm={onDelete} compact className="ml-auto" />
        </div>
      </figcaption>
    </figure>
  )
}
