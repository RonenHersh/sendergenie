'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Users, MessageSquare, CheckCheck, Eye, Reply } from 'lucide-react'
import { api } from '../../../lib/api'

type Campaign = {
  id: string
  name: string
  status: string
  total_recipients: number
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  created_at: string
}

function Stat({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: any
}) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-500 text-right shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-xs text-gray-400 text-right shrink-0">{value.toLocaleString()}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get<{ campaigns: Campaign[] }>('/api/campaigns')
      return res.data.campaigns
    },
  })

  const totals = campaigns.reduce((acc, c) => ({
    sent:      acc.sent      + c.sent,
    delivered: acc.delivered + c.delivered,
    read:      acc.read      + c.read,
    replied:   acc.replied   + c.replied,
    failed:    acc.failed    + c.failed,
  }), { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 })

  const readRate    = totals.sent > 0 ? Math.round((totals.read    / totals.sent) * 100) : 0
  const replyRate   = totals.sent > 0 ? Math.round((totals.replied / totals.sent) * 100) : 0
  const deliverRate = totals.sent > 0 ? Math.round((totals.delivered / totals.sent) * 100) : 0

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">אנליטיקס</h1>
          <p className="text-xs text-gray-500 mt-0.5">סיכום כל הקמפיינים</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={MessageSquare} label="הודעות שנשלחו" value={totals.sent.toLocaleString()}       color="bg-blue-500"   />
              <Stat icon={CheckCheck}    label="שיעור מסירה"   value={`${deliverRate}%`}                  color="bg-green-500"  sub={`${totals.delivered.toLocaleString()} הודעות`} />
              <Stat icon={Eye}           label="שיעור קריאה"   value={`${readRate}%`}                     color="bg-purple-500" sub={`${totals.read.toLocaleString()} קראו`} />
              <Stat icon={Reply}         label="שיעור תגובה"   value={`${replyRate}%`}                    color="bg-orange-500" sub={`${totals.replied.toLocaleString()} ענו`} />
            </div>

            {/* Funnel */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-5">פאנל הודעות (סה"כ)</h2>
              <div className="space-y-3">
                <Bar label="נשלח"   value={totals.sent}      max={totals.sent} color="bg-blue-500"   />
                <Bar label="נמסר"   value={totals.delivered} max={totals.sent} color="bg-green-500"  />
                <Bar label="נקרא"   value={totals.read}      max={totals.sent} color="bg-purple-500" />
                <Bar label="ענה"    value={totals.replied}   max={totals.sent} color="bg-orange-500" />
              </div>
            </div>

            {/* Campaigns table */}
            {campaigns.length > 0 && (
              <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h2 className="text-white font-bold">ביצועים לפי קמפיין</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['קמפיין', 'נשלח', 'נמסר', 'נקרא', 'ענה', '% קריאה'].map(h => (
                          <th key={h} className="text-right text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => {
                        const r = c.sent > 0 ? Math.round((c.read / c.sent) * 100) : 0
                        return (
                          <tr key={c.id} className="border-b border-white/5 hover:bg-white/2">
                            <td className="px-4 py-3 text-sm text-white font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{c.sent.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{c.delivered.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-purple-400">{c.read.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-orange-400">{c.replied.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${r}%` }} />
                                </div>
                                <span className="text-xs text-gray-400">{r}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {campaigns.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <BarChart2 className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">אין נתונים עדיין — שלח קמפיין ראשון</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
