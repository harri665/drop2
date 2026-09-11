import { useState } from 'react'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { Modal, ModalHeader, Spinner } from './ui'

export default function EditModal({ item, onClose, onSaved }) {
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [saving, setSaving] = useState(false)

  const dirty = title !== item.title || content !== item.content

  async function save() {
    if (!content.trim()) return toast.error('Text cannot be empty')
    setSaving(true)
    try {
      onSaved(await api.updateItem(item.id, { title, content }))
      toast.success('Saved')
      onClose()
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} dismissOnBackdrop={!dirty} className="max-w-2xl">
      <ModalHeader title="Edit text" onClose={onClose} />
      <form
        className="space-y-3 px-5 pb-5"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={200}
        />
        <textarea
          className="input h-auto min-h-[45dvh] resize-y py-3 font-mono text-[13px] leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              save()
            }
          }}
          autoFocus
          spellCheck={false}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary min-w-24" disabled={!dirty || saving}>
            {saving ? <Spinner size={14} /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
