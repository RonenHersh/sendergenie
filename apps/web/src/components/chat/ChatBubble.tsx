'use client'

import { motion } from 'framer-motion'
import { Check, CheckCheck, Clock, Bot, AlertCircle } from 'lucide-react'
import { formatMessageTime, getTextDir } from '../../lib/utils'
import type { Message } from '@sendergenie/shared'

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'queued')    return <Clock className="w-3 h-3 text-gray-400" />
  if (status === 'sent')      return <Check className="w-3 h-3 text-gray-400" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-gray-400" />
  if (status === 'read')      return <CheckCheck className="w-3 h-3 text-blue-400" />
  if (status === 'failed')    return <AlertCircle className="w-3 h-3 text-red-400" />
  return null
}

export function ChatBubble({ message }: { message: Message }) {
  const isOut  = message.direction === 'outbound'
  const isNote = message.is_note
  const dir    = getTextDir(message.body)

  if (isNote) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-center mb-2 px-4">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 max-w-sm">
          <p className="text-xs text-yellow-400 font-medium mb-1">📝 הערה פנימית</p>
          <p className="text-sm text-yellow-200/80" dir={dir}>{message.body}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex mb-1 px-4 ${isOut ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative max-w-[72%] min-w-[80px] px-3.5 py-2.5 shadow-sm ${
        isOut ? 'bubble-out' : 'bubble-in'
      }`}>
        {message.ai_generated && (
          <div className="flex items-center gap-1 mb-1.5">
            <Bot className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] text-purple-500 font-semibold">AI</span>
          </div>
        )}

        <p dir={dir} className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {message.body}
        </p>

        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-gray-400">{formatMessageTime(message.created_at)}</span>
          {isOut && <StatusIcon status={message.status} />}
        </div>
      </div>
    </motion.div>
  )
}
