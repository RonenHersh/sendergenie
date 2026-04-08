import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { he } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format chat timestamp WhatsApp-style:
 * - Today: "10:32"
 * - Yesterday: "אתמול"
 * - This week: "שלישי"
 * - Older: "12/3/25"
 */
export function formatChatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'אתמול'
  return format(d, 'dd/MM/yy')
}

export function formatMessageTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'HH:mm')
}

/**
 * Truncate text to N characters with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Get initials from a name: "רון כהן" → "רכ"
 */
export function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Detect text direction (RTL for Hebrew)
 */
export function getTextDir(text: string): 'rtl' | 'ltr' {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr'
}
