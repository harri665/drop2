import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, CloudUpload, Paperclip } from 'lucide-react'
import { api, uploadFile } from '../lib/api'
import { formatBytes, renamePasted } from '../lib/format'
import { toast } from '../lib/toast'
import { Spinner } from './ui'

const UPLOAD_CONCURRENCY = 3
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

const isEditable = (el) => el instanceof Element && el.closest('input, textarea, [contenteditable="true"]')
const isDroppable = (e) => {
  const types = [...(e.dataTransfer?.types ?? [])]
  return types.includes('Files') || types.includes('text/plain')
}

let uploadSeq = 0

export default function Composer({ onCreated }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploads, setUploads] = useState([])
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const createText = useCallback(
    async (content) => {
      const item = await api.createText(content)
      onCreated(item)
      toast.success('Text dropped')
      return item
    },
    [onCreated]
  )

  const uploadFiles = useCallback(
    async (files) => {
      if (!files.length) return
      const queue = files.map((file) => ({ key: ++uploadSeq, file }))
      setUploads((u) => [...u, ...queue.map(({ key, file }) => ({ key, name: file.name, size: file.size, progress: 0 }))])

      const setProgress = (key, progress) =>
        setUploads((u) => u.map((entry) => (entry.key === key ? { ...entry, progress } : entry)))
      const finish = (key) => setUploads((u) => u.filter((entry) => entry.key !== key))

      let next = 0
      let succeeded = 0
      const worker = async () => {
        while (next < queue.length) {
          const { key, file } = queue[next++]
          try {
            onCreated(await uploadFile(file, (p) => setProgress(key, p)))
            succeeded++
          } catch (err) {
            toast.error(`${file.name}: ${err.message}`)
          } finally {
            finish(key)
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker))
      if (succeeded) toast.success(succeeded === 1 ? 'Uploaded' : `Uploaded ${succeeded} files`)
    },
    [onCreated]
  )

  async function submit() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await createText(text)
      setText('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  // Grow the field with its content, up to half the screen.
  useLayoutEffect(() => {
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.5)}px`
  }, [text])

  // Drop and paste work anywhere on the page, not just on the field.
  useEffect(() => {
    let depth = 0

    const onDragEnter = (e) => {
      if (!isDroppable(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onDragOver = (e) => {
      if (!isDroppable(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e) => {
      if (!isDroppable(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e) => {
      depth = 0
      setDragging(false)
      if (!isDroppable(e)) return
      e.preventDefault()
      const files = [...e.dataTransfer.files]
      if (files.length) return uploadFiles(files)
      const dropped = e.dataTransfer.getData('text/plain')
      if (dropped.trim()) createText(dropped).catch((err) => toast.error(err.message))
    }
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) {
        e.preventDefault()
        uploadFiles(files.map(renamePasted))
        return
      }
      if (isEditable(e.target)) return
      const pasted = e.clipboardData?.getData('text/plain')
      if (pasted) {
        e.preventDefault()
        setText((t) => t + pasted)
        textareaRef.current?.focus()
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [uploadFiles, createText])

  return (
    <section
      className={`glass relative overflow-hidden rounded-3xl transition-shadow duration-200 ${
        dragging ? 'ring-2 ring-violet-400/70' : 'focus-within:ring-1 focus-within:ring-white/25'
      }`}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            submit()
          }
        }}
        rows={5}
        placeholder="Type or paste text here… or drop files and images anywhere"
        className="block min-h-40 w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35 sm:min-h-48 sm:px-6 sm:pt-6"
      />

      {uploads.length > 0 && (
        <ul className="space-y-2 px-4 pb-3 sm:px-5">
          {uploads.map((u) => (
            <li key={u.key} className="animate-rise rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-xs">
                <Spinner size={12} />
                <span className="min-w-0 flex-1 truncate text-white/80">{u.name}</span>
                <span className="tabular-nums text-white/45">
                  {Math.round(u.progress * 100)}% · {formatBytes(u.size)}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-violet-400 to-cyan-300 transition-[width] duration-200"
                  style={{ width: `${u.progress * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-white/10 bg-black/10 px-3 py-3 sm:px-4">
        <button type="button" className="btn" onClick={() => fileInputRef.current.click()}>
          <Paperclip size={16} />
          Add files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            uploadFiles([...e.target.files])
            e.target.value = ''
          }}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-white/35 md:inline">
            {isMac ? '⌘' : 'Ctrl'} + Enter
          </span>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!text.trim() || sending}>
            {sending ? <Spinner size={14} /> : <ArrowUp size={16} />}
            Drop
          </button>
        </div>
      </div>

      {dragging &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-violet-950/40 p-6 backdrop-blur-md">
            <div className="glass flex animate-pop flex-col items-center rounded-3xl border-2 border-dashed border-violet-300/60 px-12 py-10 text-center">
              <CloudUpload size={44} className="text-violet-200" />
              <p className="mt-3 text-lg font-semibold">Drop to upload</p>
              <p className="text-sm text-white/55">Files, images or text</p>
            </div>
          </div>,
          document.body
        )}
    </section>
  )
}
