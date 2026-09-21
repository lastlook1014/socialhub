'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageContainer, SectionHeader, LoadingState, EmptyState } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { fmtBytes, fmtNumber, fmtRelative, fmtDateTime } from '@/lib/meta'
import {
  Mail, Plus, ShieldCheck, ShieldAlert, ShieldX, HelpCircle, CheckCircle2,
  Server, Lock, RefreshCw, Users, Inbox, Send, AlertTriangle, Activity,
  Mailbox, AtSign, Boxes, Edit, Ban, KeyRound, Trash2,
} from 'lucide-react'

type DnsStatus = 'VERIFIED' | 'WARNING' | 'FAILED' | 'UNKNOWN'

interface Mailbox {
  id: string
  emailAddress: string
  displayName: string
  firstName?: string | null
  lastName?: string | null
  department?: string | null
  role?: string | null
  status: string
  quotaBytes: number
  usedBytes: number
  forwardingTo?: string | null
  recoveryAddress?: string | null
  recentDeliveries?: Array<{
    id: string
    status: string
    recipient: string
    subject?: string | null
    timestamp: string
    errorCode?: string | null
  }>
}

interface Domain {
  id: string
  domain: string
  provider: string
  status: string
  dns: { mx: DnsStatus; spf: DnsStatus; dkim: DnsStatus; dmarc: DnsStatus; tls: DnsStatus; ptr: DnsStatus }
  smtp: { host: string; port: number } | null
  imap: { host: string; port: number } | null
  mailboxes: Mailbox[]
  aliases: Array<{ id: string; alias: string; forwardsTo: string[] }>
  groups: Array<{ id: string; name: string; emailAddress: string; members: string[] }>
}

interface SecurityEvent {
  id: string
  type: string
  severity: string
  mailboxId?: string | null
  message: string
  createdAt: string
}

interface MailData {
  domains: Domain[]
  securityEvents: SecurityEvent[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dnsTone(status: DnsStatus): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'VERIFIED') return 'success'
  if (status === 'WARNING') return 'warning'
  if (status === 'FAILED') return 'danger'
  return 'muted'
}

// Render icon for a DNS status (declared outside component to avoid re-creation warnings)
function DnsStatusIcon({ status, className }: { status: DnsStatus; className?: string }) {
  if (status === 'VERIFIED') return <CheckCircle2 className={className} />
  if (status === 'WARNING') return <ShieldAlert className={className} />
  if (status === 'FAILED') return <ShieldX className={className} />
  return <HelpCircle className={className} />
}

function mailboxTone(status: string): 'success' | 'muted' | 'danger' | 'warning' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'DISABLED') return 'muted'
  if (status === 'SUSPENDED') return 'danger'
  return 'warning'
}

function deliveryTone(status: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (status === 'SENT' || status === 'DELIVERED') return 'success'
  if (status === 'DEFERRED') return 'warning'
  if (status === 'BOUNCED' || status === 'FAILED' || status === 'REJECTED') return 'danger'
  return 'muted'
}

function severityTone(sev: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (sev === 'INFO') return 'info'
  if (sev === 'WARNING') return 'warning'
  if (sev === 'CRITICAL' || sev === 'ERROR') return 'danger'
  return 'muted'
}

