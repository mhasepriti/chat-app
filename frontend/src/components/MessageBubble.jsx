import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Reply, Pencil, Trash2, Ban } from 'lucide-react'

function formatTime(dateStr) {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
    return format(d, 'dd MMM, HH:mm')
  } catch {
    return ''
  }
}

function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

function groupByDate(messages) {
  const groups = []
  let currentDate = null
  messages.forEach((msg) => {
    try {
      const d = parseISO(msg.created_at)
      let label
      if (isToday(d)) label = 'Today'
      else if (isYesterday(d)) label = 'Yesterday'
      else label = format(d, 'MMMM d, yyyy')

      if (label !== currentDate) {
        groups.push({ type: 'separator', label })
        currentDate = label
      }
    } catch {
      // ignore date error
    }
    groups.push({ type: 'message', ...msg })
  })
  return groups
}

function isOnlyEmojis(text) {
  if (!text) return false
  const trimmed = text.trim()
  try {
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u
    if (emojiRegex.test(trimmed)) {
      const count = [...trimmed].filter((c) => c.trim().length > 0).length
      return count >= 1 && count <= 4
    }
  } catch {
    return false
  }
  return false
}

export default function MessageBubble({
  messages,
  currentUserId,
  friend,
  onReply,
  onEdit,
  onDelete,
  onJumpToMessage,
  highlightedMsgId,
}) {
  const items = groupByDate(messages)

  return (
    <>
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <DateSeparator key={`sep-${i}`} label={item.label} />
        }
        const isSent = item.sender_id === currentUserId
        const isDeleted = Boolean(item.is_deleted)
        const onlyEmojis = !isDeleted && isOnlyEmojis(item.content)
        const isHighlighted = highlightedMsgId === item.id

        return (
          <div
            key={item.id}
            id={`msg-${item.id}`}
            className={`group relative flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in my-1`}
          >
            {/* WhatsApp-Style Hover Action Bar */}
            <div
              className={`absolute -top-3.5 ${
                isSent ? 'right-2' : 'left-2'
              } z-10 flex items-center gap-0.5 bg-dark-700/95 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 rounded-full px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto scale-95 group-hover:scale-100`}
            >
              <button
                type="button"
                onClick={() => onReply?.(item)}
                className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                title="Reply"
              >
                <Reply size={13} />
              </button>
              {isSent && !isDeleted && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit?.(item)}
                    className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-brand-300 transition"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(item)}
                    className="p-1 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>

            {/* Bubble Container */}
            <div
              className={`flex flex-col gap-0.5 max-w-xs sm:max-w-sm md:max-w-md transition-all duration-500 ${
                isHighlighted ? 'ring-2 ring-brand-400 rounded-2xl p-1 bg-brand-500/15' : ''
              }`}
            >
              {isDeleted ? (
                <div
                  className={`px-4 py-2.5 rounded-2xl ${
                    isSent
                      ? 'bg-brand-900/40 border border-brand-500/30 rounded-br-sm'
                      : 'bg-dark-500/60 border border-white/5 rounded-bl-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs italic text-gray-400">
                    <Ban size={13} className="text-gray-400 flex-shrink-0" />
                    <span>This message was deleted</span>
                  </div>
                </div>
              ) : onlyEmojis ? (
                <div className="py-1 px-1">
                  {/* Quoted preview above emojis if any */}
                  {item.reply_to && (
                    <div
                      onClick={() => onJumpToMessage?.(item.reply_to_id || item.reply_to.id)}
                      className="rounded-lg p-2 mb-1.5 cursor-pointer text-left transition-colors border-l-4 bg-dark-600/80 hover:bg-dark-500/80 border-brand-500"
                    >
                      <p className="text-[11px] font-semibold text-brand-400 leading-tight">
                        {item.reply_to.sender_id === currentUserId
                          ? 'You'
                          : (item.reply_to.sender_username || friend?.username || 'User')}
                      </p>
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        {item.reply_to.is_deleted ? 'This message was deleted' : item.reply_to.content}
                      </p>
                    </div>
                  )}
                  <p className="text-3xl sm:text-4xl leading-tight select-text filter drop-shadow">
                    {item.content}
                  </p>
                </div>
              ) : (
                <div className={isSent ? 'message-bubble-sent' : 'message-bubble-received'}>
                  {/* Quoted Reply Card Inside Bubble */}
                  {item.reply_to && (
                    <div
                      onClick={() => onJumpToMessage?.(item.reply_to_id || item.reply_to.id)}
                      className={`rounded-lg p-2 mb-2 cursor-pointer text-left transition-all border-l-4 ${
                        isSent
                          ? 'bg-black/25 hover:bg-black/35 border-brand-200'
                          : 'bg-black/20 dark:bg-dark-600/90 hover:bg-black/30 border-brand-500'
                      }`}
                      title="Click to jump to original message"
                    >
                      <p
                        className={`text-[11px] font-semibold leading-tight ${
                          isSent ? 'text-brand-200' : 'text-brand-400'
                        }`}
                      >
                        {item.reply_to.sender_id === currentUserId
                          ? 'You'
                          : (item.reply_to.sender_username || friend?.username || 'User')}
                      </p>
                      <p className="text-xs opacity-90 truncate mt-0.5">
                        {item.reply_to.is_deleted ? (
                          <span className="italic flex items-center gap-1 opacity-75">
                            <Ban size={10} /> This message was deleted
                          </span>
                        ) : (
                          item.reply_to.content
                        )}
                      </p>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                    {item.content}
                  </p>
                </div>
              )}

              {/* Timestamp, Edited Badge & Read Receipts */}
              <div
                className={`text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 px-1 ${
                  isSent ? 'justify-end' : 'justify-start'
                }`}
              >
                <span>{formatTime(item.created_at)}</span>
                {item.is_edited && !isDeleted && (
                  <span className="italic text-gray-400 text-[10px]">(edited)</span>
                )}
                {isSent && item.read_at && (
                  <span className="text-brand-400 font-bold ml-0.5">✓✓</span>
                )}
                {isSent && !item.read_at && <span className="ml-0.5">✓</span>}
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}
