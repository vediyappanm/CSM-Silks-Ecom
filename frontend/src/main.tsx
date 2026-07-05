import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Google OAuth only accepts pre-registered localhost redirect URIs — not 127.0.0.1 or LAN IPs.
if (import.meta.env.DEV) {
  const { hostname, port, pathname, search, hash, protocol } = window.location
  if (hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const targetPort = port || '5173'
    window.location.replace(`${protocol}//localhost:${targetPort}${pathname}${search}${hash}`)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