const QUOTA_OPTIONS = [
  { label: '5 GB', value: 5 * 1024 * 1024 * 1024 },
  { label: '10 GB', value: 10 * 1024 * 1024 * 1024 },
  { label: '25 GB', value: 25 * 1024 * 1024 * 1024 },
  { label: '50 GB', value: 50 * 1024 * 1024 * 1024 },
]

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function MailCenterView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<MailData>({
    queryKey: ['mail'],
    queryFn: async () => {
      const r = await fetch('/api/v1/mail')
      const j = await r.json()
      return j.data as MailData
    },
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [deliveryFilter, setDeliveryFilter] = useState<string>('ALL')

  const createMailbox = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch('/api/v1/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!j.success || j.data?.error) throw new Error(j.data?.error ?? 'Failed to create mailbox')
      return j.data
    },
    onSuccess: () => {
      toast.success('Mailbox created', { description: 'Audit log recorded (§37).' })
      qc.invalidateQueries({ queryKey: ['mail'] })
      setCreateOpen(false)
    },
    onError: (e: any) => {
      toast.error('Could not create mailbox', { description: e.message ?? 'Unknown error' })
    },
  })

  const stats = useMemo(() => {
    if (!data) {
      return {
        totalMailboxes: 0, active: 0, disabled: 0, storageUsed: 0, storageTotal: 0,
        sent: 0, delivered: 0, bounceRate: 0, warnings: 0, domainHealthOk: 0,
        deliveryEvents: [] as any[],
      }
    }
    const mailboxes = data.domains.flatMap((d) => d.mailboxes)
    const active = mailboxes.filter((m) => m.status === 'ACTIVE').length
    const disabled = mailboxes.filter((m) => m.status === 'DISABLED' || m.status === 'SUSPENDED').length
    const storageUsed = mailboxes.reduce((sum, m) => sum + Number(m.usedBytes ?? 0), 0)
    const storageTotal = mailboxes.reduce((sum, m) => sum + Number(m.quotaBytes ?? 0), 0)

    const deliveryEvents = data.domains
      .flatMap((d) => d.mailboxes.flatMap((m) => m.recentDeliveries ?? []))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const sent = deliveryEvents.length
    const delivered = deliveryEvents.filter((e) => e.status === 'DELIVERED' || e.status === 'SENT').length
    const bounced = deliveryEvents.filter(
      (e) => e.status === 'BOUNCED' || e.status === 'REJECTED' || e.status === 'FAILED',
    ).length
    const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0
    const warnings = data.securityEvents.length
    const domainHealthOk = data.domains.filter(
      (d) => Object.values(d.dns).every((s) => s === 'VERIFIED'),
    ).length

    return {
      totalMailboxes: mailboxes.length,
      active,
      disabled,
      storageUsed,
      storageTotal,
      sent,
      delivered,
      bounceRate,
      warnings,
      domainHealthOk,
      deliveryEvents,
    }
  }, [data])

  if (isLoading || !data) {
    return (
      <PageContainer>
        <SectionHeader title="Mail Center" description="Organization mail infrastructure, mailboxes, domains, and delivery health" />
        <LoadingState />
      </PageContainer>
    )
  }

  const filteredDelivery = deliveryFilter === 'ALL'
    ? stats.deliveryEvents
    : stats.deliveryEvents.filter((e) => e.status === deliveryFilter)

  return (
    <PageContainer>
      <SectionHeader
        title="Mail Center"
        description="Organization mail infrastructure, mailboxes, domains, and delivery health"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('DNS check simulated in demo', { description: 'Per §40, never mark verified without actual check.' })}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Verify DNS
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Mailbox
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="mailboxes">Mailboxes</TabsTrigger>
            <TabsTrigger value="aliases">Aliases & Groups</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* ---------------------------------------------------------------- Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <KpiCard icon={Mailbox} label="Total Mailboxes" value={fmtNumber(stats.totalMailboxes)} sub={`${stats.active} active · ${stats.disabled} off`} />
            <KpiCard icon={Activity} label="Active" value={fmtNumber(stats.active)} sub="ready to send & receive" tone="success" />
            <KpiCard icon={Ban} label="Disabled" value={fmtNumber(stats.disabled)} sub="suspended or off" tone="warning" />
            <KpiCard icon={Inbox} label="Storage Used" value={fmtBytes(stats.storageUsed)} sub={`of ${fmtBytes(stats.storageTotal)}`} />
            <KpiCard icon={ShieldCheck} label="Domain Health" value={`${stats.domainHealthOk}/${data.domains.length}`} sub="fully verified" tone="success" />
            <KpiCard icon={Send} label="Delivery Events" value={fmtNumber(stats.sent)} sub={`${stats.delivered} delivered`} />
            <KpiCard icon={CheckCircle2} label="Delivered" value={fmtNumber(stats.delivered)} sub="last 10 per mailbox" tone="success" />
            <KpiCard icon={AlertTriangle} label="Bounce Rate" value={`${stats.bounceRate}%`} sub="of recent deliveries" tone={stats.bounceRate > 10 ? 'danger' : 'warning'} />
            <KpiCard icon={ShieldAlert} label="Security Warnings" value={fmtNumber(stats.warnings)} sub="last 20 events" tone={stats.warnings > 0 ? 'danger' : 'success'} />
            <KpiCard icon={Server} label="Storage Available" value={fmtBytes(Math.max(0, stats.storageTotal - stats.storageUsed))} sub="across all mailboxes" />
          </div>

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-accent-emerald" /> Mail Infrastructure Health
              </CardTitle>
              <p className="text-xs text-muted-foreground">Per-domain verification of MX, SPF, DKIM, DMARC, TLS, rDNS, transport, storage and delivery KPIs (§54).</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Domain</th>
                    <th className="px-2 pb-2 font-medium">MX</th>
                    <th className="px-2 pb-2 font-medium">SPF</th>
                    <th className="px-2 pb-2 font-medium">DKIM</th>
                    <th className="px-2 pb-2 font-medium">DMARC</th>
                    <th className="px-2 pb-2 font-medium">TLS</th>
                    <th className="px-2 pb-2 font-medium">rDNS</th>
                    <th className="px-2 pb-2 font-medium">SMTP</th>
                    <th className="px-2 pb-2 font-medium">IMAP</th>
                    <th className="px-2 pb-2 font-medium">Storage</th>
                    <th className="px-2 pb-2 font-medium">Mailboxes</th>
                    <th className="px-2 pb-2 font-medium">Bounce</th>
                  </tr>
                </thead>
                <tbody>
                  {data.domains.map((d) => {
                    const storageUsed = d.mailboxes.reduce((s, m) => s + Number(m.usedBytes ?? 0), 0)
                    const storageTotal = d.mailboxes.reduce((s, m) => s + Number(m.quotaBytes ?? 0), 0)
                    const events = d.mailboxes.flatMap((m) => m.recentDeliveries ?? [])
                    const bounced = events.filter((e) => ['BOUNCED', 'REJECTED', 'FAILED'].includes(e.status)).length
                    const bounceRate = events.length > 0 ? Math.round((bounced / events.length) * 100) : 0
                    return (
                      <tr key={d.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-foreground">{d.domain}</div>
                          <div className="text-[11px] text-muted-foreground">{d.provider}</div>
                        </td>
                        <DnsCell status={d.dns.mx} />
                        <DnsCell status={d.dns.spf} />
                        <DnsCell status={d.dns.dkim} />
                        <DnsCell status={d.dns.dmarc} />
                        <DnsCell status={d.dns.tls} />
                        <DnsCell status={d.dns.ptr} />
                        <td className="px-2 py-2.5">
                          {d.smtp ? <StatusPill tone="success" dot={false}>{d.smtp.host}:{d.smtp.port}</StatusPill> : <StatusPill tone="muted" dot={false}>—</StatusPill>}
                        </td>
                        <td className="px-2 py-2.5">
                          {d.imap ? <StatusPill tone="success" dot={false}>{d.imap.host}:{d.imap.port}</StatusPill> : <StatusPill tone="muted" dot={false}>—</StatusPill>}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-foreground">{fmtBytes(storageUsed)}</span>
                            <Progress value={storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0} className="h-1.5" />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-foreground/80">{d.mailboxes.length}</td>
                        <td className="px-2 py-2.5">
                          <StatusPill tone={bounceRate > 10 ? 'danger' : bounceRate > 0 ? 'warning' : 'success'} dot={false}>{bounceRate}%</StatusPill>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- Domains */}
        <TabsContent value="domains" className="space-y-4">
          {data.domains.length === 0 ? (
            <EmptyState icon={Server} title="No mail domains" description="Add a domain to start provisioning mailboxes." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.domains.map((d) => (
                <Card key={d.id} className="card-premium">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <GlobeBadge domain={d.domain} />
                          {d.domain}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Provider: <span className="font-medium text-foreground">{d.provider}</span></span>
                          <span>·</span>
                          <StatusPill tone={d.status === 'HEALTHY' || d.status === 'VERIFIED' ? 'success' : d.status === 'WARNING' ? 'warning' : d.status === 'FAILED' ? 'danger' : 'muted'}>{d.status}</StatusPill>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info('DNS check simulated in demo', { description: 'Per §40, never mark verified without actual check.' })}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Run verification
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">DNS verification</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <DnsCheckCell label="MX Record" status={d.dns.mx} />
                        <DnsCheckCell label="SPF" status={d.dns.spf} />
                        <DnsCheckCell label="DKIM" status={d.dns.dkim} />
                        <DnsCheckCell label="DMARC" status={d.dns.dmarc} />
                        <DnsCheckCell label="TLS" status={d.dns.tls} />
                        <DnsCheckCell label="rDNS / PTR" status={d.dns.ptr} />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <Send className="h-3.5 w-3.5 text-accent-emerald" /> SMTP
                        </div>
                        {d.smtp ? (
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{d.smtp.host}:{d.smtp.port}</div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">Not configured</div>
                        )}
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <Inbox className="h-3.5 w-3.5 text-accent-emerald" /> IMAP
                        </div>
                        {d.imap ? (
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{d.imap.host}:{d.imap.port}</div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">Not configured</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Credentials encrypted at rest — never exposed (§46).</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- Mailboxes */}
        <TabsContent value="mailboxes" className="space-y-4">
          <Card className="card-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mailbox className="h-4 w-4 text-accent-emerald" /> Mailboxes
                <span className="text-xs font-normal text-muted-foreground">({stats.totalMailboxes})</span>
              </CardTitle>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Mailbox
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[640px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <TableHead className="pr-3">Email</TableHead>
                      <TableHead className="pr-3">Display Name</TableHead>
                      <TableHead className="pr-3 hidden md:table-cell">Department</TableHead>
                      <TableHead className="pr-3 hidden md:table-cell">Role</TableHead>
                      <TableHead className="pr-3">Status</TableHead>
                      <TableHead className="pr-3 min-w-[180px]">Quota</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.domains.flatMap((d) => d.mailboxes).map((m) => {
                      const pct = m.quotaBytes > 0 ? (Number(m.usedBytes) / Number(m.quotaBytes)) * 100 : 0
                      const tone = pct >= 90 ? 'danger' : pct >= 80 ? 'warning' : 'success'
                      return (
                        <TableRow key={m.id} className="hover:bg-accent/30">
                          <TableCell className="pr-3 font-medium text-foreground">{m.emailAddress}</TableCell>
                          <TableCell className="pr-3">{m.displayName}</TableCell>
                          <TableCell className="pr-3 hidden md:table-cell text-muted-foreground">{m.department ?? '—'}</TableCell>
                          <TableCell className="pr-3 hidden md:table-cell">
                            <StatusPill tone="muted" dot={false}>{m.role ?? '—'}</StatusPill>
                          </TableCell>
                          <TableCell className="pr-3">
                            <StatusPill tone={mailboxTone(m.status)}>{m.status}</StatusPill>
                          </TableCell>
                          <TableCell className="pr-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{fmtBytes(Number(m.usedBytes))}</span>
                                <span>{fmtBytes(Number(m.quotaBytes))}</span>
                              </div>
                              <Progress
                                value={pct}
                                className={`h-1.5 ${tone === 'danger' ? '[&>div]:bg-red-500' : tone === 'warning' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Edit mailbox simulated in demo')}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Disable mailbox simulated in demo')}>
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Reset password simulated in demo', { description: 'Audit log entry required (§37).' })}>
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => toast.error('Delete mailbox simulated in demo', { description: 'Soft-delete with retention period (§61).' })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- Aliases & Groups */}
        <TabsContent value="aliases" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AtSign className="h-4 w-4 text-accent-emerald" /> Aliases
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => toast.info('Create alias simulated in demo')}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Alias
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {data.domains.flatMap((d) => d.aliases.map((a) => ({ ...a, domain: d.domain }))).length === 0 ? (
                    <EmptyState icon={AtSign} title="No aliases" description="Aliases forward inbound mail to one or more mailboxes." />
                  ) : (
                    data.domains.flatMap((d) => d.aliases.map((a) => ({ ...a, domain: d.domain }))).map((a) => (
                      <div key={a.id} className="flex items-start justify-between rounded-lg border border-border/60 bg-card/40 p-3 hover:bg-accent/30">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm font-medium text-foreground">{a.alias}@{a.domain}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Forwards to: <span className="text-foreground">{(a.forwardsTo ?? []).join(', ') || '—'}</span>
                          </div>
                        </div>
                        <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Boxes className="h-4 w-4 text-accent-emerald" /> Groups
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => toast.info('Create group simulated in demo')}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Group
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {data.domains.flatMap((d) => d.groups.map((g) => ({ ...g }))).length === 0 ? (
                    <EmptyState icon={Boxes} title="No groups" description="Groups distribute inbound mail to multiple members." />
                  ) : (
                    data.domains.flatMap((d) => d.groups).map((g) => (
                      <div key={g.id} className="flex items-start justify-between rounded-lg border border-border/60 bg-card/40 p-3 hover:bg-accent/30">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm font-medium text-foreground">{g.emailAddress}</div>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(g.members ?? []).slice(0, 4).map((m, i) => (
                              <span key={i} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{m}</span>
                            ))}
                            {(g.members ?? []).length > 4 && (
                              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">+{g.members.length - 4} more</span>
                            )}
                          </div>
                        </div>
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- Delivery */}
        <TabsContent value="delivery" className="space-y-4">
          <Card className="card-premium">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4 text-accent-emerald" /> Delivery Events
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="DEFERRED">Deferred</SelectItem>
                    <SelectItem value="BOUNCED">Bounced</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                Only delivery metadata is stored. Avoid storing unnecessary message bodies (§47).
              </div>
              {filteredDelivery.length === 0 ? (
                <EmptyState icon={Send} title="No delivery events" description="Recent delivery events for your mailboxes will appear here." />
              ) : (
                <ScrollArea className="max-h-[560px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <TableHead className="pr-3">Timestamp</TableHead>
                        <TableHead className="pr-3">Recipient</TableHead>
                        <TableHead className="pr-3 hidden md:table-cell">Subject</TableHead>
                        <TableHead className="pr-3">Status</TableHead>
                        <TableHead className="pr-3 hidden md:table-cell">Error Code</TableHead>
                        <TableHead className="pr-3 hidden lg:table-cell">Provider Response</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDelivery.map((e) => (
                        <TableRow key={e.id} className="hover:bg-accent/30">
                          <TableCell className="pr-3 whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.timestamp)}</TableCell>
                          <TableCell className="pr-3 font-mono text-xs">{e.recipient}</TableCell>
                          <TableCell className="pr-3 hidden md:table-cell text-foreground/80">{e.subject ?? '—'}</TableCell>
                          <TableCell className="pr-3">
                            <StatusPill tone={deliveryTone(e.status)} dot={false}>{e.status}</StatusPill>
                          </TableCell>
                          <TableCell className="pr-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{e.errorCode ?? '—'}</TableCell>
                          <TableCell className="pr-3 hidden lg:table-cell text-xs text-muted-foreground">queued · provider accepted</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- Security */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="card-premium lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-4 w-4 text-accent-emerald" /> Security Events
                </CardTitle>
                <p className="text-xs text-muted-foreground">Anomaly detection across mailboxes (§48/§49).</p>
              </CardHeader>
              <CardContent>
                {data.securityEvents.length === 0 ? (
                  <EmptyState icon={ShieldCheck} title="No security events" description="Everything looks clean." />
                ) : (
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-2.5">
                      {data.securityEvents.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 hover:bg-accent/30">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${e.severity === 'CRITICAL' || e.severity === 'ERROR' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : e.severity === 'WARNING' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'}`}>
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{e.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                              <StatusPill tone={severityTone(e.severity)} dot={false}>{e.severity}</StatusPill>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{e.message}</p>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{fmtRelative(e.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-accent-emerald" /> Security Controls
                </CardTitle>
                <p className="text-xs text-muted-foreground">Active protections (§49).</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {['SPF', 'DKIM', 'DMARC', 'TLS', 'rDNS', 'MFA', 'Brute-force protection', 'Rate limits', 'Suspicious activity monitoring', 'Session management'].map((control) => (
                    <div key={control} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <span className="text-sm text-foreground">{control}</span>
                      <StatusPill tone="success">Active</StatusPill>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  Mail abuse protection active — outbound rate limits, SPF/DKIM enforcement, and anomaly monitoring enabled (§49).
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateMailboxDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        domains={data.domains}
        submitting={createMailbox.isPending}
        onSubmit={(payload) => createMailbox.mutate(payload)}
      />
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  icon: Icon, label, value, sub, tone = 'muted',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  tone?: 'success' | 'warning' | 'danger' | 'muted' | 'info'
}) {
  const toneCls =
    tone === 'success' ? 'bg-emerald-500/10 text-accent-emerald'
    : tone === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : tone === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : tone === 'info' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
    : 'bg-muted/60 text-muted-foreground'
  return (
    <Card className="card-premium">
      <CardContent className="p-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-foreground/80">{label}</div>
        {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function DnsCell({ status }: { status: DnsStatus }) {
  return (
    <td className="px-2 py-2.5">
      <span className="inline-flex items-center gap-1.5">
        <DnsStatusIcon status={status} className={`h-3.5 w-3.5 ${
          status === 'VERIFIED' ? 'text-emerald-500'
          : status === 'WARNING' ? 'text-amber-500'
          : status === 'FAILED' ? 'text-red-500'
          : 'text-muted-foreground'
        }`} />
        <span className="text-xs">{status}</span>
      </span>
    </td>
  )
}

function DnsCheckCell({ label, status }: { label: string; status: DnsStatus }) {
  const tone = dnsTone(status)
  const bg =
    tone === 'success' ? 'bg-emerald-500/10'
    : tone === 'warning' ? 'bg-amber-500/10'
    : tone === 'danger' ? 'bg-red-500/10'
    : 'bg-muted/40'
  const txt =
    tone === 'success' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'danger' ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground'
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-border/60 p-2.5 ${bg}`}>
      <DnsStatusIcon status={status} className={`h-4 w-4 ${txt}`} />
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className={`text-[11px] ${txt}`}>{status}</div>
      </div>
    </div>
  )
}

function GlobeBadge({ domain }: { domain: string }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-emerald/10 text-accent-emerald">
      <Mail className="h-3.5 w-3.5" />
    </span>
  )
}

function CreateMailboxDialog({
  open, onOpenChange, domains, submitting, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  domains: Domain[]
  submitting: boolean
  onSubmit: (payload: any) => void
}) {
  const [username, setUsername] = useState('')
  const [domainId, setDomainId] = useState<string>(domains[0]?.id ?? '')
  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [password, setPassword] = useState('')
  const [quotaBytes, setQuotaBytes] = useState(QUOTA_OPTIONS[0].value)
  const [customQuota, setCustomQuota] = useState('')

  const reset = () => {
    setUsername(''); setDisplayName(''); setFirstName(''); setLastName('')
    setDepartment(''); setRole('MEMBER'); setPassword(''); setQuotaBytes(QUOTA_OPTIONS[0].value); setCustomQuota('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !domainId || !displayName) {
      toast.error('Missing required fields', { description: 'Username, domain, and display name are required.' })
      return
    }
    let quota = quotaBytes
    if (quotaBytes === 0) {
      const gb = Number(customQuota)
      if (!gb || gb <= 0) {
        toast.error('Enter a valid custom quota (GB)')
        return
      }
      quota = Math.floor(gb * 1024 * 1024 * 1024)
    }
    onSubmit({
      domainId, username, displayName, firstName, lastName, department, role, quotaBytes: quota,
      // password is intentionally not sent in demo — never expose (§46)
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4 text-accent-emerald" /> Create Mailbox</DialogTitle>
          <DialogDescription>Provision a new mailbox on a verified domain.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb-username">Username *</Label>
              <Input id="mb-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane.doe" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-domain">Domain *</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger id="mb-domain"><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mb-display">Display Name *</Label>
            <Input id="mb-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb-first">First Name</Label>
              <Input id="mb-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-last">Last Name</Label>
              <Input id="mb-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb-dept">Department</Label>
              <Input id="mb-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Marketing" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="mb-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'PUBLISHER', 'MODERATOR', 'ANALYST', 'MAIL_ADMIN', 'VIEWER', 'MEMBER', 'SHARED'].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mb-password">Password</Label>
            <Input id="mb-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Auto-generated if blank" />
            <p className="text-[11px] text-muted-foreground">Hashed at rest. Credentials are never returned by the API (§46).</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mb-quota">Quota</Label>
            <Select value={String(quotaBytes)} onValueChange={(v) => setQuotaBytes(Number(v))}>
              <SelectTrigger id="mb-quota"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUOTA_OPTIONS.map((q) => (
                  <SelectItem key={q.value} value={String(q.value)}>{q.label}</SelectItem>
                ))}
                <SelectItem value="0">Custom</SelectItem>
              </SelectContent>
            </Select>
            {quotaBytes === 0 && (
              <Input type="number" value={customQuota} onChange={(e) => setCustomQuota(e.target.value)} placeholder="GB" />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create mailbox'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
