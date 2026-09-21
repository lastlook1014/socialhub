'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageContainer, SectionHeader, LoadingState, EmptyState } from '@/components/shared/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/lib/meta'
import {
  CheckCheck, Bell, ListTodo, ClipboardCheck, Send, AlertTriangle,
  Plug, AlertCircle, Gauge, ShieldAlert, Mail,
} from 'lucide-react'

type NotifType =
  | 'TASK_ASSIGNED' | 'APPROVAL_REQUEST' | 'PUBLISHED' | 'FAILED'
  | 'OAUTH_EXPIRED' | 'PROVIDER_WARNING' | 'RATE_LIMIT' | 'MAIL_SECURITY'

interface Notification {
  id: string
  type: string
  title: string
  body?: string | null
  read: boolean
  createdAt: string
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  TASK_ASSIGNED: { label: 'Task Assigned', icon: ListTodo, tone: 'info' },
  APPROVAL_REQUEST: { label: 'Approval Request', icon: ClipboardCheck, tone: 'warning' },
  PUBLISHED: { label: 'Published', icon: Send, tone: 'success' },
  FAILED: { label: 'Failed', icon: AlertTriangle, tone: 'danger' },
  OAUTH_EXPIRED: { label: 'Connection Expired', icon: Plug, tone: 'warning' },
  PROVIDER_WARNING: { label: 'Provider Warning', icon: AlertCircle, tone: 'warning' },
  RATE_LIMIT: { label: 'Rate Limit', icon: Gauge, tone: 'warning' },
  MAIL_SECURITY: { label: 'Mail Security', icon: ShieldAlert, tone: 'danger' },
}

function typeMeta(t: string) {
  return TYPE_META[t] ?? { label: t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), icon: Bell, tone: 'muted' as const }
}

const TONE_BG: Record<string, string> = {
  success: 'bg-emerald-500/10 text-accent-emerald',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  muted: 'bg-muted/60 text-muted-foreground',
}

export function NotificationsView() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const { data, isLoading } = useQuery<{ notifications: Notification[]; unread: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await fetch('/api/v1/notifications')
      const j = await r.json()
      return j.data
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      return r.json()
    },
    onSuccess: () => {
      toast.success('All notifications marked as read')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      })
      return r.json()
    },
    onMutate: async (id) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['notifications'] })
      const prev = qc.getQueryData<{ notifications: Notification[]; unread: number }>(['notifications'])
      if (prev) {
        qc.setQueryData<{ notifications: Notification[]; unread: number }>(['notifications'], {
          ...prev,
          notifications: prev.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
          unread: Math.max(0, prev.unread - 1),
        })
      }
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev)
      toast.error('Could not mark notification as read')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.notifications ?? []
  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false
    return true
  })

  return (
    <PageContainer>
      <SectionHeader
        title="Notifications"
        description={`You have ${data?.unread ?? 0} unread notification${data?.unread === 1 ? '' : 's'}. Auto-refreshes every 30 seconds.`}
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={markAllRead.isPending || !data?.unread}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="p-4">
          {/* Filter bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread ({data?.unread ?? 0})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {(Object.keys(TYPE_META) as NotifType[]).map((t) => {
                    const meta = TYPE_META[t]
                    return (
                      <SelectItem key={t} value={t}>
                        {meta.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title={filter === 'unread' ? 'No unread notifications' : "You're all caught up"}
              description="No notifications match your current filter. New notifications will appear here automatically."
            />
          ) : (
            <ScrollArea className="max-h-[640px]">
              <ul className="space-y-1">
                {filtered.map((n) => {
                  const meta = typeMeta(n.type)
                  const Icon = meta.icon
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => !n.read && markRead.mutate(n.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-colors',
                          'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          !n.read && 'border-l-2 border-l-emerald-500 bg-emerald-500/[0.04]',
                        )}
                      >
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_BG[meta.tone])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('text-sm', !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                              {n.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{fmtRelative(n.createdAt)}</span>
                          </div>
                          {n.body && (
                            <p className={cn('mt-0.5 text-xs', !n.read ? 'text-foreground/80' : 'text-muted-foreground')}>
                              {n.body}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{meta.label}</span>
                            {!n.read && <span className="text-[10px] font-medium text-accent-emerald">Unread</span>}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}

          {filtered.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {filtered.length} of {notifications.length} notification(s)</span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Auto-refreshes every 30s
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
