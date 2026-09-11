export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function timeAgo(ts) {
  const seconds = Math.round((Date.now() - ts) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function extension(name) {
  const dot = name ? name.lastIndexOf('.') : -1
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

// Saves text as a file, keeping the title as the filename when it already has an extension.
export function downloadText(item) {
  const base = (item.title || `drop-${new Date(item.createdAt).toISOString().slice(0, 10)}`).replace(/[\\/:*?"<>|]+/g, '_')
  const filename = extension(base) ? base : `${base}.txt`
  const url = URL.createObjectURL(new Blob([item.content], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Clipboard pastes are all called "image.png"; give them a name you can tell apart later.
export function renamePasted(file) {
  if (file.name && file.name !== 'image.png') return file
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
  return new File([file], `pasted-${stamp}.${ext}`, { type: file.type })
}
