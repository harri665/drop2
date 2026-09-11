import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { api, notifyUnauthorized } from '../lib/api'
import { toast } from '../lib/toast'

const byNewest = (a, b) => b.createdAt - a.createdAt

// All items, kept in sync across devices over the websocket.
export function useItems() {
  const [items, setItems] = useState(null)
  const [live, setLive] = useState(false)

  const upsert = useCallback((item) => {
    setItems((prev) => {
      if (!prev) return prev
      const index = prev.findIndex((i) => i.id === item.id)
      if (index === -1) return [item, ...prev].sort(byNewest)
      const next = [...prev]
      next[index] = item
      return next
    })
  }, [])

  const remove = useCallback((id) => {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev)
  }, [])

  useEffect(() => {
    const refresh = () =>
      api
        .listItems()
        .then(setItems)
        .catch((err) => err.status !== 401 && toast.error(err.message))

    refresh()

    const socket = io({ path: '/api/socket.io' })
    socket.on('connect', () => setLive(true))
    socket.on('disconnect', () => setLive(false))
    socket.on('connect_error', (err) => {
      setLive(false)
      if (err.message === 'unauthorized') notifyUnauthorized()
    })
    // Catch up on anything that changed while we were offline.
    socket.io.on('reconnect', refresh)

    socket.on('item:created', upsert)
    socket.on('item:updated', upsert)
    socket.on('item:deleted', ({ id }) => remove(id))

    return () => socket.disconnect()
  }, [upsert, remove])

  return { items, live, upsert, remove }
}
