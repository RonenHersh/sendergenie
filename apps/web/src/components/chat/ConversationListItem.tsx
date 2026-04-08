'use client'

import { formatChatTime, truncate, getInitials } from '../../lib/utils'
import type { Conversation } from '@sendergenie/shared'
import { Bot } from 'lucide-react'

const AVATAR_COLORS = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-orange-500 to-amber-600',
  'from-purple-500 to-violet-600',
  'from-teal-500 to-cyan-600',
  'from-green-500 to-emerald-600',
]

function colorForPhone(phone: string) {
  const sum = phone.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]!
}

export function ConversationListItem({ conversation, isActive, onClick }: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  const contact = conversation.contact
  const name    = contact?.name ?? contact?.phone ?? 'Unknown'
  const initials = getInitials(name)
  const hasUnread = conversation.unread_count > 0
  const gradientClass = colorForPhone(contact?.phone ?? name)

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-right border-b border-white/5 ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold text-sm`}>
          {initials}
        </div>
        {conversation.ai_auto_reply && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center ring-2 ring-[#0f1923]">
            <Bot className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-white' : 'font-medium text-gray-300'}`}>
            {name}
          </span>
          <span className={`text-[11px] flex-shrink-0 mr-1 ${hasUnread ? 'text-green-400' : 'text-gray-600'}`}>
            {conversation.last_message_at ? formatChatTime(conversation.last_message_at) : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs truncate ${hasUnread ? 'text-gray-300' : 'text-gray-600'}`}>
            {truncate(conversation.last_message_preview ?? 'אין הודעות עדיין', 38)}
          </span>
          {hasUnread && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-[10px] text-white font-bold flex items-center justify-center">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </span>
          )}
        </div>

        {contact?.tags && contact.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {contact.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
