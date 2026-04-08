'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, Megaphone, Users, BarChart2,
  Settings, Bot, LogOut, Zap, Bell
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useInboxStore } from '../../store/inbox'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

const NAV_ITEMS = [
  { href: '/inbox',     icon: MessageSquare, label: 'הודעות' },
  { href: '/campaigns', icon: Megaphone,     label: 'קמפיינים' },
  { href: '/contacts',  icon: Users,          label: 'אנשי קשר' },
  { href: '/ai',        icon: Bot,            label: 'AI בוט' },
  { href: '/analytics', icon: BarChart2,      label: 'אנליטיקס' },
  { href: '/settings',  icon: Settings,       label: 'הגדרות' },
]

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, workspace, logout } = useAuthStore()
  const { unreadTotal } = useInboxStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated) router.push('/login')
  }, [mounted, isAuthenticated, router])

  // Listen for token-invalid event from api interceptor
  useEffect(() => {
    const handler = () => { logout(); router.push('/login') }
    window.addEventListener('sg:logout', handler)
    return () => window.removeEventListener('sg:logout', handler)
  }, [logout, router])

  if (!mounted || !isAuthenticated) {
    return (
      <div className="h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-green flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1117]" dir="rtl">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-16 flex-shrink-0 bg-[#090d14] border-l border-white/5 flex flex-col items-center py-4 gap-1">
        {/* Logo */}
        <Link href="/" className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center mb-4 hover:opacity-90 transition-opacity">
          <Zap className="w-5 h-5 text-white" />
        </Link>

        {/* Nav */}
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group ${
                active
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.href === '/inbox' && unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
              {/* Tooltip */}
              <span className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </span>
            </Link>
          )
        })}

        <div className="flex-1" />

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full gradient-green flex items-center justify-center text-white text-xs font-bold mb-1"
          title={user?.name ?? ''}
        >
          {initials}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); router.push('/') }}
          title="התנתק"
          className="w-11 h-11 rounded-xl text-gray-600 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="h-12 bg-[#090d14] border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">workspace</span>
            <span className="text-xs text-gray-300 font-medium">{workspace?.name ?? ''}</span>
            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium capitalize">
              {workspace?.plan ?? 'free'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="text-xs text-gray-500">{user?.name}</div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>{children}</AppShell>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />
    </QueryClientProvider>
  )
}
