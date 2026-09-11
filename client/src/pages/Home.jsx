import { useCallback, useState } from 'react'
import { Images, Lock, Type } from 'lucide-react'
import Composer from '../components/Composer'
import EditModal from '../components/EditModal'
import Lightbox from '../components/Lightbox'
import MediaTile from '../components/MediaTile'
import ShareModal from '../components/ShareModal'
import TextCard from '../components/TextCard'
import { useItems } from '../hooks/useItems'
import { api } from '../lib/api'
import { useNow } from '../lib/hooks'
import { toast } from '../lib/toast'

export default function Home({ onLock }) {
  const { items, live, upsert, remove } = useItems()
  const [editingId, setEditingId] = useState(null)
  const [sharingId, setSharingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [mobileTab, setMobileTab] = useState('text')
  useNow() // keep "5m ago" labels ticking

  const onCreated = useCallback(
    (item) => {
      upsert(item)
      setMobileTab(item.kind === 'text' ? 'text' : 'media')
    },
    [upsert]
  )

  const texts = items?.filter((i) => i.kind === 'text') ?? []
  const media = items?.filter((i) => i.kind !== 'text') ?? []
  // Look modal items up by id so they reflect live updates from other devices.
  const find = (id) => items?.find((i) => i.id === id)
  const editing = find(editingId)
  const sharing = find(sharingId)
  const viewing = find(viewingId)

  async function destroy(item) {
    try {
      await api.deleteItem(item.id)
      remove(item.id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8">
      <header className="mb-5 flex items-center gap-3 sm:mb-7">
        <div
          className="ml-auto flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/60 ring-1 ring-white/10"
          title={live ? 'Changes sync instantly across your devices' : 'Reconnecting…'}
        >
          <span className="relative flex h-2 w-2">
            {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </span>
          {live ? 'Live' : 'Offline'}
        </div>
        <button className="icon-btn" onClick={onLock} title="Lock" aria-label="Lock">
          <Lock size={18} />
        </button>
      </header>

      <Composer onCreated={onCreated} />

      {/* On phones the two columns become tabs, so images aren't buried under every text. */}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.06] p-1 ring-1 ring-white/10 md:hidden">
        {[
          { key: 'text', icon: <Type size={15} />, label: 'Text', count: texts.length },
          { key: 'media', icon: <Images size={15} />, label: 'Images & files', count: media.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
              mobileTab === tab.key ? 'bg-white/15 text-white shadow-sm' : 'text-white/55'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="text-xs tabular-nums text-white/50">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-6 md:mt-8 md:grid-cols-2">
        <Column icon={Type} title="Text" count={texts.length} className={mobileTab === 'text' ? '' : 'max-md:hidden'}>
          {items === null ? (
            <div className="space-y-3">
              <Skeleton className="h-36" count={3} />
            </div>
          ) : texts.length === 0 ? (
            <Empty>Type or paste something above and it shows up here — on every device.</Empty>
          ) : (
            <div className="space-y-3">
              {texts.map((item) => (
                <TextCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingId(item.id)}
                  onShare={() => setSharingId(item.id)}
                  onDelete={() => destroy(item)}
                />
              ))}
            </div>
          )}
        </Column>

        <Column
          icon={Images}
          title="Images & files"
          count={media.length}
          className={mobileTab === 'media' ? '' : 'max-md:hidden'}
        >
          {items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="aspect-square" count={6} />
            </div>
          ) : media.length === 0 ? (
            <Empty>Drop photos or files anywhere on the page, or tap “Add files”.</Empty>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              {media.map((item) => (
                <MediaTile
                  key={item.id}
                  item={item}
                  onOpen={() => setViewingId(item.id)}
                  onShare={() => setSharingId(item.id)}
                  onDelete={() => destroy(item)}
                />
              ))}
            </div>
          )}
        </Column>
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditingId(null)} onSaved={upsert} />}
      {sharing && <ShareModal item={sharing} onClose={() => setSharingId(null)} onChange={upsert} />}
      {viewing && (
        <Lightbox
          item={viewing}
          onClose={() => setViewingId(null)}
          onShare={() => {
            setViewingId(null)
            setSharingId(viewing.id)
          }}
        />
      )}
    </div>
  )
}

function Column({ icon, title, count, className, children }) {
  const Icon = icon
  return (
    <section className={`min-w-0 ${className}`}>
      <header className="mb-3 hidden items-center gap-2 px-1 md:flex">
        <Icon size={15} className="text-white/45" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">{title}</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/60">
          {count}
        </span>
      </header>
      {children}
    </section>
  )
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 px-6 py-10 text-center text-sm leading-relaxed text-white/40">
      {children}
    </div>
  )
}

function Skeleton({ className, count }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={`glass-card animate-pulse rounded-2xl ${className}`} />
  ))
}
