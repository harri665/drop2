import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner, Toaster } from './components/ui'
import { api, onUnauthorized } from './lib/api'
import Home from './pages/Home.jsx'
import PinPad from './pages/PinPad.jsx'
import SharePage from './pages/SharePage.jsx'

function PrivateApp() {
  const [status, setStatus] = useState('checking') // checking | locked | unlocked

  useEffect(() => {
    onUnauthorized(() => setStatus('locked'))
    api.me().then(
      () => setStatus('unlocked'),
      () => setStatus('locked')
    )
  }, [])

  async function lock() {
    await api.logout().catch(() => {})
    setStatus('locked')
  }

  if (status === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size={28} />
      </div>
    )
  }
  if (status === 'locked') return <PinPad onUnlock={() => setStatus('unlocked')} />
  return <Home onLock={lock} />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/s/:slug" element={<SharePage />} />
        <Route path="*" element={<PrivateApp />} />
      </Routes>
      <Toaster />
    </>
  )
}
