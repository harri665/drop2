import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Copy, Download, Link2Off } from 'lucide-react'
import { Linkified, Spinner } from '../components/ui'
import { api, sharedFileUrl } from '../lib/api'
import { canCopyImages, copyImage, copyText } from '../lib/clipboard'
import { fileIcon } from '../lib/fileIcon'
import { downloadText, formatBytes, timeAgo } from '../lib/format'
import { useFlash } from '../lib/hooks'
import { toast } from '../lib/toast'

// Public view of a single shared item — no PIN required.
export default function SharePage() {
  const { slug } = useParams()
  const [state, setState] = useState({ slug: null, item: null, error: null })
  const [copied, flashCopied] = useFlash()

  useEffect(() => {
    let cancelled = false
    api.getShared(slug).then(
      (item) => !cancelled && setState({ slug, item, error: null }),
      (err) => !cancelled && setState({ slug, item: null, error: err })
    )
    return () => {
      cancelled = true
    }
  }, [slug])

  const loading = state.slug !== slug
  const { item, error } = state

  async function copy() {
    try {
      if (item.kind === 'text') await copyText(item.content)
      else await copyImage(sharedFileUrl(slug))
      flashCopied()
    } catch {
      toast.error('Could not copy')
    }
  }

  const heading = item?.title || item?.name || 'Shared text'
  const Icon = item ? fileIcon(item.mime, item.name) : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8">
      {loading ? (
        <div className="grid flex-1 place-items-center">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <div className="glass mx-auto mt-10 w-full max-w-md animate-pop rounded-3xl p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <Link2Off size={20} className="text-white/70" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">
            {error.status === 404 ? 'Link not found' : 'Could not load this link'}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {error.status === 404 ? 'It may have been changed or turned off.' : error.message}
          </p>
        </div>
      ) : (
        <article className="glass animate-pop overflow-hidden rounded-3xl">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold">{heading}</h1>
              <p className="text-xs text-white/50">
                Shared {timeAgo(item.createdAt)} · {formatBytes(item.size)}
              </p>
            </div>
            <div className="flex gap-2">
              {(item.kind === 'text' || (item.kind === 'image' && canCopyImages)) && (
                <button className="btn btn-primary" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
              {item.kind === 'text' ? (
                <button className="btn" onClick={() => downloadText(item)} aria-label="Download">
                  <Download size={16} />
                </button>
              ) : (
                <a className="btn" href={sharedFileUrl(slug, { download: true })} download={item.name}>
                  <Download size={16} />
                  Download
                </a>
              )}
            </div>
          </header>

          {item.kind === 'text' && (
            <pre className="whitespace-pre-wrap break-words px-5 py-5 font-mono text-[13px] leading-relaxed text-white/90 sm:px-6">
              <Linkified text={item.content} />
            </pre>
          )}
          {item.kind === 'image' && (
            <div className="bg-black/20 p-3 sm:p-4">
              <img src={sharedFileUrl(slug)} alt={item.name} className="mx-auto max-h-[75dvh] rounded-xl object-contain" />
            </div>
          )}
          {item.kind === 'file' && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <Icon size={56} strokeWidth={1.3} className="text-violet-200/80" />
              <p className="mt-4 break-all font-medium">{item.name}</p>
              <p className="text-sm text-white/50">{formatBytes(item.size)}</p>
              <a className="btn btn-primary mt-6 h-11 px-6" href={sharedFileUrl(slug, { download: true })} download={item.name}>
                <Download size={16} />
                Download file
              </a>
            </div>
          )}
        </article>
      )}
    </main>
  )
}
