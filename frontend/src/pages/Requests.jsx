import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Bell, Check, X, Loader2, Clock, Send, Users } from 'lucide-react'
import api from '../api/axios'
import { formatDistanceToNow } from 'date-fns'

function Avatar({ username, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'
  return (
    <div className={`avatar ${sizeClass}`}>
      {username?.[0]?.toUpperCase()}
    </div>
  )
}

function RequestCard({ request, type, onAccept, onReject, loading }) {
  const otherUser = type === 'incoming' ? request.requester : request.addressee
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true })

  return (
    <div className="flex items-center gap-3 p-4 glass-card rounded-xl hover:bg-dark-500/50 transition-all duration-200 animate-fade-in">
      <Avatar username={otherUser.username} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{otherUser.username}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <Clock size={10} /> {timeAgo}
        </p>
      </div>
      {type === 'incoming' && (
        <div className="flex gap-2">
          <button
            id={`accept-${request.id}`}
            onClick={() => onAccept(request.id)}
            disabled={loading}
            className="btn-success flex items-center gap-1 text-sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accept
          </button>
          <button
            id={`reject-${request.id}`}
            onClick={() => onReject(request.id)}
            disabled={loading}
            className="btn-danger flex items-center gap-1 text-sm"
          >
            <X size={14} /> Reject
          </button>
        </div>
      )}
      {type === 'sent' && (
        <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
          <Send size={10} /> Pending
        </span>
      )}
    </div>
  )
}

export default function Requests() {
  const [incoming, setIncoming] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [tab, setTab] = useState('incoming')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/friends/requests')
      setIncoming(data.incoming || [])
      setSent(data.sent || [])
    } catch {
      toast.error('Could not load friend requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAccept = async (id) => {
    setActionLoading(id)
    try {
      await api.post(`/friends/requests/${id}/accept`)
      toast.success('Friend request accepted! 🎉')
      setIncoming(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      await api.post(`/friends/requests/${id}/reject`)
      toast.success('Request rejected')
      setIncoming(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="btn-secondary p-2.5">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={22} className="text-brand-400" /> Friend Requests
          </h1>
          <p className="text-gray-500 text-sm">Manage your friend requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-dark-700 rounded-xl mb-6">
        <button
          id="tab-incoming"
          onClick={() => setTab('incoming')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${tab === 'incoming' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Incoming
          {incoming.length > 0 && (
            <span className="unread-badge">{incoming.length}</span>
          )}
        </button>
        <button
          id="tab-sent"
          onClick={() => setTab('sent')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${tab === 'sent' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Send size={13} /> Sent
          {sent.length > 0 && (
            <span className="unread-badge">{sent.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'incoming' && (
            incoming.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500">No incoming requests</p>
              </div>
            ) : (
              incoming.map(r => (
                <RequestCard
                  key={r.id} request={r} type="incoming"
                  onAccept={handleAccept} onReject={handleReject}
                  loading={actionLoading === r.id}
                />
              ))
            )
          )}
          {tab === 'sent' && (
            sent.length === 0 ? (
              <div className="text-center py-16">
                <Send size={40} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500">No pending sent requests</p>
              </div>
            ) : (
              sent.map(r => (
                <RequestCard key={r.id} request={r} type="sent" />
              ))
            )
          )}
        </div>
      )}
    </div>
  )
}
