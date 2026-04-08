'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, MoreVertical, Bot, CheckCheck, UserCheck, Phone } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../lib/api'
import { useInboxStore } from '../../../store/inbox'
import { ConversationListItem } from '../../../components/chat/ConversationListItem'
import { ChatBubble } from '../../../components/chat/ChatBubble'
import { TypingIndicator } from '../../../components/chat/TypingIndicator'
import { MessageInput } from '../../../components/chat/MessageInput'
import { getInitials } from '../../../lib/utils'
import type { Conversation, Message } from '@sendergenie/shared'
import toast from 'react-hot-toast'

const FILTER_TABS = ['כל', 'לא נקרא', 'Bot', 'שלי'] as const

export default function InboxPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<typeof FILTER_TABS[number]>('כל')

  const {
    conversations, activeConversationId, messages,
    setConversations, setActiveConversation, setMessages,
    addMessage, updateConversation,
  } = useInboxStore()

  useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<{ conversations: Array<{ conversation: Conversation; contact: Conversation['contact'] }> }>('/api/conversations')
      const convs = res.data.conversations.map(r => ({ ...r.conversation, contact: r.contact }))
      setConversations(convs)
      return convs
    },
    refetchInterval: 5_000,
  })

  const activeConv = conversations.find(c => c.id === activeConversationId)

  useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return []
      const res = await api.get<{ messages: Message[] }>(`/api/conversations/${activeConversationId}/messages`)
      setMessages(activeConversationId, res.data.messages)
      await api.patch(`/api/conversations/${activeConversationId}/read`)
      return res.data.messages
    },
    enabled: !!activeConversationId,
    refetchInterval: 5000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages[activeConversationId ?? '']])

  const sendMutation = useMutation({
    mutationFn: async ({ body, isNote }: { body: string; isNote: boolean }) => {
      const res = await api.post<{ message: Message }>(
        `/api/conversations/${activeConversationId}/messages`,
        { body, is_note: isNote }
      )
      return res.data.message
    },
    onSuccess: (msg) => {
      if (activeConversationId) {
        addMessage(activeConversationId, msg)
        updateConversation(activeConversationId, { last_message_preview: msg.body.slice(0, 80), last_message_at: msg.created_at })
      }
    },
    onError: () => toast.error('שליחה נכשלה'),
  })

  const toggleAI = useCallback(async () => {
    if (!activeConversationId || !activeConv) return
    const enabled = !activeConv.ai_auto_reply
    await api.post(`/api/conversations/${activeConversationId}/ai-toggle`, { enabled })
    updateConversation(activeConversationId, { ai_auto_reply: enabled })
    toast.success(enabled ? '🤖 AI הופעל' : 'AI כובה')
  }, [activeConversationId, activeConv, updateConversation])

  const filtered = conversations.filter(c => {
    const name  = (c.contact?.name ?? c.contact?.phone ?? '').toLowerCase()
    const q     = search.toLowerCase()
    if (search && !name.includes(q) && !(c.contact?.phone ?? '').includes(q)) return false
    if (filter === 'לא נקרא') return c.unread_count > 0
    if (filter === 'Bot') return c.ai_auto_reply
    return true
  })

  const currentMessages = activeConversationId ? (messages[activeConversationId] ?? []) : []
  const contactName = activeConv?.contact?.name ?? activeConv?.contact?.phone ?? ''

  return (
    <div className="flex h-full">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className="w-[320px] flex-shrink-0 bg-[#0f1923] border-l border-white/5 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-white">הודעות</h1>
            <span className="text-xs text-gray-600">{conversations.length} שיחות</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש..." dir="rtl"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-9 pl-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500/50 transition-all"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-2">
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${filter === tab ? 'bg-green-500 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-sm">
              אין שיחות
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => setActiveConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-[#111827]">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0f1923] border-b border-white/5 flex-shrink-0">
            <div className={`w-9 h-9 rounded-full gradient-green flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {getInitials(contactName)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">{contactName}</h2>
              <p className="text-xs text-gray-500 truncate">{activeConv.contact?.phone}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void toggleAI()}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                  activeConv.ai_auto_reply
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                {activeConv.ai_auto_reply ? 'AI פעיל' : 'AI כבוי'}
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 chat-bg">
            {currentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                אין הודעות עדיין
              </div>
            ) : (
              currentMessages.map(msg => <ChatBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <MessageInput
            onSend={async (body, isNote) => { await sendMutation.mutateAsync({ body, isNote }) }}
            disabled={sendMutation.isPending}
          />
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#111827] chat-bg">
          <div className="text-center glass rounded-2xl p-10 border border-white/10">
            <div className="w-16 h-16 rounded-2xl gradient-green flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
              <CheckCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">SenderGenie Inbox</h2>
            <p className="text-gray-500 text-sm">בחר שיחה מהרשימה כדי להתחיל</p>
          </div>
        </div>
      )}
    </div>
  )
}
