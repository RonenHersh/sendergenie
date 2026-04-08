'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { useAuthStore } from '../../../store/auth'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', workspace_name: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('סיסמה חייבת להכיל לפחות 8 תווים'); return }
    setLoading(true)
    try {
      await signup(form)
      toast.success('ברוך הבא! 🎉')
      router.push('/inbox')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'ההרשמה נכשלה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex" dir="rtl">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-green flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">SenderGenie</span>
        </Link>

        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white">
            מתחיל עכשיו,<br />
            <span className="text-gradient">100 הודעות מתנה</span>
          </h2>
          <div className="space-y-3">
            {[
              'ללא כרטיס אשראי',
              'setup תוך 3 דקות',
              'ביטול בכל עת',
              'תמיכה בעברית',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-sm">500+ עסקים ישראלים כבר משתמשים</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl gradient-green flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">SenderGenie</span>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-1">יצירת חשבון חינמי</h2>
            <p className="text-gray-400 text-sm mb-8">מתחיל ב-30 שניות, ללא כרטיס אשראי</p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">שם מלא</label>
                  <input
                    type="text" required dir="rtl"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-all placeholder:text-gray-600"
                    placeholder="ישראל ישראלי"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">שם העסק</label>
                  <input
                    type="text" required dir="rtl"
                    value={form.workspace_name}
                    onChange={e => update('workspace_name', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-all placeholder:text-gray-600"
                    placeholder="העסק שלי"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">אימייל</label>
                <input
                  type="email" required dir="ltr"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-all placeholder:text-gray-600"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">סיסמה</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required dir="ltr"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-all placeholder:text-gray-600 pl-10"
                    placeholder="מינימום 8 תווים"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full gradient-green text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    יוצר חשבון...
                  </span>
                ) : (
                  <>צור חשבון חינמי <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-gray-600 mt-2">
                בלחיצה על הכפתור אתה מסכים לתנאי השימוש ומדיניות הפרטיות
              </p>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">כניסה</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
