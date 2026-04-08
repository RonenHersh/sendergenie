import Link from 'next/link'
import { Zap, MessageSquare, Bot, BarChart2, Shield, Users, Check, ArrowRight, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: Bot,          color: 'bg-purple-500', title: 'AI שמוכר בשבילך',     desc: 'בוט GPT-4o שעונה ללקוחות, מחלץ לידים ומזהה רגעי מכירה — 24/7.' },
  { icon: MessageSquare,color: 'bg-green-500',  title: 'Inbox כמו WhatsApp',  desc: 'ממשק זהה ל-WhatsApp Web. הצוות שלך מתחיל לעבוד תוך דקות.' },
  { icon: Users,        color: 'bg-blue-500',   title: 'קמפיינים חכמים',      desc: 'כתוב רעיון — ה-AI בונה קמפיין מלא עם רצף, תיזמון ופרסונליזציה.' },
  { icon: Shield,       color: 'bg-orange-500', title: 'אנטי-באן מובנה',      desc: 'Delays אקראיים, daily limits ובדיקת opt-out אוטומטית.' },
  { icon: BarChart2,    color: 'bg-yellow-500', title: 'אנליטיקס מלא',        desc: 'Delivered / Read / Replied בזמן אמת. דע מה עובד.' },
  { icon: Zap,          color: 'bg-pink-500',   title: 'Meta + WaAPI',        desc: 'תמיכה בספקים רשמיים ולא רשמיים. החלפה ללא שינוי קוד.' },
]

