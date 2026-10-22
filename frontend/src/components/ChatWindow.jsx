import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ChevronUp, Loader2, Smile, Reply, Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import MessageBubble from './MessageBubble'
import EmojiPicker from './EmojiPicker'

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-dark-400 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

export default function ChatWindow({ friend, isOnline }) {
  const { user } = useAuth()
  const { subscribe, sendWs } = useSocket()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [friendTyping, setFriendTyping] = useState(false)

  // WhatsApp-Style Feature States
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [deleteModalMsg, setDeleteModalMsg] = useState(null)
  const [highlightedMsgId, setHighlightedMsgId] = useState(null)

  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const textareaRef = useRef(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async (beforeId = null) => {
    try {
      const params = { limit: 30 }
      if (beforeId) params.before_id = beforeId
      const { data } = await api.get(`/messages/${friend.id}`, { params })
      if (beforeId) {
        setMessages(prev => [...data, ...prev])
      } else {
        setMessages(data)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      setHasMore(data.length === 30)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [friend.id])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setHasMore(true)
    setReplyingTo(null)
    setEditingMessage(null)
    setInput('')
    fetchMessages()
    // Mark as read
    api.post(`/messages/${friend.id}/read`).catch(() => {})
  }, [friend.id, fetchMessages])

  // Listen for incoming WS messages
  useEffect(() => {
    const unsubMsg = subscribe('message', (msg) => {
      const relevant =
        (msg.sender_id === friend.id && msg.receiver_id === user.id) ||
        (msg.sender_id === user.id && msg.receiver_id === friend.id)

      if (relevant) {
        setMessages(prev => {
          // Avoid duplicate (server echo)
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
        // Mark read if incoming
        if (msg.sender_id === friend.id) {
          api.post(`/messages/${friend.id}/read`).catch(() => {})
        }
      }
    })

    const unsubEdit = subscribe('message_edited', (data) => {
      setMessages(prev => prev.map(m =>
        m.id === data.id
          ? { ...m, content: data.content, is_edited: true, edited_at: data.edited_at }
          : m
      ))
    })

    const unsubDel = subscribe('message_deleted', (data) => {
      setMessages(prev => prev.map(m =>
        m.id === data.id
          ? { ...m, is_deleted: true, content: 'This message was deleted' }
          : m
      ))
    })

    return () => {
      unsubMsg()
      unsubEdit()
      unsubDel()
    }
  }, [subscribe, friend.id, user.id])

  // Listen for typing
  useEffect(() => {
    const unsub = subscribe('typing', (data) => {
      if (data.from === friend.id) {
        setFriendTyping(data.is_typing)
        if (data.is_typing) {
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setFriendTyping(false), 3000)
        }
      }
    })
    return unsub
  }, [subscribe, friend.id])

  // Listen for read receipts
  useEffect(() => {
    const unsub = subscribe('read', (data) => {
      if (data.by === friend.id) {
        setMessages(prev => prev.map(m =>
          m.sender_id === user.id && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        ))
      }
    })
    return unsub
  }, [subscribe, friend.id, user.id])

  const sendTyping = useCallback((isTyping) => {
    sendWs({ type: 'typing', to: friend.id, is_typing: isTyping })
  }, [sendWs, friend.id])

  const handleInput = (e) => {
    setInput(e.target.value)
    if (!editingMessage) {
      sendTyping(true)
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => sendTyping(false), 1500)
    }
  }

  const handleSelectEmoji = (emoji) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart ?? input.length
      const end = textarea.selectionEnd ?? input.length
      const nextValue = input.substring(0, start) + emoji + input.substring(end)
      setInput(nextValue)
      setTimeout(() => {
        textarea.focus()
        const newPos = start + emoji.length
        textarea.setSelectionRange(newPos, newPos)
      }, 10)
    } else {
      setInput((prev) => prev + emoji)
    }
    if (!editingMessage) sendTyping(true)
  }

  // Reply Action
  const handleStartReply = (msg) => {
    if (editingMessage) {
      setEditingMessage(null)
      setInput('')
    }
    setReplyingTo(msg)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  // Edit Action
  const handleStartEdit = (msg) => {
    if (msg.is_deleted) return
    if (replyingTo) {
      setReplyingTo(null)
    }
    setEditingMessage(msg)
    setInput(msg.content)
    setTimeout(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    }, 50)
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setInput('')
  }

  // Delete Action
  const handleStartDelete = (msg) => {
    setDeleteModalMsg(msg)
  }

  const confirmDelete = async () => {
    if (!deleteModalMsg) return
    const msgId = deleteModalMsg.id

    // Optimistic UI update
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
    ))

    // Broadcast via WS
    sendWs({
      type: 'delete_message',
      message_id: msgId,
      to: friend.id,
    })

    // REST fallback for persistence guarantee
    try {
      await api.delete(`/messages/${msgId}`)
    } catch {
      // already deleted or WS handled
    }

    setDeleteModalMsg(null)
    toast.success('Message deleted')
  }

  // Jump to message
  const handleJumpToMessage = (targetMsgId) => {
    if (!targetMsgId) return
    const el = document.getElementById(`msg-${targetMsgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(targetMsgId)
      setTimeout(() => setHighlightedMsgId(null), 1800)
    } else {
      toast('Message is earlier in history', { icon: 'ℹ️' })
    }
  }

  // Send or Save
  const handleSendOrSave = async () => {
    const content = input.trim()
    if (!content) return

    if (editingMessage) {
      // Save Edit
      const msgId = editingMessage.id

      // Optimistic update
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() }
          : m
      ))

      // Send WS
      sendWs({
        type: 'edit_message',
        message_id: msgId,
        to: friend.id,
        content,
      })

      // REST fallback
      try {
        await api.patch(`/messages/${msgId}`, { content })
      } catch {
        // WS handled
      }

      setEditingMessage(null)
      setInput('')
      setShowEmojiPicker(false)
      toast.success('Message updated')
    } else {
      // Normal Message / Reply
      sendWs({
        type: 'message',
        to: friend.id,
        content,
        reply_to_id: replyingTo ? replyingTo.id : null,
      })
      setInput('')
      setReplyingTo(null)
      setShowEmojiPicker(false)
      sendTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendOrSave()
    } else if (e.key === 'Escape') {
      if (editingMessage) cancelEdit()
      if (replyingTo) cancelReply()
    }
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    await fetchMessages(messages[0].id)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Delete Confirmation Modal */}
      {deleteModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Delete message?</h3>
                <p className="text-xs text-gray-400">Are you sure you want to delete this message?</p>
              </div>
            </div>

            <div className="bg-dark-700/80 p-3 rounded-xl border border-white/5 text-xs text-gray-300 line-clamp-2 italic">
              "{deleteModalMsg.content}"
            </div>

            <p className="text-[11px] text-gray-400">
              This message will be deleted for everyone in this chat.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalMsg(null)}
                className="btn-secondary text-xs px-3.5 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn-danger text-xs px-3.5 py-2 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Delete for everyone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-dark-800 flex-shrink-0">
        <div className="relative">
          <div className="avatar w-10 h-10 text-sm">
            {friend.username[0].toUpperCase()}
          </div>
          {isOnline && <span className="online-dot" />}
        </div>
        <div>
          <h2 className="font-semibold text-white">{friend.username}</h2>
          <p className={`text-xs ${isOnline ? 'text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {friendTyping ? (
              <span className="text-brand-400 animate-pulse">typing...</span>
            ) : (
              isOnline ? '● Online' : '○ Offline'
            )}
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronUp size={13} />}
              Load older messages
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <Send size={24} className="text-brand-500/50" />
            </div>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Say hello to {friend.username}!</p>
          </div>
        ) : (
          <MessageBubble
            messages={messages}
            currentUserId={user.id}
            friend={friend}
            onReply={handleStartReply}
            onEdit={handleStartEdit}
            onDelete={handleStartDelete}
            onJumpToMessage={handleJumpToMessage}
            highlightedMsgId={highlightedMsgId}
          />
        )}

        {friendTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-white/5 bg-dark-800 flex-shrink-0 relative">
        {showEmojiPicker && (
          <EmojiPicker
            onSelectEmoji={handleSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {/* WhatsApp-Style Reply Preview Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-dark-700 border-l-4 border-brand-500 rounded-t-xl text-xs mb-1.5 animate-fade-in shadow-inner">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-1.5 font-semibold text-brand-400">
                <Reply size={12} />
                <span>
                  Replying to{' '}
                  {replyingTo.sender_id === user.id
                    ? 'You'
                    : (replyingTo.sender_username || friend.username)}
                </span>
              </div>
              <p className="text-gray-300 truncate text-[11px] mt-0.5">
                {replyingTo.is_deleted ? 'This message was deleted' : replyingTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition flex-shrink-0"
              title="Cancel reply"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* WhatsApp-Style Edit Preview Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-amber-950/40 border-l-4 border-amber-400 rounded-t-xl text-xs mb-1.5 animate-fade-in shadow-inner">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Pencil size={12} />
                <span>Editing message</span>
              </div>
              <p className="text-gray-300 truncate text-[11px] mt-0.5">
                {editingMessage.content}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition flex-shrink-0"
              title="Cancel edit"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Text Input Row */}
        <div
          className={`flex items-end gap-2 bg-dark-600 border border-white/5 p-2 transition-all duration-200 ${
            replyingTo || editingMessage ? 'rounded-b-2xl' : 'rounded-2xl'
          } ${editingMessage ? 'focus-within:border-amber-400/50' : 'focus-within:border-brand-500/40'}`}
        >
          <button
            type="button"
            id="emoji-picker-btn"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              showEmojiPicker
                ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                : 'text-gray-400 hover:text-brand-400 hover:bg-white/5'
            }`}
            title="Add emoji"
          >
            <Smile size={19} />
          </button>
          <textarea
            ref={textareaRef}
            id="message-input"
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm resize-none outline-none max-h-32 py-1.5 px-1 min-h-[36px]"
            placeholder={
              editingMessage
                ? 'Edit your message...'
                : replyingTo
                ? `Replying to ${
                    replyingTo.sender_id === user.id
                      ? 'yourself'
                      : (replyingTo.sender_username || friend.username)
                  }...`
                : `Message ${friend.username}...`
            }
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            id="send-btn"
            onClick={handleSendOrSave}
            disabled={!input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              editingMessage
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-brand-600 hover:bg-brand-500 text-white'
            }`}
            title={editingMessage ? 'Save changes' : 'Send message'}
          >
            {editingMessage ? <Check size={16} /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1.5 px-2">
          {editingMessage
            ? 'Press Enter to save · Esc to cancel'
            : 'Press Enter to send · Shift+Enter for new line · Hover message for actions'}
        </p>
      </div>
    </div>
  )
}
