import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const NotificationContext = createContext(null)

// Synthesize pleasant chime using Web Audio API (zero external asset dependencies)
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
    gain1.gain.setValueAtTime(0.12, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.25)

    // Note 2: A5 (880 Hz) harmonic
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08)
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.08)
    osc2.stop(ctx.currentTime + 0.35)
  } catch {
    // Ignore audio context block if user hasn't interacted yet
  }
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { subscribe } = useSocket()
  const navigate = useNavigate()

  const [permission, setPermission] = useState(() => {
    return 'Notification' in window ? Notification.permission : 'denied'
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('sound_enabled') !== 'false'
  })

  // Ref to track which friend's conversation is currently active in view
  const activeFriendIdRef = useRef(null)

  const setActiveFriendId = useCallback((id) => {
    activeFriendIdRef.current = id
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('sound_enabled', String(next))
      if (next) playChime()
      return next
    })
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser does not support notifications')
      return false
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        toast.success('Push notifications enabled! 🔔')
        // Show test notification
        try {
          new Notification('ChatApp', {
            body: 'Push notifications are active!',
            icon: '/favicon.ico',
          })
        } catch {
          // Ignore
        }
        return true
      } else {
        toast('Push notifications disabled', { icon: '🔕' })
        return false
      }
    } catch {
      return false
    }
  }, [])

  const openConversation = useCallback((friendId) => {
    navigate(`/?chat=${friendId}`)
  }, [navigate])

  // Listen to incoming messages globally across the entire app
  useEffect(() => {
    if (!user?.id || !subscribe) return

    const unsub = subscribe('message', (msg) => {
      // Don't notify if the message was sent by the current user
      if (msg.sender_id === user.id) return

      const isViewingThisChat = activeFriendIdRef.current === msg.sender_id
      const isWindowHidden = document.hidden

      // If user is actively chatting in this conversation AND window is focused,
      // only play subtle sound or do nothing (since message bubble is visible)
      if (isViewingThisChat && !isWindowHidden) {
        return
      }

      // 1. Play notification sound
      if (soundEnabled) {
        playChime()
      }

      const senderName = msg.sender_username || `User #${msg.sender_id}`
      const preview = (msg.content || '').length > 60 
        ? `${msg.content.slice(0, 60)}...` 
        : msg.content

      // 2. Native Browser Push Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(senderName, {
            body: preview,
            icon: '/favicon.ico',
            tag: `chat-msg-${msg.sender_id}`, // Groups notifications from same sender
          })
          notif.onclick = () => {
            window.focus()
            openConversation(msg.sender_id)
            notif.close()
          }
        } catch (e) {
          console.warn('Native notification display error:', e)
        }
      }

      // 3. In-App Interactive Toast Notification
      toast.custom(
        (t) => (
          <div
            id={`notif-${msg.id}`}
            onClick={() => {
              toast.dismiss(t.id)
              openConversation(msg.sender_id)
            }}
            className={`max-w-sm w-full bg-dark-700/95 backdrop-blur-md border border-brand-500/40 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-brand-500 hover:scale-[1.02] transition-all duration-200 ${
              t.visible ? 'animate-fade-in' : 'opacity-0 scale-95'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-md shadow-brand-500/20">
              {senderName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-white truncate">
                  {senderName}
                </p>
                <span className="text-[10px] text-brand-400 font-medium flex-shrink-0">
                  New message
                </span>
              </div>
              <p className="text-xs text-gray-300 truncate mt-0.5">
                {preview}
              </p>
            </div>
            <span className="text-[11px] bg-brand-600/30 text-brand-300 border border-brand-500/30 px-2.5 py-1 rounded-lg flex-shrink-0 font-medium">
              Reply
            </span>
          </div>
        ),
        { id: `chat-${msg.sender_id}`, duration: 4500 }
      )
    })

    const unsubReq = subscribe('friend_request', (data) => {
      if (soundEnabled) playChime()
      const name = data.sender_username || 'Someone'
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification('Friend Request', {
            body: `${name} sent you a friend request!`,
            icon: '/favicon.ico',
          })
          notif.onclick = () => {
            window.focus()
            navigate('/requests')
            notif.close()
          }
        } catch {
          // ignore
        }
      }
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              navigate('/requests')
            }}
            className={`max-w-sm w-full bg-dark-700/95 backdrop-blur-md border border-amber-500/40 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-amber-500 hover:scale-[1.02] transition-all duration-200 ${
              t.visible ? 'animate-fade-in' : 'opacity-0 scale-95'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-md">
              {name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{name}</p>
              <p className="text-xs text-amber-200/90 mt-0.5">Sent you a friend request</p>
            </div>
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg flex-shrink-0 font-medium">
              View
            </span>
          </div>
        ),
        { duration: 5000 }
      )
    })

    const unsubAccept = subscribe('friend_accepted', (data) => {
      if (soundEnabled) playChime()
      const name = data.sender_username || 'A user'
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification('Friend Request Accepted', {
            body: `${name} accepted your friend request!`,
            icon: '/favicon.ico',
          })
          notif.onclick = () => {
            window.focus()
            openConversation(data.sender_id)
            notif.close()
          }
        } catch {
          // ignore
        }
      }
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              openConversation(data.sender_id)
            }}
            className={`max-w-sm w-full bg-dark-700/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-emerald-500 hover:scale-[1.02] transition-all duration-200 ${
              t.visible ? 'animate-fade-in' : 'opacity-0 scale-95'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-md">
              {name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{name}</p>
              <p className="text-xs text-emerald-300 mt-0.5">Accepted your friend request! 🎉</p>
            </div>
            <span className="text-[11px] bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex-shrink-0 font-medium">
              Chat
            </span>
          </div>
        ),
        { duration: 5000 }
      )
    })

    return () => {
      unsub()
      unsubReq?.()
      unsubAccept?.()
    }
  }, [user?.id, subscribe, soundEnabled, openConversation, navigate])

  return (
    <NotificationContext.Provider
      value={{
        permission,
        soundEnabled,
        requestPermission,
        toggleSound,
        setActiveFriendId,
        playChime,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider')
  return ctx
}
