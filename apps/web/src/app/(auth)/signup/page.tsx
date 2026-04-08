'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../../store/auth'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuthStore()
  const [form, setForm] = useState({ name: '', workspace_name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('סיסמא חייבת להיות לפחות 8 תווים'); return }
    setLoading(true)
    try {
      await signup(form)
      router.push('/inbox')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'שגיאה בהרשמה')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }} dir="rtl">
      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Zap style={{ width: '26px', height: '26px', color: 'white' }} />
          </div>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>צור חשבון חינמי</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>מתחיל ב-30 שניות, ללא כרטיס אשראי</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>שם מלא</label>
                <input value={form.name} onChange={set('name')} required placeholder="ישראל ישראלי" dir="rtl"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#25d366')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>שם העסק</label>
                <input value={form.workspace_name} onChange={set('workspace_name')} required placeholder="העסק שלי" dir="rtl"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#25d366')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>אימייל</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="your@email.com" dir="ltr"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#25d366')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>

            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>סיסמא</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} required placeholder="מינימום 8 תווים" dir="ltr"
                  style={{ ...inputStyle, paddingLeft: '40px' }}
                  onFocus={e => (e.target.style.borderColor = '#25d366')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: 'white', fontWeight: '600', fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '6px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'יוצר חשבון...' : 'צור חשבון חינמי →'}
            </button>

            <p style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center', margin: 0 }}>
              בלחיצה על הכפתור אתה מסכים לתנאי השימוש ומדיניות הפרטיות
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
          כבר יש לך חשבון?{' '}
          <Link href="/login" style={{ color: '#25d366', textDecoration: 'none', fontWeight: '500' }}>כניסה</Link>
        </p>
      </div>
    </div>
  )
}
