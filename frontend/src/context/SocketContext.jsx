import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { token, isAuthenticated, logout } = useAuth()
  const wsRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const listenersRef = useRef({}) // { event_type: Set<callback> }
  const reconnectTimer = useRef(null)

  const subscribe = useCallback((type, cb) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = new Set()
    listenersRef.current[type].add(cb)
    return () => listenersRef.current[type]?.delete(cb)
  }, [])

  const sendWs = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !token) return

    const WS_BASE = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
    let isMounted = true

    const connect = () => {
      if (!isMounted) return
      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (isMounted) setIsConnected(true)
        clearTimeout(reconnectTimer.current)
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          const type = data.type || 'message'
          listenersRef.current[type]?.forEach(cb => cb(data))
          listenersRef.current['*']?.forEach(cb => cb(data))
        } catch { /* ignore */ }
      }

      ws.onclose = (e) => {
        if (isMounted) {
          setIsConnected(false)
          // 1008: Policy Violation (invalid/expired token or user not in DB)
          if (e.code === 1008) {
            console.warn('WebSocket unauthorized (1008). Logging out...')
            logout?.()
            return
          }
          reconnectTimer.current = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      isMounted = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [token, isAuthenticated])

  return (
    <SocketContext.Provider value={{ isConnected, subscribe, sendWs }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be inside SocketProvider')
  return ctx
}
