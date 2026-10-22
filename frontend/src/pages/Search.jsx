import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Search as SearchIcon, UserPlus, Loader2, Check, Clock } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Search() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sentIds, setSentIds] = useState(new Set())
  const [friendIds, setFriendIds] = useState(new Set())
  const [incomingIds, setIncomingIds] = useState(new Set())
  const [sendingId, setSendingId] = useState(null)
  const searchTimeout = useRef(null)

  // Load existing relationship statuses
  useEffect(() => {
    async function loadRelationships() {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          api.get('/friends'),
          api.get('/friends/requests')
        ])
        setFriendIds(new Set((friendsRes.data || []).map(f => f.id)))
        setSentIds(new Set((requestsRes.data?.sent || []).map(r => r.addressee_id)))
        setIncomingIds(new Set((requestsRes.data?.incoming || []).map(r => r.requester_id)))
      } catch (err) {
        console.error('Failed to load relationships', err)
      }
    }
    loadRelationships()
  }, [])

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(data)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(val), 350)
  }

  const sendRequest = async (addresseeId) => {
    setSendingId(addresseeId)
    try {
      await api.post('/friends/request', { addressee_id: addresseeId })
      setSentIds(prev => new Set([...prev, addresseeId]))
      toast.success('Friend request sent! 🚀')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send request')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="btn-secondary p-2.5">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SearchIcon size={22} className="text-brand-400" /> Find People
          </h1>
          <p className="text-gray-500 text-sm">Search by username and add friends</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          id="search-input"
          className="input-field pl-12 text-base py-4"
          placeholder="Search by username..."
          value={query}
          onChange={handleInput}
          autoFocus
        />
        {loading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.length === 0 && query && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found for "{query}"</p>
          </div>
        )}
        {results.map((u) => {
          const isFriend = friendIds.has(u.id)
          const alreadySent = sentIds.has(u.id)
          const hasIncoming = incomingIds.has(u.id)
          const isSending = sendingId === u.id

          return (
            <div
              key={u.id}
              className="flex items-center gap-4 p-4 glass-card rounded-xl hover:bg-dark-500/40 transition-all duration-200 animate-fade-in"
            >
              <div className="avatar w-11 h-11 text-base flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{u.username}</p>
                <p className="text-xs text-gray-500">#{u.id}</p>
              </div>

              {isFriend ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                  Friends
                </span>
              ) : alreadySent ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 font-medium">
                  <Check size={12} /> Request Sent
                </span>
              ) : hasIncoming ? (
                <Link
                  to="/requests"
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Respond
                </Link>
              ) : (
                <button
                  id={`add-${u.id}`}
                  onClick={() => sendRequest(u.id)}
                  disabled={isSending}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {isSending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  Add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!query && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <SearchIcon size={32} className="text-brand-500/50" />
          </div>
          <p className="text-gray-500 text-sm">Type a username to search</p>
        </div>
      )}
    </div>
  )
}
