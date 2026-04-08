'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, ToggleLeft, ToggleRight, BookOpen, Target, Brain, Sparkles, Save, ChevronDown, ChevronUp, User, Copy, Check } from 'lucide-react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

const TONES = [
  { value: 'professional', label: 'מקצועי', desc: 'רשמי ועסקי' },
  { value: 'friendly',     label: 'ידידותי', desc: 'חם וגישתי' },
  { value: 'sales',        label: 'מכירתי', desc: 'ממוקד המרה' },
  { value: 'supportive',   label: 'תומך', desc: 'סבלני ומסייע' },
]

const GOALS = [
  { value: 'book_meeting',  label: 'קביעת פגישה' },
  { value: 'close_sale',    label: 'סגירת עסקה' },
  { value: 'collect_info',  label: 'איסוף פרטים' },
  { value: 'support',       label: 'תמיכת לקוחות' },
  { value: 'qualify_lead',  label: 'סינון ליד' },
]

type Memory = { id: string; contact_phone: string; summary: string; updated_at: string }

export default function AIPage() {
  const qc = useQueryClient()
  const [botEnabled, setBotEnabled]       = useState(false)
  const [tone, setTone]                   = useState('friendly')
  const [goal, setGoal]                   = useState('qualify_lead')
  const [brandGuide, setBrandGuide]       = useState('')
  const [systemPrompt, setSystemPrompt]   = useState('')
  const [memoryOpen, setMemoryOpen]       = useState(false)
  const [copied, setCopied]               = useState(false)

  // Load existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<{ workspace: any; brand_guide: any }>('/api/settings')
      return res.data
    },
  })

  // Load webhook URL
  const { data: webhookData } = useQuery({
    queryKey: ['webhook-url'],
    queryFn: async () => {
      const res = await api.get<{ webhook_url: string }>('/api/settings/webhook-url')
      return res.data
    },
  })

  useEffect(() => {
    if (!settings) return
    setBotEnabled(settings.workspace?.ai_enabled ?? false)
    setSystemPrompt(settings.workspace?.ai_system_prompt ?? 'אתה עוזר ודאי של העסק שלנו. ענה תמיד בעברית, היה קצר וממוקד, ונסה להביא את הלקוח לפעולה.')
    setBrandGuide(settings.brand_guide?.content ?? '')
    setGoal(settings.brand_guide?.conversion_goal ?? 'qualify_lead')
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/settings/ai', {
        ai_enabled: botEnabled,
        ai_system_prompt: systemPrompt,
        brand_guide_content: brandGuide,
        conversion_goal: goal,
      })
    },
    onSuccess: () => {
      toast.success('הגדרות הבוט נשמרו!')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('שגיאה בשמירה'),
  })

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ['ai-memories'],
    queryFn: async () => {
      const res = await api.get<{ memories: Memory[] }>('/api/ai/memory')
      return res.data.memories
    },
    enabled: memoryOpen,
  })

  function copyWebhook() {
    if (webhookData?.webhook_url) {
      navigator.clipboard.writeText(webhookData.webhook_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">בוט AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">הגדר את ההתנהגות של הבוט האוטומטי שלך</p>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
          {saveMutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          שמור
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-2xl">

        {/* Master toggle */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${botEnabled ? 'bg-green-500/20' : 'bg-gray-800'}`}>
              <Bot className={`w-5 h-5 ${botEnabled ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">בוט AI אוטומטי</div>
              <div className="text-gray-500 text-xs">{botEnabled ? 'מגיב להודעות נכנסות אוטומטית' : 'כבוי — כל ההודעות מגיעות לידינו'}</div>
            </div>
          </div>
          <button onClick={() => setBotEnabled(v => !v)} className="transition-colors">
            {botEnabled
              ? <ToggleRight className="w-10 h-10 text-green-400" />
              : <ToggleLeft  className="w-10 h-10 text-gray-600" />}
          </button>
        </div>

        {/* Webhook URL */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-white font-semibold text-sm">כתובת Webhook</h2>
            <span className="text-xs text-gray-500">— הדבק את זה בלוח הבקרה של WaAPI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-300 font-mono truncate">
              {webhookData?.webhook_url ?? 'טוען...'}
            </div>
            <button onClick={copyWebhook}
              className="flex-shrink-0 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'הועתק!' : 'העתק'}
            </button>
          </div>
          <p className="text-xs text-gray-600">לאחר הדבקה ב-WaAPI, כל הודעה נכנסת תגיע ישר לבוט שלך</p>
        </div>

        {/* Tone */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-white font-semibold text-sm">סגנון תקשורת</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button key={t.value} onClick={() => setTone(t.value)}
                className={`text-right p-3 rounded-xl border-2 transition-all ${
                  tone === t.value ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 bg-gray-800 hover:border-white/20'
                }`}>
                <div className="font-medium text-white text-sm">{t.label}</div>
                <div className="text-xs text-gray-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <h2 className="text-white font-semibold text-sm">מטרת הבוט</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setGoal(g.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  goal === g.value
                    ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                    : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand guide */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <div>
              <h2 className="text-white font-semibold text-sm">מדריך המותג / בסיס ידע</h2>
              <p className="text-gray-500 text-xs">מה הבוט צריך לדעת על העסק שלך?</p>
            </div>
          </div>
          <textarea
            value={brandGuide}
            onChange={e => setBrandGuide(e.target.value)}
            placeholder={`שם העסק: ...\nמה אנחנו מוכרים: ...\nשעות פעילות: ...\nמחירים: ...\nשאלות נפוצות: ...`}
            rows={7}
            dir="rtl"
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700 resize-none font-mono"
          />
          <p className="text-xs text-gray-600">{brandGuide.length} תווים · GPT-4o יקרא זאת לפני כל תגובה</p>
        </div>

        {/* System prompt */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-green-400" />
            <div>
              <h2 className="text-white font-semibold text-sm">הנחיית מערכת (System Prompt)</h2>
              <p className="text-gray-500 text-xs">הוראות מתקדמות לבוט</p>
            </div>
          </div>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={4}
            dir="rtl"
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green-500 transition-colors resize-none font-mono"
          />
        </div>

        {/* Lead extraction */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-semibold text-sm">חילוץ לידים אוטומטי</h2>
          </div>
          <p className="text-gray-500 text-xs">הבוט מזהה אוטומטית שם, חברה, תחום עניין ורמת עניין מתוך השיחה ושומר אותם בלשונית הלידים.</p>
          <div className="flex flex-wrap gap-2">
            {['שם', 'חברה', 'תפקיד', 'תחום עניין', 'רמת עניין', 'מוצר מבוקש'].map(tag => (
              <span key={tag} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-xs text-green-400">פעיל — לידים נשמרים אוטומטית בכל שיחה</p>
          </div>
        </div>

        {/* AI Memory viewer */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
          <button onClick={() => setMemoryOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-white font-semibold text-sm">זיכרון AI לפי שיחה</span>
            </div>
            {memoryOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {memoryOpen && (
            <div className="border-t border-white/5 divide-y divide-white/5">
              {memories.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Brain className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">אין זיכרונות עדיין — הבוט יצבור ידע לאחר שיחות</p>
                </div>
              ) : memories.map(m => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-400 text-xs font-mono">{m.contact_phone}</span>
                    <span className="text-gray-600 text-xs">{new Date(m.updated_at).toLocaleDateString('he-IL')}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{m.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
