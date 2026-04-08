import { create } from 'zustand'
import type { Conversation, Message } from '@sendergenie/shared'

interface InboxState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>     // keyed by conversation_id
  unreadTotal: number

  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, waMessageId: string, updates: Partial<Message>) => void
  markRead: (conversationId: string) => void
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  unreadTotal: 0,

  setConversations: (conversations) => {
    const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0)
    set({ conversations, unreadTotal })
  },

  addConversation: (conversation) => {
    set(state => ({
      conversations: [conversation, ...state.conversations.filter(c => c.id !== conversation.id)],
    }))
  },

  updateConversation: (id, updates) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
      unreadTotal: state.conversations.reduce((sum, c) =>
        sum + (c.id === id ? (updates.unread_count ?? c.unread_count) : c.unread_count), 0
      ),
    }))
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
    if (id) get().markRead(id)
  },

  setMessages: (conversationId, messages) => {
    set(state => ({
      messages: { ...state.messages, [conversationId]: messages },
    }))
  },

  addMessage: (conversationId, message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    }))
  },

  updateMessage: (conversationId, waMessageId, updates) => {
    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map(m =>
          m.wa_message_id === waMessageId ? { ...m, ...updates } : m
        ),
      },
    }))
  },

  markRead: (conversationId) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
      unreadTotal: Math.max(0, state.unreadTotal -
        (state.conversations.find(c => c.id === conversationId)?.unread_count ?? 0)
      ),
    }))
  },
}))
