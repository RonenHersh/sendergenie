'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, StickyNote } from 'lucide-react'

export function MessageInput({ onSend, disabled = false }: {
  onSend: (body: string, isNote: boolean) => Promise<void>
  disabled?: boolean
}) {
  const [body, setBody] = useState('')
  const [isNote, setIsNote] = useState(false)
  const [sending, setSending] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const text = body.trim()
    if (!text || sending || disabled) return
    setSending(true)
    try {
      await onSend(text, isNote)
      setBody('')
      if (ref.current) ref.current.style.height = 'auto'
    } finally {
      setSending(false)
    }
  }, [body, isNote, onSend, sending, disabled])

  return (
    <div className={`border-t flex-shrink-0 ${isNote ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/5 bg-[#0f1923]'}`}>
      {/* Mode toggle */}
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <button onClick={() => setIsNote(false)}
          className={`text-xs px-3 py-1 rounded-full transition-all ${!isNote ? 'bg-green-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          הודעה
        </button>
        <button onClick={() => setIsNote(true)}
          className={`text-xs px-3 py-1 rounded-full transition-all flex items-center gap-1 ${isNote ? 'bg-yellow-500 text-black font-medium' : 'text-gray-500 hover:text-gray-300'}`}>
          <StickyNote className="w-3 h-3" />
          הערה פנימית
        </button>
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3">
        <button disabled={disabled} className="p-2 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={ref}
          value={body}
          onChange={e => {
            setBody(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
          placeholder={isNote ? 'כתוב הערה פנימית...' : 'כתוב הודעה...'}
          dir="auto"
          rows={1}
          disabled={disabled}
          className={`flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-all max-h-[120px] text-white placeholder:text-gray-600 ${
            isNote
              ? 'bg-yellow-500/10 border border-yellow-500/20 focus:border-yellow-400'
              : 'bg-white/5 border border-white/10 focus:border-green-500/50'
          }`}
        />

        <button
          onClick={() => void handleSend()}
          disabled={!body.trim() || sending || disabled}
          className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
            body.trim() && !sending && !disabled
              ? 'gradient-green text-white shadow-lg shadow-green-500/20 hover:opacity-90'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  )
}
