export default function FriendList({ friends, selectedId, onlineUsers, onSelect }) {
  return (
    <div className="space-y-0.5">
      {friends.map((friend) => {
        const isOnline = onlineUsers.has(friend.id)
        const isSelected = selectedId === friend.id
        return (
          <button
            key={friend.id}
            id={`friend-${friend.id}`}
            onClick={() => onSelect(friend)}
            className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-150 text-left group ${
              isSelected
                ? 'bg-brand-600/20 border border-brand-500/20'
                : 'hover:bg-dark-400/50 border border-transparent'
            }`}
          >
            {/* Avatar with online dot */}
            <div className="relative flex-shrink-0">
              <div className={`avatar w-10 h-10 text-sm ${isSelected ? 'ring-2 ring-brand-500/50' : ''}`}>
                {friend.username[0].toUpperCase()}
              </div>
              {isOnline && <span className="online-dot" />}
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-300' : 'text-gray-200 group-hover:text-white'}`}>
                {friend.username}
              </p>
              <p className={`text-xs truncate ${isOnline ? 'text-emerald-400' : 'text-gray-600'}`}>
                {isOnline ? '● Online' : '○ Offline'}
              </p>
            </div>

            {/* Unread badge */}
            {friend.unread_count > 0 && !isSelected && (
              <span className="unread-badge flex-shrink-0">
                {friend.unread_count > 99 ? '99+' : friend.unread_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
