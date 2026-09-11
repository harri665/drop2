import { useState } from 'react'
import { Check, Copy, Download, Link, Pencil, Share2 } from 'lucide-react'
import { copyText } from '../lib/clipboard'
import { downloadText, formatBytes, timeAgo } from '../lib/format'
import { useFlash } from '../lib/hooks'
import { toast } from '../lib/toast'
import { DeleteButton, Linkified } from './ui'

// Long texts are cut down while collapsed so a huge paste doesn't bog down the list.
const PREVIEW_CHARS = 1200
const PREVIEW_LINES = 10

export default function TextCard({ item, onEdit, onShare, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, flashCopied] = useFlash()

  const lines = item.content.split('\n')
  const isLong = item.content.length > PREVIEW_CHARS || lines.length > PREVIEW_LINES
  const shown =
    isLong && !expanded ? lines.slice(0, PREVIEW_LINES).join('\n').slice(0, PREVIEW_CHARS) : item.content
  const edited = item.updatedAt - item.createdAt > 1000

  async function copy() {
    try {
      await copyText(item.content)
      flashCopied()
    } catch {
      toast.error('Could not copy — select the text manually')
    }
  }

  return (
    <article className="glass-card group animate-rise rounded-2xl">
      <header className="flex items-center gap-2 px-4 pt-3.5 text-xs text-white/45">
        {item.title && <span className="min-w-0 truncate font-medium text-white/85">{item.title}</span>}
        <time dateTime={new Date(item.createdAt).toISOString()} className="shrink-0">
          {timeAgo(item.createdAt)}
          {edited && ' · edited'}
        </time>
        <span className="shrink-0">· {formatBytes(item.size)}</span>
        {item.shareSlug && (
          <button
            onClick={onShare}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-300/25 hover:bg-emerald-400/25"
          >
            <Link size={11} />
            Shared
          </button>
        )}
      </header>

      <div className={`px-4 pt-2 ${isLong && !expanded ? 'fade-bottom' : ''}`}>
        <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-white/90">
          <Linkified text={shown} />
        </pre>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mx-4 mt-1 text-xs font-medium text-violet-300 hover:text-violet-200"
        >
          {expanded ? 'Show less' : `Show all · ${lines.length} lines`}
        </button>
      )}

      <footer className="mt-2 flex items-center gap-1 border-t border-white/[0.07] px-2 py-2">
        <button
          onClick={copy}
          className={`btn h-9 px-3.5 ${copied ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : ''}`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="icon-btn" onClick={onEdit} title="Edit" aria-label="Edit">
          <Pencil size={17} />
        </button>
        <button
          className={`icon-btn ${item.shareSlug ? 'text-emerald-300' : ''}`}
          onClick={onShare}
          title="Share link"
          aria-label="Share link"
        >
          <Share2 size={17} />
        </button>
        <button className="icon-btn" onClick={() => downloadText(item)} title="Download" aria-label="Download">
          <Download size={17} />
        </button>
        <DeleteButton onConfirm={onDelete} className="ml-auto" />
      </footer>
    </article>
  )
}
