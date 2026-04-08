'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Upload, Search, Plus, Tag, Phone,
  Mail, MoreVertical, Download, Filter, Check, FileSpreadsheet
} from 'lucide-react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

type Contact = {
  id: string
  phone: string
  name?: string
  email?: string
  tags: string[]
  opted_out: boolean
  created_at: string
}

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
  'bg-yellow-500/20 text-yellow-400',
]

function tagColor(tag: string) {
  const i = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % TAG_COLORS.length
  return TAG_COLORS[i]!
}

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [importText, setImportText] = useState('')
  const [defaultTags, setDefaultTags] = useState('')
  const [newContact, setNewContact] = useState({ phone: '', name: '', email: '', tags: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      const res = await api.get<{ contacts: Contact[] }>('/api/contacts', {
        params: { search: search || undefined, limit: 100 }
      })
      return res.data.contacts
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean)
      const contacts = lines.map(line => {
        const parts = line.split(',')
        return { phone: parts[0]?.trim() ?? '', name: parts[1]?.trim() }
      }).filter(c => c.phone)
      const tags = defaultTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await api.post<{ imported: number; duplicates: number; failed: number }>(
        '/api/contacts/import',
        { contacts, default_tags: tags, default_country: 'IL' }
      )
      return res.data
    },
    onSuccess: (d) => {
      toast.success(`✅ יובאו ${d.imported} אנשי קשר (${d.duplicates} כפולים, ${d.failed} שגיאות)`)
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setShowImport(false)
      setImportText('')
    },
    onError: () => toast.error('שגיאה בייבוא'),
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const tags = newContact.tags.split(',').map(t => t.trim()).filter(Boolean)
      await api.post('/api/contacts', { ...newContact, tags })
    },
    onSuccess: () => {
      toast.success('איש קשר נוסף!')
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setShowAdd(false)
      setNewContact({ phone: '', name: '', email: '', tags: '' })
    },
    onError: () => toast.error('שגיאה בהוספת איש קשר'),
  })

  const uploadFile = async (file: File) => {
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post<{ imported: number; failed: number; total: number }>(
        '/api/contacts/import/csv',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success(`✅ יובאו ${res.data.imported} אנשי קשר${res.data.failed > 0 ? ` (${res.data.failed} שגיאות)` : ''}`)
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setShowImport(false)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'שגיאה בייבוא הקובץ'
      toast.error(msg)
    }
  }

  const contacts = data ?? []

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">אנשי קשר</h1>
          <p className="text-xs text-gray-500 mt-0.5">{contacts.length} אנשי קשר</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 px-3 py-2 rounded-xl text-sm transition-colors">
            <Upload className="w-4 h-4" />
            ייבוא
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            הוסף
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..." dir="rtl"
            className="w-full bg-gray-900 border border-white/10 rounded-xl py-2.5 pr-9 pl-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-green-500/50 transition-colors" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">אין אנשי קשר עדיין</h2>
            <p className="text-gray-500 text-sm mb-6">ייבא רשימה או הוסף ידנית</p>
            <div className="flex gap-3">
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-2 bg-gray-800 border border-white/10 text-gray-300 px-4 py-2 rounded-xl text-sm transition-oles hover:bg-gray-700">
                <FileSpreadsheet className="w-4 h-4" />
                ייבוא Excel / CSV
              </button>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" />
                הוסף ידנית
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur">
              <tr className="border-b border-white/5">
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">שם</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">טלפון</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">תגיות</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">סטטוס</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">נוסף</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.name ?? c.phone)[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium">{c.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                      ))}
                      {c.tags.length > 3 && <span className="text-xs text-gray-600">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.opted_out
                      ? <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Opt-out</span>
                      : <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">פעיל</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(c.created_at).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowImport(false) }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">ייבוא אנשי קשר</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* File Upload */}
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-green-500/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FileSpreadsheet className="w-8 h-8 text-green-500/70" />
                  <Upload className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm font-medium">גרור קובץ Excel או CSV לכאן</p>
                <p className="text-gray-600 text-xs mt-1">תומך ב: .xlsx · .xls · .csv</p>
                <p className="text-gray-700 text-xs mt-0.5">עמודות: phone / טלפון, name / שם (אופציונלי)</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f) }} />
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-white/10" />
                <span className="px-3 text-gray-600 text-xs">או הדבק מספרים</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">מספרי טלפון (שורה לכל מספר, אפשר להוסיף שם: 0501234567, ישראל)</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)}
                  rows={6} dir="ltr"
                  placeholder={"0501234567\n0521234567, יעל כהן\n0531234567, דוד לוי"}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-green-500 resize-none placeholder:text-gray-700" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">תגיות ברירת מחדל (מופרדות בפסיק)</label>
                <input value={defaultTags} onChange={e => setDefaultTags(e.target.value)}
                  dir="rtl" placeholder="לידים, לקוחות חמים"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>

              <button onClick={() => void importMutation.mutateAsync()}
                disabled={importMutation.isPending || !importText.trim()}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                {importMutation.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Upload className="w-4 h-4" /> ייבא אנשי קשר</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">הוספת איש קשר</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'phone', label: 'טלפון *', placeholder: '0501234567', dir: 'ltr' as const },
                { key: 'name',  label: 'שם',      placeholder: 'ישראל ישראלי', dir: 'rtl' as const },
                { key: 'email', label: 'אימייל',   placeholder: 'email@example.com', dir: 'ltr' as const },
                { key: 'tags',  label: 'תגיות (מופרדות בפסיק)', placeholder: 'לידים, לקוחות', dir: 'rtl' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                  <input
                    value={newContact[f.key as keyof typeof newContact]}
                    onChange={e => setNewContact(p => ({ ...p, [f.key]: e.target.value }))}
                    dir={f.dir} placeholder={f.placeholder}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors placeholder:text-gray-600" />
                </div>
              ))}
              <button onClick={() => void addMutation.mutateAsync()}
                disabled={addMutation.isPending || !newContact.phone.trim()}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                {addMutation.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" /> הוסף איש קשר</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
