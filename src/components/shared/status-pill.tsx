'use client'

import { cn } from '@/lib/utils'

const TONES: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/25',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/25',
  muted: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-zinc-500/20',
}

export function StatusPill({
  tone = 'muted',
  children,
  className,
  dot = true,
}: {
  tone?: string
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone] ?? TONES.muted,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full bg-current opacity-70')} />}
      {children}
    </span>
  )
}

export function HealthDot({ health, className }: { health: string; className?: string }) {
  const colors: Record<string, string> = {
    GREEN: 'bg-emerald-500',
    YELLOW: 'bg-amber-400',
    ORANGE: 'bg-orange-500',
    RED: 'bg-red-500',
  }
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', colors[health] ?? 'bg-zinc-400')} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', colors[health] ?? 'bg-zinc-400')} />
    </span>
  )
}
