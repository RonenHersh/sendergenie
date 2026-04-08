'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Settings, Smartphone, Key, Bell, Users, Shield, ChevronLeft, Check, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../../store/auth'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

const SECTIONS = [
  { id: 'whatsapp', icon: Smartphone, label: 'חיבור WhatsApp' },
  { id: 'account',  icon: Key,        label: 'חשבון' },
  { id: 'team',     icon: Users,      label: 'צוות' },
  { id: 'billing',  icon: Shield,     label: 'תכנית ותשלום' },
]

export default function SettingsPage() {
  const { user, workspace } = useAuthStore()
  const [section, setSection] = useState('whatsapp')
  const [provider, setProvider] = useState<'waapi' | 'meta'>('waapi')
  const [waapiConfig, setWaapiConfig] = useState({ instance_id: '', token: '' })
  const [metaConfig, setMetaConfig] = useState({ phone_number_id: '', access_token: '', verify_token: '' })
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const config = provider === 'waapi'
        ? { waapi_instance_id: waapiConfig.instance_id, waapi_token: waapiConfig.token }
        : { meta_phone_number_id: metaConfig.phone_number_id, meta_access_token: metaConfig.access_token, meta_verify_token: metaConfig.verify_token }
      // TODO: wire to API endpoint
      await new Promise(r => setTimeout(r, 800))
    },
    onSuccess: () => { toast.success('ההגדרות נשמרו!'); setSaved(true); setTimeout(() => setSaved(false), 3000) },
    onError: () => toast.error('שגיאה בשמירת ההגדרות'),
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
