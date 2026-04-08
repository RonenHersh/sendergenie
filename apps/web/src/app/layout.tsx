import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SenderGenie — WhatsApp Marketing Platform',
  description: 'Send WhatsApp campaigns, automate conversations, and capture leads — at scale.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  )
}