const PLANS = [
  { name: 'Free',     price: '$0',   desc: 'לנסות', highlight: false, features: ['100 הודעות / חודש', '500 אנשי קשר', '50 תשובות AI', 'משתמש אחד'] },
  { name: 'Pro',      price: '$79',  desc: 'לחודש', highlight: true,  features: ['10,000 הודעות / חודש', '25,000 אנשי קשר', 'AI ללא הגבלה', '5 משתמשים', 'אנליטיקס מלא'] },
  { name: 'Business', price: '$199', desc: 'לחודש', highlight: false, features: ['50,000 הודעות', 'אנשי קשר ללא הגבלה', 'AI ללא הגבלה', '15 משתמשים', 'White-label'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/90 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">SenderGenie</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">פיצ׳רים</a>
            <a href="#pricing"  className="hover:text-white transition-colors">מחירים</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"  className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">כניסה</Link>
            <Link href="/signup" className="text-sm bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors">התחל בחינם</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-sm text-green-400 mb-8">
            <Sparkles className="w-4 h-4" />
            מופעל על GPT-4o — עברית ואנגלית ברמה מושלמת
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            שלח WhatsApp
            <br />
            <span className="text-green-400">בהתאמה אישית</span>
            <br />
            לאלפי לקוחות
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            הפלטפורמה הראשונה שמרגישה בדיוק כמו WhatsApp.
            שלח קמפיינים, אוטומציה שיחות, ולכוד לידים.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
              className="bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/25">
              התחל בחינם — ללא כרטיס אשראי
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center transition-colors">
              צפה בדמו
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-600">500+ עסקים ישראליים כבר משתמשים ב-SenderGenie</p>
        </div>

        {/* APP PREVIEW */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Browser bar */}
            <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 bg-white/5 rounded px-3 py-1 text-xs text-gray-500 text-left">
                app.sendergenie.com/inbox
              </div>
            </div>

            {/* App mockup */}
            <div className="flex h-96 text-left">
              {/* Mini sidebar */}
              <div className="w-12 bg-gray-950 flex flex-col items-center py-3 gap-2 border-r border-white/5">
                <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                {[MessageSquare, Users, BarChart2, Bot].map((Icon, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-green-500' : 'text-gray-600'}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                ))}
              </div>

              {/* Chat list */}
              <div className="w-56 bg-gray-900/50 border-r border-white/5 text-right">
                <div className="p-3 border-b border-white/5">
                  <div className="text-xs font-semibold text-white mb-2">הודעות</div>
                  <div className="bg-white/5 rounded-lg px-2 py-1 text-xs text-gray-600">🔍 חיפוש</div>
                </div>
                {[
                  { n: 'יעל כהן',   m: 'כן, אני מעוניינת!', t: '10:32', u: 2, c: 'bg-pink-500'   },
                  { n: 'דוד לוי',   m: 'מה המחיר?',         t: '10:18', u: 0, c: 'bg-blue-500'   },
                  { n: 'אמיר ג׳ו', m: 'AI: שלום! אשמח...', t: 'אתמול', u: 1, c: 'bg-purple-500' },
                  { n: 'רות מזרחי', m: 'תודה רבה!',         t: 'אתמול', u: 0, c: 'bg-orange-500' },
                ].map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 ${i === 0 ? 'bg-white/10' : ''}`}>
                    <div className={`w-8 h-8 rounded-full ${c.c} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{c.n[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-white truncate">{c.n}</span>
                        <span className="text-[10px] text-gray-600">{c.t}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-500 truncate">{c.m}</span>
                        {c.u > 0 && <span className="w-4 h-4 rounded-full bg-green-500 text-[9px] text-white flex items-center justify-center font-bold">{c.u}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat window */}
              <div className="flex-1 flex flex-col">
                <div className="px-4 py-2 bg-gray-900/50 border-b border-white/5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">י</div>
                  <div>
                    <div className="text-sm font-semibold text-white">יעל כהן</div>
                    <div className="text-[11px] text-green-400">מקוון</div>
                  </div>
                  <div className="mr-auto bg-purple-500/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Bot className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] text-purple-400">AI פעיל</span>
                  </div>
                </div>

                <div className="flex-1 bg-[#efeae2] p-4 space-y-3" dir="rtl">
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-xs text-gray-800">שלום יעל! 👋 ראיתי שהתעניינת בחבילת ה-Pro</p>
                      <div className="flex justify-end items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-400">10:15</span>
                        <span className="text-blue-500 text-xs">✓✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-xs text-gray-800">כן! כמה זה עולה?</p>
                      <span className="text-[10px] text-gray-400">10:32</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-xs shadow-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <Bot className="w-2.5 h-2.5 text-purple-600" />
                        <span className="text-[9px] text-purple-600 font-medium">AI</span>
                      </div>
                      <p className="text-xs text-gray-800">חבילת Pro היא $79/חודש עם 10,000 הודעות 😊 רוצה שאשלח פרטים?</p>
                      <div className="flex justify-end items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-400">10:32</span>
                        <span className="text-blue-500 text-xs">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-900/50 border-t border-white/5 flex items-center gap-2" dir="rtl">
                  <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-xs text-gray-600">כתוב הודעה...</div>
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-y border-white/10 bg-white/2">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          {[
            { v: '98%',    l: 'שיעור פתיחה',       s: 'לעומת 20% באימייל' },
            { v: '3x',     l: 'יותר המרות',         s: 'מול SMS ואימייל'   },
            { v: '< 3min', l: 'זמן תגובה',          s: 'עם AI auto-reply'  },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-black text-green-400 mb-1">{s.v}</div>
              <div className="text-white font-semibold text-sm">{s.l}</div>
              <div className="text-gray-600 text-xs">{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">כל מה שצריך למכור דרך WhatsApp</h2>
            <p className="text-gray-400">מחליף ManyChat, WATI ו-Twilio — בממשק שהצוות שלך ישמח להשתמש בו</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-gray-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-2">מחירים פשוטים</h2>
            <p className="text-gray-400">ללא חוזים. ביטול בכל עת.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-6 border-2 ${plan.highlight ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-gray-900'} relative`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">הכי פופולרי</div>
                )}
                <h3 className="font-bold text-white text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">/{plan.desc}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup"
                  className={`block w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-green-500 hover:bg-green-400 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}>
                  התחל עכשיו
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-3">מוכן להתחיל?</h2>
          <p className="text-gray-400 mb-7">הצטרף ל-500+ עסקים שכבר שולחים קמפיינים חכמים</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-green-500/20">
            התחל בחינם — 100 הודעות ראשונות מתנה
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold">SenderGenie</span>
            <span className="text-gray-700 text-sm">© 2025</span>
          </div>
          <div className="flex gap-5 text-sm text-gray-600">
            <a href="#" className="hover:text-white transition-colors">פרטיות</a>
            <a href="#" className="hover:text-white transition-colors">תנאי שימוש</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
