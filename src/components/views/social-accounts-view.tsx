'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PageContainer, SectionHeader, EmptyState, LoadingState,
} from '@/components/shared/layout'
import { StatusPill, HealthDot } from '@/components/shared/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plug, AlertTriangle, ChevronDown, RefreshCw, Plus, Search, ShieldAlert, Link2, Users, Eye, Heart,
} from 'lucide-react'
import {
  providerMeta, fmtNumber, fmtRelative, fmtDateTime, HEALTH_LABELS, INTEGRATION_LABELS,
} from '@/lib/meta'
import { cn } from '@/lib/utils'

const PROVIDERS = ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'threads', 'pinterest']

const CAPABILITY_KEYS: { key: string; label: string }[] = [
  { key: 'publish', label: 'Publish' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'comments', label: 'Comments' },
  { key: 'video', label: 'Video' },
  { key: 'stories', label: 'Stories' },
  { key: 'reels', label: 'Reels' },
  { key: 'webhooks', label: 'Webhooks' },
]

const MATRIX_COLUMNS: { key: string; label: string }[] = [
  { key: 'publishing', label: 'Publishing' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'comments', label: 'Comments' },
  { key: 'video', label: 'Video' },
  { key: 'stories', label: 'Stories' },
  { key: 'reels', label: 'Reels' },
  { key: 'webhooks', label: 'Webhooks' },
]

const SEVERITY_TONE: Record<string, string> = {
  INFO: 'bg-sky-500',
  WARNING: 'bg-amber-400',
  ERROR: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
}

const CONNECTION_TONE: Record<string, string> = {
  CONNECTED: 'success',
  EXPIRED: 'danger',
  RECONNECTING: 'warning',
  ERROR: 'danger',
  DISCONNECTED: 'muted',
}

interface Account {
  id: string
  provider: string
  handle: string
  displayName: string
  avatarUrl?: string | null
  platformAccountId?: string | null
  integrationStatus: string
  connectionStatus: string
  health: string
  healthReason?: string | null
  followers: number
  reach30d: number
  impressions30d: number
  engagementRate: number
  capabilities: {
    publish: boolean
    schedule: boolean
    analytics: boolean
    comments: boolean
    video: boolean
    stories: boolean
    reels: boolean
    webhooks: boolean
  }
  tokenExpiresAt?: string | null
  lastSyncAt?: string | null
  warnings: string[]
  healthEvents: {
    id: string
    type: string
    severity: string
    message: string
    createdAt: string
  }[]
}

interface CapabilityMatrixRow {
  provider: string
  publishing: string
  scheduling: string
  analytics: string
  comments: string
  video: string
  stories: string
  reels: string
  webhooks: string
}

