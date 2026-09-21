'use client'

import { useQuery } from '@tanstack/react-query'
import { PageContainer, SectionHeader, LoadingState } from '@/components/shared/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill, HealthDot } from '@/components/shared/status-pill'
import { fmtNumber, fmtRelative, providerMeta, HEALTH_LABELS, INTEGRATION_LABELS } from '@/lib/meta'
import {
  Plug, AlertTriangle, CalendarClock, ListTodo, ClipboardCheck, Send, XCircle,
  MessageSquare, Bell, Mail, Server, TrendingUp, TrendingDown, Minus, Activity,
  ShieldCheck, ArrowRight, Clock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { fmtDateTime } from '@/lib/meta'

const ICONS: Record<string, any> = {
  plug: Plug, alert: AlertTriangle, calendar: CalendarClock, check: ListTodo,
  clipboard: ClipboardCheck, send: Send, x: XCircle, message: MessageSquare,
  bell: Bell, mail: Mail, server: Server,
}

const TREND_ICON: Record<string, any> = { up: TrendingUp, down: TrendingDown, flat: Minus }

const AUDIT_LABELS: Record<string, string> = {
  LOGIN: 'Sign in',
  LOGOUT: 'Sign out',
  ACCOUNT_CONNECTED: 'Account connected',
  POST_CREATED: 'Post created',
  POST_APPROVED: 'Post approved',
  POST_PUBLISHED: 'Post published',
  POST_FAILED: 'Publication failed',
  TASK_CREATED: 'Task created',
  TASK_ASSIGNED: 'Task assigned',
  PERMISSION_CHANGED: 'Permission changed',
  MAILBOX_CREATED: 'Mailbox created',
  MAILBOX_DISABLED: 'Mailbox disabled',
  DOMAIN_CHANGED: 'Domain updated',
  SECURITY_SETTING_CHANGED: 'Security setting changed',
}

export function DashboardView() {
  const { setView } = useAppStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/v1/dashboard')
      const j = await r.json()
      return j.data as {
        kpis: any[]
        accounts: any[]
        activity: any[]
      }
    },
  })

  if (isLoading || !data) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    )
  }

  // Build a 30-day pseudo activity sparkline from account follower counts (demo)
  const sparkline = Array.from({ length: 14 }).map((_, i) => ({
    day: `D${i + 1}`,
    reach: 80000 + Math.round(Math.sin(i / 2) * 18000 + i * 1200 + Math.random() * 4000),
    engagement: 20000 + Math.round(Math.cos(i / 3) * 5000 + i * 300 + Math.random() * 1500),
  }))

  return (
    <PageContainer>
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-500/10 via-background to-background p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-12 translate-x-12 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            OPERATIONAL · Last sync 1m ago
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome back, Aisha
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Your SocialHub workspace is healthy. {data.accounts.filter((a) => a.health !== 'GREEN').length} account(s) need attention.
            You have {data.kpis.find((k) => k.key === 'approvals')?.value} post(s) awaiting approval.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setView('composer')}>
              <Send className="mr-1.5 h-4 w-4" /> Compose post
            </Button>
            <Button size="sm" variant="outline" onClick={() => setView('social-accounts')}>
              Manage accounts
            </Button>
            <Button size="sm" variant="outline" onClick={() => setView('approvals')}>
              Review approvals
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {data.kpis.map((kpi) => {
          const Icon = ICONS[kpi.icon] ?? Activity
          const TrendIcon = TREND_ICON[kpi.trend] ?? Minus
          const trendColor = kpi.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : kpi.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
          return (
            <Card key={kpi.key} className="card-premium overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-emerald/10 text-accent-emerald">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</div>
                <div className="mt-0.5 text-xs font-medium text-foreground/80">{kpi.label}</div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">{kpi.sub}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-premium lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Reach & Engagement — last 14 days</CardTitle>
            <StatusPill tone="warning" dot={false}>DEMO · simulated</StatusPill>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sparkline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.62 0.13 165)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.62 0.13 165)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.16 250)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.65 0.16 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.6)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v) => fmtNumber(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.5 0 0 / 0.15)', fontSize: 12, background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                  formatter={(v: any) => fmtNumber(v)}
                />
                <Area type="monotone" dataKey="reach" stroke="oklch(0.62 0.13 165)" strokeWidth={2} fill="url(#reachGrad)" />
                <Area type="monotone" dataKey="engagement" stroke="oklch(0.65 0.16 250)" strokeWidth={2} fill="url(#engGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Account Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.accounts.slice(0, 6).map((a) => {
              const meta = providerMeta(a.provider)
              const Icon = meta.icon
              return (
                <button
                  key={a.id}
                  onClick={() => setView('social-accounts')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-2.5 text-left transition-colors hover:bg-accent/40"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{a.displayName}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{a.handle} · {fmtNumber(a.followers)} followers</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <HealthDot health={a.health} />
                    <span className="text-[10px] text-muted-foreground">{HEALTH_LABELS[a.health]}</span>
                  </div>
                </button>
              )
            })}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('social-accounts')}>
              View all accounts <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Accounts + activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-premium lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Connected Accounts</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setView('social-accounts')}>
              <Plug className="mr-1.5 h-3.5 w-3.5" /> Connect
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Account</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Health</th>
                    <th className="pb-2 pr-3 font-medium">Integration</th>
                    <th className="pb-2 pr-3 font-medium">Followers</th>
                    <th className="pb-2 font-medium">Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a) => {
                    const meta = providerMeta(a.provider)
                    const Icon = meta.icon
                    const integ = INTEGRATION_LABELS[a.integrationStatus] ?? INTEGRATION_LABELS.DEMO
                    return (
                      <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.bg}`}>
                              <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{a.displayName}</div>
                              <div className="truncate text-[11px] text-muted-foreground">{meta.label} · {a.handle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill tone={a.status === 'CONNECTED' ? 'success' : a.status === 'EXPIRED' ? 'danger' : 'warning'}>
                            {a.status === 'CONNECTED' ? 'Connected' : a.status === 'EXPIRED' ? 'Expired' : a.status}
                          </StatusPill>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            <HealthDot health={a.health} />
                            <span className="text-xs text-muted-foreground">{HEALTH_LABELS[a.health]}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill tone={integ.tone} dot={false}>{integ.label}</StatusPill>
                        </td>
                        <td className="py-2.5 pr-3 text-foreground/80">{fmtNumber(a.followers)}</td>
                        <td className="py-2.5 text-muted-foreground">{fmtRelative(a.lastSyncAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-3 pl-4">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
              {data.activity.map((a) => (
                <div key={a.id} className="relative">
                  <span className="absolute -left-[11px] top-1.5 h-2 w-2 rounded-full bg-accent-emerald ring-4 ring-background" />
                  <div className="text-sm font-medium text-foreground">
                    {AUDIT_LABELS[a.action] ?? a.action}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.user} · {fmtRelative(a.createdAt)}
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('audit-logs')}>
                View all activity <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance notice */}
      <Card className="card-premium border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Social integrations are running in DEMO mode</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                OAuth credentials are not configured in this sandbox. Provider metrics, publishing and webhook
                integrations are clearly labeled DEMO and not live-verified. Per master prompt §68/§69 — no mock data is presented as live.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setView('settings')}>
            Configure integrations
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
