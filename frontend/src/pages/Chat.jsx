import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  MessageCircle, Search, UserPlus, Bell, BellRing, BellOff,
  LogOut, Send, ChevronDown, Wifi, WifiOff, Loader2, Users,
  Hash, Volume2, VolumeX, Settings, Sun, Moon, MoreVertical
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useNotifications } from '../context/NotificationContext'
import { useTheme } from '../context/ThemeContext'
import FriendList from '../components/FriendList'
import ChatWindow from '../components/ChatWindow'

export default function Chat() {
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { theme, toggleTheme, isDark } = useTheme()
  const {
    permission,
    soundEnabled,
    requestPermission,
    toggleSound,
    setActiveFriendId,
  } = useNotifications()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [friends, setFriends] = useState([])
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { subscribe } = useSocket()

  // Close 3-dots menu on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest('#user-menu-btn')) {
        setMenuOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const fetchFriends = useCallback(async () => {
    try {
      const { data } = await api.get('/friends')
      setFriends(data)
    } catch {
      toast.error('Could not load friends')
    } finally {
      setLoadingFriends(false)
    }
  }, [])

  useEffect(() => { fetchFriends() }, [fetchFriends])

  // Track active chat in notifications context
  useEffect(() => {
    setActiveFriendId(selectedFriend?.id || null)
    return () => setActiveFriendId(null)
  }, [selectedFriend, setActiveFriendId])

  // Automatically select friend if specified in ?chat= URL param
  const chatParam = searchParams.get('chat')
  useEffect(() => {
    if (chatParam && friends.length > 0) {
      const targetId = parseInt(chatParam, 10)
      const targetFriend = friends.find(f => f.id === targetId)
      if (targetFriend) {
        setSelectedFriend(targetFriend)
        setFriends(prev => prev.map(f => f.id === targetId ? { ...f, unread_count: 0 } : f))
        setSearchParams({}, { replace: true })
      }
    }
  }, [chatParam, friends, setSearchParams])

  // Listen for presence updates
  useEffect(() => {
    const unsub = subscribe('presence', (data) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        data.is_online ? next.add(data.user_id) : next.delete(data.user_id)
        return next
      })
    })
    return unsub
  }, [subscribe])

  // Update unread counts when a new message arrives for a different friend
  useEffect(() => {
    const unsub = subscribe('message', (msg) => {
      if (msg.sender_id !== selectedFriend?.id) {
        setFriends(prev => {
          const exists = prev.some(f => f.id === msg.sender_id)
          if (!exists) {
            // Friend might have just been accepted, refresh
            fetchFriends()
            return prev
          }
          return prev.map(f =>
            f.id === msg.sender_id ? { ...f, unread_count: (f.unread_count || 0) + 1 } : f
          )
        })
      }
    })
    return unsub
  }, [subscribe, selectedFriend, fetchFriends])

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend)
    // Clear unread for this friend
    setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, unread_count: 0 } : f))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-white/5 bg-dark-800 transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'} flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          {/* Top Logo & Connection status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={16} className="text-brand-400" />
              </div>
              <span className="font-bold text-white text-base tracking-tight truncate">ChatApp</span>
            </div>

            <div
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${
                isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isConnected ? 'Live' : 'Off'}
            </div>
          </div>

          {/* User Profile Card with 3-Dots Menu */}
          <div className="relative">
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-dark-500/50">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="avatar w-9 h-9 text-sm flex-shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate" title={user?.username}>
                    {user?.username}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Online
                  </p>
                </div>
              </div>

              {/* 3 Dots Menu Button */}
              <button
                id="user-menu-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                  menuOpen
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title="Options"
              >
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Floating Dropdown Menu */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-2 w-64 glass-card border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in"
              >
                {/* User Info Header inside menu */}
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>

                {/* Theme Toggle Option */}
                <button
                  id="menu-toggle-theme"
                  onClick={() => toggleTheme()}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
                    <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize">{theme}</span>
                </button>

                {/* Sound Toggle Option */}
                <button
                  id="menu-toggle-sound"
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {soundEnabled ? <Volume2 size={15} className="text-brand-400" /> : <VolumeX size={15} className="text-gray-500" />}
                    <span>Sound Effects</span>
                  </span>
                  <span className={`text-[10px] font-medium ${soundEnabled ? 'text-brand-400' : 'text-gray-500'}`}>
                    {soundEnabled ? 'On' : 'Muted'}
                  </span>
                </button>

                {/* Push Notifications Option */}
                <button
                  id="menu-toggle-push"
                  onClick={requestPermission}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {permission === 'granted' ? <BellRing size={15} className="text-emerald-400" /> : <Bell size={15} className="text-amber-400" />}
                    <span>Desktop Alerts</span>
                  </span>
                  <span className={`text-[10px] font-medium ${permission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {permission === 'granted' ? 'Active' : 'Enable'}
                  </span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                {/* Settings Link */}
                <Link
                  to="/settings"
                  id="menu-link-settings"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  <span>Settings Page</span>
                </Link>

                <div className="h-px bg-white/5 my-1" />

                {/* Sign Out Option */}
                <button
                  id="menu-btn-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Push Notification Prompt Banner if not granted */}
        {permission === 'default' && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-brand-600/15 border border-brand-500/30 flex items-center justify-between gap-2 animate-fade-in flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing size={14} className="text-brand-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-200 truncate">Get push notifications</span>
            </div>
            <button
              onClick={requestPermission}
              className="text-[11px] bg-brand-600 hover:bg-brand-500 text-white font-medium px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 shadow-sm shadow-brand-500/20"
            >
              Allow
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1">
            <Link to="/search" id="nav-search" className="sidebar-item text-xs text-gray-400 hover:text-white justify-center px-1">
              <Search size={13} />Search
            </Link>
            <Link to="/requests" id="nav-requests" className="sidebar-item text-xs text-gray-400 hover:text-white justify-center px-1">
              <Bell size={13} />Requests
            </Link>
            <Link to="/settings" id="nav-settings" className="sidebar-item text-xs text-gray-400 hover:text-white justify-center px-1">
              <Settings size={13} />Settings
            </Link>
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="text-xs text-gray-600 uppercase tracking-widest px-2 mb-2 font-medium">
            Friends · {friends.length}
          </p>
          {loadingFriends ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-brand-500" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Users size={32} className="mx-auto text-gray-700 mb-2" />
              <p className="text-gray-600 text-xs">No friends yet</p>
              <Link to="/search" className="text-brand-400 text-xs hover:text-brand-300 mt-1 inline-block">
                Find people →
              </Link>
            </div>
          ) : (
            <FriendList
              friends={friends}
              selectedId={selectedFriend?.id}
              onlineUsers={onlineUsers}
              onSelect={handleSelectFriend}
            />
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(p => !p)}
          className="absolute top-4 left-4 z-10 md:hidden w-8 h-8 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-white"
        >
          <Hash size={16} />
        </button>

        {selectedFriend ? (
          <ChatWindow
            friend={selectedFriend}
            isOnline={onlineUsers.has(selectedFriend.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
                <MessageCircle size={40} className="text-brand-500/60" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center border border-brand-500/30">
                <span className="text-lg">👋</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start chatting</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              Select a friend from the sidebar to open a conversation
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/search" className="btn-primary text-sm flex items-center gap-2">
                <UserPlus size={15} /> Add Friend
              </Link>
              <Link to="/requests" className="btn-secondary text-sm flex items-center gap-2">
                <Bell size={15} /> Requests
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
