'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft, Clock, User, Phone, Check, X, CalendarDays } from 'lucide-react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

interface Appointment {
  id: string
  contact_name: string | null
  contact_phone: string | null
  scheduled_at: string
  agent_name: string | null
  notes: string | null
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין', confirmed: 'אושר', cancelled: 'בוטל',
}

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const HE_DAYS   = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

export default function AppointmentsPage() {
  const [today] = useState(new Date())
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await api.get<{ appointments: Appointment[] }>('/api/appointments')
      return res.data.appointments
    },
    refetchInterval: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/appointments/${id}`, { status })
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['appointments'] }) },
    onError: () => toast.error('שגיאה בעדכון הסטטוס'),
  })

  const appointments = data ?? []

  // Calendar helpers
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()   // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Map appointments to days
  const apptsByDay: Record<number, Appointment[]> = {}
  for (const a of appointments) {
    const d = new Date(a.scheduled_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      (apptsByDay[day] ??= []).push(a)
    }
  }

  // Selected day appointments
  const selectedAppts = selectedDay
    ? appointments.filter(a => {
        const d = new Date(a.scheduled_at)
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay
      })
    : []

  // Upcoming list (all, sorted)
  const upcoming = [...appointments]
    .filter(a => new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  return (
    <div className="h-full flex overflow-hidden bg-[#0d1117]">

      {/* ── Calendar + detail ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

        {/* Calendar card */}
        <div className="bg-[#0f1923] border border-white/5 rounded-2xl p-5 flex-shrink-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <h2 className="text-white font-bold text-lg">
              {HE_MONTHS[month]} {year}
            </h2>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {HE_DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayAppts = apptsByDay[day] ?? []
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = day === selectedDay
              const hasAppt = dayAppts.length > 0

              return (
                <button key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all text-sm font-medium
                    ${isSelected ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' :
                      isToday ? 'bg-white/10 text-white' :
                      'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                  {day}
                  {hasAppt && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayAppts.slice(0, 3).map((a, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${
                          a.status === 'confirmed' ? 'bg-green-400' :
                          a.status === 'cancelled' ? 'bg-red-400' : 'bg-yellow-400'
                        } ${isSelected ? 'bg-white/70' : ''}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-[#0f1923] border border-white/5 rounded-2xl p-4 flex-shrink-0">
            <h3 className="text-white font-semibold text-sm mb-3">
              {selectedDay} {HE_MONTHS[month]} — {selectedAppts.length === 0 ? 'אין פגישות' : `${selectedAppts.length} פגישות`}
            </h3>
            {selectedAppts.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">אין פגישות ביום זה</p>
            ) : (
              <div className="space-y-2">
                {selectedAppts.map(a => (
                  <AppointmentCard key={a.id} appt={a} onStatus={(id, s) => void statusMutation.mutateAsync({ id, status: s })} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Upcoming list ─────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-white/5 bg-[#090d14] flex flex-col">
        <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-green-400" />
            <h3 className="text-white font-semibold text-sm">פגישות קרובות</h3>
          </div>
          <p className="text-gray-600 text-xs mt-1">{upcoming.length} ממתינות</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {upcoming.length === 0 ? (
            <div className="text-center text-gray-600 text-sm py-8">אין פגישות קרובות</div>
          ) : (
            upcoming.map(a => (
              <AppointmentCard key={a.id} appt={a} compact
                onStatus={(id, s) => void statusMutation.mutateAsync({ id, status: s })} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function AppointmentCard({ appt, compact, onStatus }: {
  appt: Appointment
  compact?: boolean
  onStatus: (id: string, status: string) => void
}) {
  const d = new Date(appt.scheduled_at)
  const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })

  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-white text-xs font-semibold">{compact ? `${dateStr} ` : ''}{timeStr}</span>
          </div>
          {appt.contact_name && (
            <div className="flex items-center gap-1.5 mt-1">
              <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs truncate">{appt.contact_name}</span>
            </div>
          )}
          {appt.contact_phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-gray-500 text-xs">{appt.contact_phone}</span>
            </div>
          )}
          {appt.agent_name && (
            <span className="text-xs text-purple-400 mt-1 block">עם {appt.agent_name}</span>
          )}
          {appt.notes && <p className="text-gray-600 text-xs mt-1 truncate">{appt.notes}</p>}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLES[appt.status] ?? STATUS_STYLES['pending']}`}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </span>
      </div>

      {appt.status === 'pending' && (
        <div className="flex gap-1.5 mt-2">
          <button onClick={() => onStatus(appt.id, 'confirmed')}
            className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs py-1.5 rounded-lg transition-colors">
            <Check className="w-3 h-3" /> אשר
          </button>
          <button onClick={() => onStatus(appt.id, 'cancelled')}
            className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-1.5 rounded-lg transition-colors">
            <X className="w-3 h-3" /> בטל
          </button>
        </div>
      )}
    </div>
  )
}
