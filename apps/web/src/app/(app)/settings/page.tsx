'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Smartphone, Key, Users, Shield, Check, ExternalLink, Bot } from 'lucide-react'
import { useAuthStore } from '../../../store/auth'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

const SECTIONS = [
  { id: 'whatsapp', icon: Smartphone, label: 'חיבור WhatsApp' },
  { id: 'ai',       icon: Bot,        label: 'הגדרות AI' },
  { id: 'account',  icon: Key,        label: 'חשבון' },
  { id: 'team',     icon: Users,      label: 'צוות' },
  { id: 'billing',  icon: Shield,     label: 'תכנית ותשלום' },
]

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const TIMES = Array.from({ length: 29 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

type DaySchedule = { open: boolean; from: string; to: string }

function HoursPicker({ value, onChange }: {
  value: DaySchedule[]
  onChange: (v: DaySchedule[]) => void
}) {
  return (
    <div className="space-y-2">
      {DAYS.map((day, i) => {
        const d = value[i]!
        return (
          <div key={day} className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-all ${d.open ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-gray-800/50'}`}>
            <button onClick={() => {
              const next = [...value]
              next[i] = { ...d, open: !d.open }
              onChange(next)
            }} className={`w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${d.open ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
              {day.slice(0, 1)}
            </button>
            <span className="text-xs text-gray-400 w-10 flex-shrink-0">{day}</span>
            {d.open ? (
              <div className="flex items-center gap-2 flex-1">
                <select value={d.from} onChange={e => { const next = [...value]; next[i] = { ...d, from: e.target.value }; onChange(next) }}
                  className="bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-green-500">
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-gray-600 text-xs">—</span>
                <select value={d.to} onChange={e => { const next = [...value]; next[i] = { ...d, to: e.target.value }; onChange(next) }}
                  className="bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-green-500">
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <span className="text-xs text-gray-600 flex-1">סגור</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function scheduleToText(schedule: DaySchedule[]): string {
  const open = schedule
    .map((d, i) => d.open ? `${DAYS[i]} ${d.from}-${d.to}` : null)
    .filter(Boolean)
  return open.join(', ')
}

const GOAL_OPTIONS = [
  { value: 'appointments', label: 'תאום פגישות / הדגמות' },
  { value: 'sales',        label: 'מכירות ישירות' },
  { value: 'support',      label: 'שירות לקוחות' },
  { value: 'leads',        label: 'איסוף לידים' },
  { value: 'other',        label: 'אחר' },
]

function buildSystemPrompt(fields: {
  businessName: string
  description: string
  prices: string
  hours: string  // pre-formatted string
  address: string
  goal: string
  contactPhone: string
  extraInfo: string
}) {
  const goalMap: Record<string, string> = {
    appointments: 'לתאם פגישה או הדגמה אצלנו',
    sales: 'לסגור עסקה ולמכור ללקוח',
    support: 'לתת שירות ולפתור בעיות',
    leads: 'לאסוף פרטים ולזהות לידים רלוונטיים',
    other: 'לעזור ללקוח',
  }

  const lines = [
    `אתה נציג של ${fields.businessName}. ענה תמיד בעברית בסגנון WhatsApp — קצר, חם, אנושי.`,
    `התנהל בטבעיות: אם הלקוח אומר שלום — ענה שלום. הבן מה הלקוח צריך, ורק אז הצג פתרון רלוונטי. אל תחזור על אותו משפט פעמיים.`,
    ``,
    `פרטי העסק:`,
  ]
  if (fields.description) lines.push(`- ${fields.description}`)
  if (fields.prices)      lines.push(`- מחירים: ${fields.prices}`)
  if (fields.hours)       lines.push(`- שעות פתיחה: ${fields.hours}`)
  if (fields.address)     lines.push(`- כתובת: ${fields.address}`)
  if (fields.contactPhone) lines.push(`- לתיאום / שירות בשטח: ${fields.contactPhone}`)
  if (fields.extraInfo)   lines.push(`- ${fields.extraInfo}`)
  if (fields.goal)        lines.push(``, `המטרה שלך: ${goalMap[fields.goal] ?? fields.goal}`)

  return lines.join('\n')
}

export default function SettingsPage() {
  const { user, workspace } = useAuthStore()
  const [section, setSection] = useState('whatsapp')
  const [provider, setProvider] = useState<'waapi' | 'meta'>('waapi')
  const [waapiConfig, setWaapiConfig] = useState({ instance_id: '', token: '' })
  const [metaConfig, setMetaConfig] = useState({ phone_number_id: '', access_token: '', verify_token: '' })
  const [saved, setSaved] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiFields, setAiFields] = useState({
    businessName: workspace?.name ?? '',
    description: '',
    prices: '',
    address: '',
    goal: 'appointments',
    contactPhone: '',
    extraInfo: '',
  })
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((_, i) => ({ open: i < 5, from: '08:00', to: '17:00' }))
  )

  useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<{
        workspace: {
          ai_enabled: boolean
          ai_system_prompt: string | null
          ai_setup_fields: Record<string, unknown> | null
          whatsapp_provider: 'waapi' | 'meta'
          whatsapp_config: Record<string, string> | null
        }
        brand_guide: { content: string } | null
      }>('/api/settings')

      const ws = res.data.workspace
      setAiEnabled(ws.ai_enabled)

      // Pre-populate WhatsApp config
      if (ws.whatsapp_provider) setProvider(ws.whatsapp_provider)
      if (ws.whatsapp_config) {
        if (ws.whatsapp_provider === 'waapi') {
          setWaapiConfig({
            instance_id: (ws.whatsapp_config['waapi_instance_id'] as string) ?? '',
            token: (ws.whatsapp_config['waapi_token'] as string) ?? '',
          })
        }
      }

      // Pre-populate AI wizard fields
      const f = ws.ai_setup_fields ?? {}
      if (Object.keys(f).length > 0) {
        setAiFields(prev => ({ ...prev, ...(f as typeof prev) }))
        if (f['schedule']) setSchedule(f['schedule'] as DaySchedule[])
      }

      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const config = provider === 'waapi'
        ? { waapi_instance_id: waapiConfig.instance_id, waapi_token: waapiConfig.token }
        : { meta_phone_number_id: metaConfig.phone_number_id, meta_access_token: metaConfig.access_token, meta_verify_token: metaConfig.verify_token }
      await api.post('/api/settings/whatsapp', { provider, config })
    },
    onSuccess: () => { toast.success('ההגדרות נשמרו!'); setSaved(true); setTimeout(() => setSaved(false), 3000) },
    onError: () => toast.error('שגיאה בשמירת ההגדרות'),
  })

  const saveAiMutation = useMutation({
    mutationFn: async () => {
      const hours = scheduleToText(schedule)
      const prompt = buildSystemPrompt({ ...aiFields, hours, businessName: aiFields.businessName || workspace?.name || '' })
      await api.post('/api/settings/ai', {
        ai_enabled: aiEnabled,
        ai_system_prompt: prompt,
        ai_setup_fields: { ...aiFields, schedule },
      })
    },
    onSuccess: () => { toast.success('הגדרות AI נשמרו!'); setAiSaved(true); setTimeout(() => setAiSaved(false), 3000) },
    onError: () => toast.error('שגיאה בשמירת הגדרות AI'),
  })

  return (
    <div className="h-full flex bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-gray-900 border-l border-white/5 py-4">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-right ${
              section === s.id ? 'bg-white/10 text-white font-medium' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}>
            <s.icon className="w-4 h-4 flex-shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {section === 'whatsapp' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">חיבור WhatsApp</h2>
              <p className="text-gray-500 text-sm">בחר ספק ועדכן את הפרטים</p>
            </div>

            {/* Provider toggle */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: 'waapi' as const, label: 'WaAPI', sub: 'מהיר לפיתוח', tag: 'לא רשמי' },
                { v: 'meta'  as const, label: 'Meta Cloud API', sub: 'לפרודקשן', tag: 'רשמי' },
              ].map(p => (
                <button key={p.v} onClick={() => setProvider(p.v)}
                  className={`text-right p-4 rounded-xl border-2 transition-all ${
                    provider === p.v ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-gray-900 hover:border-white/20'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.v === 'meta' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{p.tag}</span>
                    {provider === p.v && <Check className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="font-semibold text-white text-sm">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.sub}</div>
                </button>
              ))}
            </div>

            {/* WaAPI config */}
            {provider === 'waapi' && (
              <div className="space-y-4 bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">הגדרות WaAPI</h3>
                  <a href="https://waapi.app" target="_blank" rel="noreferrer"
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                    הרשם ל-WaAPI <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {[
                  { key: 'instance_id', label: 'Instance ID', placeholder: '1234' },
                  { key: 'token',       label: 'API Token',   placeholder: 'waapi_xxxxx' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                    <input value={waapiConfig[f.key as keyof typeof waapiConfig]}
                      onChange={e => setWaapiConfig(p => ({ ...p, [f.key]: e.target.value }))}
                      dir="ltr" placeholder={f.placeholder}
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-green-500 transition-colors placeholder:text-gray-700" />
                  </div>
                ))}
              </div>
            )}

            {/* Meta config */}
            {provider === 'meta' && (
              <div className="space-y-4 bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">הגדרות Meta Cloud API</h3>
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    דוקומנטציה <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {[
                  { key: 'phone_number_id', label: 'Phone Number ID',  placeholder: '1234567890' },
                  { key: 'access_token',    label: 'Access Token',     placeholder: 'EAAxxxxxxx' },
                  { key: 'verify_token',    label: 'Webhook Verify Token', placeholder: 'my_verify_token' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                    <input value={metaConfig[f.key as keyof typeof metaConfig]}
                      onChange={e => setMetaConfig(p => ({ ...p, [f.key]: e.target.value }))}
                      dir="ltr" placeholder={f.placeholder}
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-green-500 transition-colors placeholder:text-gray-700" />
                  </div>
                ))}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-400">Webhook URL לכתובת Meta:</p>
                  <code className="text-xs text-blue-300 font-mono">
                    https://your-api.com/webhooks/{workspace?.id ?? 'WORKSPACE_ID'}
                  </code>
                </div>
              </div>
            )}

            <button onClick={() => void saveMutation.mutateAsync()}
              disabled={saveMutation.isPending}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors">
              {saveMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : saved ? <><Check className="w-4 h-4" /> נשמר!</> : 'שמור הגדרות'
              }
            </button>
          </div>
        )}

        {section === 'ai' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">הגדרות AI</h2>
              <p className="text-gray-500 text-sm">ענה על השאלות הבאות ואנחנו נבנה לך את הבוט אוטומטית</p>
            </div>

            {/* AI toggle */}
            <div className="flex items-center justify-between bg-gray-900 border border-white/10 rounded-2xl p-5">
              <div>
                <div className="text-white font-medium text-sm">הפעל בוט AI</div>
                <div className="text-gray-500 text-xs mt-0.5">הבוט יענה אוטומטית לפניות נכנסות</div>
              </div>
              <button onClick={() => setAiEnabled(e => !e)}
                className={`relative w-12 h-6 rounded-full transition-colors ${aiEnabled ? 'bg-green-500' : 'bg-gray-700'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiEnabled ? 'right-1' : 'right-7'}`} />
              </button>
            </div>

            {/* Fields */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white text-sm">פרטי העסק</h3>

              {[
                { key: 'businessName',  label: 'שם העסק',                 placeholder: 'שר טכנולוגיות' },
                { key: 'description',   label: 'מה אתם מוכרים / מציעים?', placeholder: 'מכונות טיח גבס ושחור' },
                { key: 'prices',        label: 'מחירים (אופציונלי)',        placeholder: 'החל מ-26,000 ₪' },
                { key: 'address',       label: 'כתובת (אופציונלי)',        placeholder: 'האורג 7, נתניה' },
                { key: 'contactPhone',  label: 'טלפון שירות / תיאום',     placeholder: '054-0000000' },
                { key: 'extraInfo',     label: 'מידע נוסף (אופציונלי)',    placeholder: 'מידע שחשוב לבוט לדעת...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                  <input
                    value={aiFields[f.key as keyof typeof aiFields]}
                    onChange={e => setAiFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    dir="rtl"
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
                  />
                </div>
              ))}

              {/* Hours picker */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">שעות פתיחה</label>
                <HoursPicker value={schedule} onChange={setSchedule} />
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">מה המטרה של הבוט?</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map(g => (
                    <button key={g.value} onClick={() => setAiFields(p => ({ ...p, goal: g.value }))}
                      className={`text-right px-3 py-2 rounded-xl text-xs border transition-all ${
                        aiFields.goal === g.value
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                      }`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => void saveAiMutation.mutateAsync()}
              disabled={saveAiMutation.isPending}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors">
              {saveAiMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : aiSaved ? <><Check className="w-4 h-4" /> נשמר!</> : 'שמור הגדרות AI'
              }
            </button>
          </div>
        )}

        {section === 'account' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl font-bold text-white">פרטי החשבון</h2>
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
              {[
                { label: 'שם',       value: user?.name },
                { label: 'אימייל',   value: user?.email },
                { label: 'תפקיד',   value: user?.role },
                { label: 'Workspace',value: workspace?.name },
                { label: 'תכנית',   value: workspace?.plan },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-gray-500 text-sm">{f.label}</span>
                  <span className="text-white text-sm font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'billing' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl font-bold text-white">תכנית ותשלום</h2>
            <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg capitalize">{workspace?.plan ?? 'Free'}</h3>
                  <p className="text-gray-500 text-sm">תכנית נוכחית</p>
                </div>
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">פעיל</span>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">מגבלת הודעות</span>
                  <span className="text-white">100 / חודש</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Starter', price: '$29', features: '2,000 הודעות' },
                { name: 'Pro',     price: '$79', features: '10,000 הודעות' },
                { name: 'Business',price: '$199',features: '50,000 הודעות' },
              ].map(p => (
                <div key={p.name} className="bg-gray-900 border border-white/10 rounded-xl p-4 text-center hover:border-green-500/30 transition-colors">
                  <div className="font-bold text-white mb-1">{p.name}</div>
                  <div className="text-2xl font-black text-green-400 mb-1">{p.price}</div>
                  <div className="text-xs text-gray-500 mb-3">{p.features}</div>
                  <button className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-1.5 rounded-lg transition-colors">
                    שדרג
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'team' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl font-bold text-white">חברי הצוות</h2>
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{user?.name}</div>
                  <div className="text-gray-500 text-xs">{user?.email} · Owner</div>
                </div>
              </div>
              <button className="w-full border border-dashed border-white/10 rounded-xl py-3 text-gray-500 hover:text-gray-300 hover:border-white/20 text-sm transition-colors">
                + הזמן חבר צוות
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">זמין בתכניות Starter ומעלה</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
