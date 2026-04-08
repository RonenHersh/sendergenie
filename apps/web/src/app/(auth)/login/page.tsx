'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../../store/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      router.push('/inbox')
    } catch {
      toast.error('אימייל או סיסמה שגויים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex" dir="rtl">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-green flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">SenderGenie</span>
        </Link>

        <div>
          <div className="space-y-4 mb-12">
            {[
              { emoji: '📤', text: 'שלח אלפי הודעות WhatsApp עם עיכוב חכם' },
              { emoji: '🤖', text: 'AI שעונה ומחלץ לידים אוטומטית' },
              { emoji: '📊', text: 'Delivered / Read / Replied בזמן אמת' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-gray-200 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm">מאובטח בהצפנה מלאה • GDPR מוכן</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl gradient-green flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">SenderGenie</span>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-1">ברוך הבא בחזרה 👋</h2>
            <p className="text-gray-400 text-sm mb-8">כנס לחשבון שלך וחזור לעבוד</p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green-500 focus:bg-white/8 transition-all placeholder:text-gray-600"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">סיסמה</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green-500 transition-all placeholder:text-gray-600 pl-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-green text-white font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    נכנס...
                  </span>
                ) : (
                  <>כניסה <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              אין לך חשבון?{' '}
              <Link href="/signup" className="text-green-400 hover:text-green-300 font-medium">
                הרשמה חינמית
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
