import { useEffect, useRef, useState } from 'react'
import { WS_URL } from '../lib/api'
import type { WSMessage } from '../lib/types'

export type SocketStatus = 'connecting' | 'open' | 'closed'

export function useWebSocket(onMessage: (message: WSMessage) => void) {
  const [status, setStatus] = useState<SocketStatus>('connecting')
  const callbackRef = useRef(onMessage)

  useEffect(() => {
    callbackRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let reconnectTimer: number | undefined
    let stopped = false
    let socket: WebSocket | undefined

    const connect = () => {
      setStatus('connecting')
      socket = new WebSocket(WS_URL)

      socket.onopen = () => setStatus('open')
      socket.onmessage = (event) => {
        try {
          callbackRef.current(JSON.parse(event.data) as WSMessage)
        } catch {
          // Ignore malformed messages from debugging clients.
        }
      }
      socket.onclose = () => {
        setStatus('closed')
        if (!stopped) {
          reconnectTimer = window.setTimeout(connect, 2500)
        }
      }
      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      stopped = true
      window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  return status
}
