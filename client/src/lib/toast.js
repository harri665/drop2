// Tiny global toast store: call toast() from anywhere, <Toaster /> renders them.
let toasts = []
let seq = 0
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

export function toast(message, type = 'info') {
  const id = ++seq
  toasts = [...toasts.slice(-3), { id, message, type }]
  emit()
  setTimeout(
    () => {
      toasts = toasts.filter((t) => t.id !== id)
      emit()
    },
    type === 'error' ? 4500 : 2200
  )
}

toast.success = (message) => toast(message, 'success')
toast.error = (message) => toast(message, 'error')

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts() {
  return toasts
}
