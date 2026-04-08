'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Megaphone, Play, Pause, BarChart2, Clock,
  Users, CheckCheck, MessageSquare, Sparkles, ChevronLeft,
  Send, AlertCircle, Settings2
} from 'lucide-react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

type Campaign = {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'done' | 'failed'
  total_recipients: number
  sent: number
  delivered: number
  read: number
  replied: number
  created_at: string
}

type AIGenerated = {
  campaign_name: string
  messages: Array<{ step: number; delay_after_prev_minutes: number; body: string }>
}

const STATUS_CONFIG = {
  draft:     { label: 'טיוטה',     color: 'bg-gray-500/20 text-gray-400',    dot: 'bg-gray-400'   },
  scheduled: { label: 'מתוזמן',    color: 'bg-blue-500/20 text-blue-400',    dot: 'bg-blue-400'   },
  running:   { label: 'פעיל',      color: 'bg-green-500/20 text-green-400',  dot: 'bg-green-400 animate-pulse' },
  paused:    { label: 'מושהה',     color: 'bg-yellow-500/20 text-yellow-400',dot: 'bg-yellow-400' },
  done:      { label: 'הושלם',     color: 'bg-purple-500/20 text-purple-400',dot: 'bg-purple-400' },
  failed:    { label: 'נכשל',      color: 'bg-red-500/20 text-red-400',      dot: 'bg-red-400'    },
}

const TONES = [
  { value: 'friendly',   label: '😊 ידידותי'  },
  { value: 'sales',      label: '💰 מכירות'   },
  { value: 'aggressive', label: '🔥 אגרסיבי'  },
  { value: 'follow_up',  label: '📞 מעקב'     },
]

function StatPill({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  const pct = value > 0 ? Math.round(value) : 0
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{pct.toLocaleString()}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  )
}

export default function CampaignsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState<'ai' | 'edit' | 'send'>('ai')
  const [idea, setIdea] = useState('')
  const [tone, setTone] = useState<string>('friendly')
  const [generated, setGenerated] = useState<AIGenerated | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [generating, setGenerating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get<{ campaigns: Campaign[] }>('/api/campaigns')
      return res.data.campaigns
    },
  })

  const launchMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/campaigns/${id}/launch`),
    onSuccess: () => { toast.success('הקמפיין הושק! 🚀'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('שגיאה בהשקת הקמפיין'),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/campaigns/${id}/pause`),
    onSuccess: () => { toast.success('הקמפיין הושהה'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!generated) return
      await api.post('/api/campaigns', {
        name: campaignName || generated.campaign_name,
        messages: generated.messages.map((m, i) => ({
          body: m.body,
          step_order: i,
          delay_after_prev_minutes: m.delay_after_prev_minutes,
        })),
        target_filter: {},
      })
    },
    onSuccess: () => {
      toast.success('הקמפיין נוצר!')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      setShowCreate(false)
      setStep('ai')
      setIdea('')
      setGenerated(null)
    },
    onError: () => toast.error('שגיאה ביצירת הקמפיין'),
  })

  const handleGenerate = async () => {
    if (!idea.trim()) { toast.error('כתוב רעיון לקמפיין'); return }
    setGenerating(true)
    try {
      const res = await api.post<{ generated: AIGenerated }>('/api/campaigns/ai-generate', {
        idea, tone, language: 'auto',
      })
      setGenerated(res.data.generated)
      setCampaignName(res.data.generated.campaign_name)
      setStep('edit')
    } catch {
      toast.error('שגיאה ביצירת הקמפיין עם AI')
    } finally {
      setGenerating(false)
    }
  }

  const campaigns = data ?? []

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">קמפיינים</h1>
          <p className="text-xs text-gray-500 mt-0.5">{campaigns.length} קמפיינים סה"כ</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setStep('ai') }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          קמפיין חדש
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">אין קמפיינים עדיין</h2>
            <p className="text-gray-500 text-sm mb-6">צור קמפיין ראשון עם AI תוך שניות</p>
            <button
              onClick={() => { setShowCreate(true); setStep('ai') }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              צור קמפיין עם AI
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const st = STATUS_CONFIG[c.status]
              const readPct = c.sent > 0 ? Math.round((c.read / c.sent) * 100) : 0
              return (
                <div key={c.id} className="bg-gray-900 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{c.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {new Date(c.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mr-4">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => launchMutation.mutate(c.id)}
                          disabled={launchMutation.isPending}
                          className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          הפעל
                        </button>
                      )}
                      {c.status === 'running' && (
                        <button
                          onClick={() => pauseMutation.mutate(c.id)}
                          className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          השהה
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <StatPill icon={Users}        value={c.total_recipients} label="נמענים"  color="text-gray-400" />
                    <StatPill icon={Send}          value={c.sent}            label="נשלח"    color="text-blue-400" />
                    <StatPill icon={CheckCheck}    value={c.delivered}       label="נמסר"    color="text-gray-400" />
                    <StatPill icon={CheckCheck}    value={c.read}            label="נקרא"    color="text-green-400" />
                    <StatPill icon={MessageSquare} value={c.replied}         label="ענה"     color="text-purple-400" />
                    {c.sent > 0 && (
                      <div className="flex items-center gap-2 mr-auto">
                        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${readPct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{readPct}% נקרא</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Campaign Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {['ai', 'edit', 'send'].map((s, i) => (
                    <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-green-500' : i < ['ai','edit','send'].indexOf(step) ? 'bg-green-500/40' : 'bg-gray-700'}`} />
                  ))}
                </div>
                <h2 className="text-white font-bold">
                  {step === 'ai' ? '✨ AI יוצר קמפיין' : step === 'edit' ? '✏️ עריכה ואישור' : '🚀 שמור והפעל'}
                </h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-6">
              {/* Step 1: AI Generate */}
              {step === 'ai' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">תאר את הקמפיין שלך</label>
                    <textarea
                      value={idea}
                      onChange={e => setIdea(e.target.value)}
                      rows={4}
                      dir="rtl"
                      placeholder="לדוגמה: אני רוצה לשלוח הצעה מיוחדת ללקוחות שלא קנו בחצי שנה האחרונה, עם הנחה של 20% על הזמנה הבאה..."
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green-500 transition-colors placeholder:text-gray-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">טון הדיבור</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TONES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-right ${
                            tone === t.value
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-white/10'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => void handleGenerate()}
                    disabled={generating || !idea.trim()}
                    className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AI יוצר קמפיין...
                      </>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> צור קמפיין עם AI</>
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Edit */}
              {step === 'edit' && generated && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">שם הקמפיין</label>
                    <input
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      dir="rtl"
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">הודעות הקמפיין</label>
                    <div className="space-y-3">
                      {generated.messages.map((msg, i) => (
                        <div key={i} className="bg-gray-800 rounded-xl p-4 border border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            {i > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                שליחה {msg.delay_after_prev_minutes >= 60
                                  ? `${Math.round(msg.delay_after_prev_minutes / 60)} שעות`
                                  : `${msg.delay_after_prev_minutes} דקות`} אחרי הקודמת
                              </span>
                            )}
                          </div>
                          <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 inline-block max-w-full">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap" dir="auto">{msg.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('ai')}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      ← חזור ושנה
                    </button>
                    <button
                      onClick={() => void createMutation.mutateAsync()}
                      disabled={createMutation.isPending}
                      className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {createMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Play className="w-4 h-4" /> שמור קמפיין</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
