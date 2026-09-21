'use client'

import {
  Facebook, Instagram, Twitter, Linkedin, Youtube, Music2, MessageCircle, Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react'

export const PROVIDER_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  x: { label: 'X', icon: Twitter, color: 'text-zinc-900 dark:text-zinc-100', bg: 'bg-zinc-500/10' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-600/10' },
  tiktok: { label: 'TikTok', icon: Music2, color: 'text-zinc-900 dark:text-zinc-100', bg: 'bg-zinc-500/10' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  threads: { label: 'Threads', icon: MessageCircle, color: 'text-zinc-900 dark:text-zinc-100', bg: 'bg-zinc-500/10' },
  pinterest: { label: 'Pinterest', icon: ImageIcon, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
}

export function providerMeta(p: string) {
  return PROVIDER_META[p] ?? { label: p, icon: ImageIcon, color: 'text-zinc-500', bg: 'bg-zinc-500/10' }
}

export const HEALTH_COLORS: Record<string, string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-400',
  ORANGE: 'bg-orange-500',
  RED: 'bg-red-500',
}

export const HEALTH_LABELS: Record<string, string> = {
  GREEN: 'Healthy',
  YELLOW: 'Attention Required',
  ORANGE: 'Restricted',
  RED: 'Action Needed',
}

export const INTEGRATION_LABELS: Record<string, { label: string; tone: string }> = {
  LIVE_VERIFIED: { label: 'Live Verified', tone: 'success' },
  DEMO: { label: 'Demo', tone: 'warning' },
  SIMULATED: { label: 'Simulated', tone: 'info' },
  BLOCKED_BY_PROVIDER: { label: 'Blocked by Provider', tone: 'danger' },
  NOT_AVAILABLE: { label: 'Not Available', tone: 'muted' },
}

export const POST_STATUS_META: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  QUEUED: { label: 'Queued', tone: 'info' },
  PUBLISHING: { label: 'Publishing', tone: 'info' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  PARTIALLY_PUBLISHED: { label: 'Partially Published', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
}

export const TASK_STATUS_META: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'New', tone: 'info' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  IN_PROGRESS: { label: 'In Progress', tone: 'warning' },
  REVIEW: { label: 'In Review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
}

export const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'info' },
  HIGH: { label: 'High', tone: 'warning' },
  URGENT: { label: 'Urgent', tone: 'danger' },
}

export const SENTIMENT_META: Record<string, { label: string; tone: string }> = {
  POSITIVE: { label: 'Positive', tone: 'success' },
  NEUTRAL: { label: 'Neutral', tone: 'muted' },
  NEGATIVE: { label: 'Negative', tone: 'danger' },
  MIXED: { label: 'Mixed', tone: 'warning' },
  UNKNOWN: { label: 'Unknown', tone: 'muted' },
}

export const MODERATION_META: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'New', tone: 'info' },
  READ: { label: 'Read', tone: 'muted' },
  REPLIED: { label: 'Replied', tone: 'success' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  HIDDEN: { label: 'Hidden', tone: 'muted' },
  REPORTED: { label: 'Reported', tone: 'warning' },
}

export function fmtNumber(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n
  if (Number.isNaN(num)) return String(n)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return num.toLocaleString()
}

export function fmtBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(1) + ' GB'
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

export function fmtRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

export function fmtDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