function AccountCard({ account }: { account: Account }) {
  const [eventsOpen, setEventsOpen] = useState(false)
  const meta = providerMeta(account.provider)
  const Icon = meta.icon
  const integ = INTEGRATION_LABELS[account.integrationStatus] ?? INTEGRATION_LABELS.DEMO
  const connTone = CONNECTION_TONE[account.connectionStatus] ?? 'muted'
  const notGreen = account.health !== 'GREEN'
  const hasEvents = account.healthEvents && account.healthEvents.length > 0

  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="space-y-4 p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.bg)}>
            <Icon className={cn('h-5 w-5', meta.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">{account.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{account.handle} · {meta.label}</div>
          </div>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={account.avatarUrl ?? undefined} alt={account.displayName} />
            <AvatarFallback className="text-[10px]">{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={connTone}>
            {account.connectionStatus.charAt(0) + account.connectionStatus.slice(1).toLowerCase()}
          </StatusPill>
          <StatusPill tone={integ.tone} dot={false}>{integ.label}</StatusPill>
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:text-zinc-300">
            <HealthDot health={account.health} />
            {HEALTH_LABELS[account.health] ?? account.health}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5">
          <Metric icon={Users} label="Followers" value={fmtNumber(account.followers)} />
          <Metric icon={Eye} label="Reach 30d" value={fmtNumber(account.reach30d)} />
          <Metric icon={Eye} label="Impressions 30d" value={fmtNumber(account.impressions30d)} />
          <Metric icon={Heart} label="Engagement" value={`${account.engagementRate.toFixed(1)}%`} />
        </div>

        {/* Capabilities */}
        <div>
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Capabilities</div>
          <div className="flex flex-wrap gap-1">
            {CAPABILITY_KEYS.map((c) => {
              const supported = (account.capabilities as any)[c.key] === true
              return (
                <Badge
                  key={c.key}
                  variant="outline"
                  className={cn(
                    'px-1.5 py-0 text-[10px] font-medium',
                    supported
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-border bg-muted/40 text-muted-foreground/60 line-through',
                  )}
                >
                  {c.label}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Health reason (only when not GREEN) */}
        {notGreen && account.healthReason && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs italic text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{account.healthReason}</span>
          </div>
        )}

        {/* Token + sync info */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            <div className="font-medium uppercase tracking-wider text-muted-foreground/70">Token expires</div>
            <div className="mt-0.5 text-foreground/80">
              {account.tokenExpiresAt ? (
                <>
                  <span>{fmtRelative(account.tokenExpiresAt)}</span>
                  <span className="ml-1 text-muted-foreground">· {fmtDateTime(account.tokenExpiresAt)}</span>
                </>
              ) : '—'}
            </div>
          </div>
          <div>
            <div className="font-medium uppercase tracking-wider text-muted-foreground/70">Last sync</div>
            <div className="mt-0.5 text-foreground/80">{fmtRelative(account.lastSyncAt)}</div>
          </div>
        </div>

        {/* Warnings */}
        {account.warnings && account.warnings.length > 0 && (
          <div className="space-y-1">
            {account.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Health events (collapsible) */}
        {hasEvents && (
          <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-md px-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                <span>Health events · {account.healthEvents.length}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', eventsOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {account.healthEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 rounded-md border border-border/60 bg-card/40 p-2">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', SEVERITY_TONE[ev.severity] ?? 'bg-zinc-400')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{ev.type.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">{fmtRelative(ev.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/80">{ev.message}</p>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</div>
        <div className="text-xs font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

function ConnectAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (provider: string) => {
      const r = await fetch('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, handle, displayName }),
      })
      return r.json()
    },
    onSuccess: (data) => {
      if (data?.data?.account) {
        toast.success(`Connected ${providerMeta(selectedProvider ?? '').label} account in DEMO mode`, {
          description: 'OAuth credentials are simulated in this sandbox. Integration status: DEMO.',
        })
        qc.invalidateQueries({ queryKey: ['accounts'] })
        onOpenChange(false)
        setHandle('')
        setDisplayName('')
        setSelectedProvider(null)
      } else {
        toast.error('Failed to connect account')
      }
    },
    onError: () => toast.error('Network error while connecting account'),
  })

  const handleConnect = (provider: string) => {
    setSelectedProvider(provider)
    mutation.mutate(provider)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect a social account</DialogTitle>
          <DialogDescription>
            Choose a provider to connect. Integrations run in <span className="font-medium text-amber-700 dark:text-amber-400">DEMO mode</span> in this sandbox — no real OAuth credentials are exchanged. Per master prompt §68/§69.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS.map((p) => {
              const meta = providerMeta(p)
              const Icon = meta.icon
              const pending = mutation.isPending && selectedProvider === p
              return (
                <button
                  key={p}
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => handleConnect(p)}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-accent/40 disabled:opacity-50',
                    pending && 'border-emerald-500/60 bg-accent/60',
                  )}
                  title={`Connect ${meta.label}`}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110', meta.bg)}>
                    {pending ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : <Icon className={cn('h-4 w-4', meta.color)} />}
                  </div>
                  <span className="text-[10px] font-medium text-foreground">{meta.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-medium text-foreground">Optional · override demo handle & display name</div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="@handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                disabled={mutation.isPending}
              />
              <Input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SocialAccountsView() {
  const [connectOpen, setConnectOpen] = useState(false)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const r = await fetch('/api/v1/accounts')
      const j = await r.json()
      return j.data as { accounts: Account[]; capabilityMatrix: CapabilityMatrixRow[] }
    },
  })

  const accounts = data?.accounts ?? []
  const matrix = data?.capabilityMatrix ?? []
  const needsAttention = accounts.filter((a) => a.health !== 'GREEN').length

  return (
    <PageContainer>
      <SectionHeader
        title="Social Accounts"
        description="Connect, monitor and manage authorized accounts across platforms"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setConnectOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Connect Account
            </Button>
          </>
        }
      />

      {/* DEMO banner */}
      <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Social provider integrations are running in DEMO mode</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              OAuth credentials are not configured in this sandbox. Metrics, capability flags, health events and publishing actions are clearly labeled DEMO — no live-verified data is presented.
              {needsAttention > 0 && <> · <span className="font-medium text-amber-700 dark:text-amber-400">{needsAttention} account(s) need attention.</span></>}
            </p>
          </div>
        </div>
        <StatusPill tone="warning" dot={false}>DEMO · SIMULATED</StatusPill>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No social accounts connected"
          description="Connect your first account to start publishing, scheduling, and monitoring engagement across platforms."
          action={
            <Button size="sm" onClick={() => setConnectOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Connect your first account
            </Button>
          }
        />
      ) : (
        <>
          <section aria-label="Connected accounts">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
            </div>
          </section>

          {/* Capability Matrix */}
          <Card className="card-premium">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Provider Capability Matrix
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Capabilities are derived from actual connected accounts — per master prompt §67, never hard-code unsupported capabilities. Cells marked N/A reflect the real flags reported by the connected account(s) for each provider.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Provider</TableHead>
                      {MATRIX_COLUMNS.map((c) => (
                        <TableHead key={c.key} className="text-center">{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={MATRIX_COLUMNS.length + 1} className="py-6 text-center text-muted-foreground">
                          No provider data — connect an account to populate this matrix.
                        </TableCell>
                      </TableRow>
                    ) : (
                      matrix.map((row) => {
                        const meta = providerMeta(row.provider)
                        const Icon = meta.icon
                        return (
                          <TableRow key={row.provider}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', meta.bg)}>
                                  <Icon className={cn('h-3 w-3', meta.color)} />
                                </div>
                                <span className="text-sm font-medium text-foreground">{meta.label}</span>
                              </div>
                            </TableCell>
                            {MATRIX_COLUMNS.map((c) => {
                              const v = (row as any)[c.key]
                              const supported = v === 'SUPPORTED'
                              return (
                                <TableCell key={c.key} className="text-center">
                                  {supported ? (
                                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">
                                      Supported
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                      N/A
                                    </span>
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConnectAccountDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </PageContainer>
  )
}
