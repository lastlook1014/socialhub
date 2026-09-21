'use client'

import { useQuery } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageContainer, SectionHeader, LoadingState, EmptyState } from '@/components/shared/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { fmtDateTime, fmtDate } from '@/lib/meta'
import {
  Download, Search, ChevronLeft, ChevronRight, ShieldCheck, Lock,
  LogIn, LogOut, Plug, FileText, CheckCircle2, Send, UserCog, Mail, AlertTriangle,
  ChevronDown, ChevronRight as ChevronRightIcon, Activity,
} from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  user: { id: string; name: string; avatarUrl?: string | null } | null
  createdAt: string
}

const ACTION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  LOGIN: { label: 'Sign in', icon: LogIn, tone: 'info' },
  LOGOUT: { label: 'Sign out', icon: LogOut, tone: 'muted' },
  ACCOUNT_CONNECTED: { label: 'Account connected', icon: Plug, tone: 'success' },
  ACCOUNT_DISCONNECTED: { label: 'Account disconnected', icon: Plug, tone: 'warning' },
  POST_CREATED: { label: 'Post created', icon: FileText, tone: 'info' },
  POST_APPROVED: { label: 'Post approved', icon: CheckCircle2, tone: 'success' },
  POST_PUBLISHED: { label: 'Post published', icon: Send, tone: 'success' },
  POST_FAILED: { label: 'Publication failed', icon: AlertTriangle, tone: 'danger' },
  POST_DELETED: { label: 'Post deleted', icon: AlertTriangle, tone: 'danger' },
  TASK_CREATED: { label: 'Task created', icon: FileText, tone: 'info' },
  TASK_ASSIGNED: { label: 'Task assigned', icon: UserCog, tone: 'info' },
  PERMISSION_CHANGED: { label: 'Permission changed', icon: ShieldCheck, tone: 'warning' },
  MAILBOX_CREATED: { label: 'Mailbox created', icon: Mail, tone: 'info' },
  MAILBOX_DISABLED: { label: 'Mailbox disabled', icon: Mail, tone: 'warning' },
  DOMAIN_CHANGED: { label: 'Domain updated', icon: Activity, tone: 'info' },
  SECURITY_SETTING_CHANGED: { label: 'Security setting changed', icon: ShieldCheck, tone: 'warning' },
}

function actionMeta(a: string) {
  return ACTION_META[a] ?? { label: a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), icon: Activity, tone: 'muted' as const }
}

const TONE_TINT: Record<string, string> = {
  success: 'bg-emerald-500/10 text-accent-emerald',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  muted: 'bg-muted/60 text-muted-foreground',
}

const PAGE_SIZE = 25

export function AuditLogsView() {
  const { data, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit', 100],
    queryFn: async () => {
      const r = await fetch('/api/v1/audit?limit=100')
      const j = await r.json()
      return j.data
    },
  })

  const [actionFilter, setActionFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sheetEntry, setSheetEntry] = useState<AuditEntry | null>(null)
  const [page, setPage] = useState(0)

  const users = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    ;(data ?? []).forEach((e) => {
      if (e.user && !map.has(e.user.id)) map.set(e.user.id, { id: e.user.id, name: e.user.name })
    })
    return Array.from(map.values())
  }, [data])

  const filtered = useMemo(() => {
    return (data ?? []).filter((e) => {
      if (actionFilter !== 'ALL' && e.action !== actionFilter) return false
      if (userFilter !== 'ALL' && e.user?.id !== userFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          e.action.toLowerCase().includes(q) ||
          (e.user?.name ?? '').toLowerCase().includes(q) ||
          (e.targetId ?? '').toLowerCase().includes(q) ||
          (e.ipAddress ?? '').toLowerCase().includes(q) ||
          JSON.stringify(e.metadata ?? {}).toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [data, actionFilter, userFilter, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  return (
    <PageContainer>
      <SectionHeader
        title="Audit Logs"
        description="Immutable record of sensitive actions (§37)"
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.info('Export simulated in demo', { description: 'Would generate a signed, time-stamped CSV/JSON export (§37).' })}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <Card className="card-premium border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Lock className="h-4.5 w-4.5 mt-0.5 shrink-0 text-accent-emerald" />
          <div>
            <div className="text-sm font-medium text-foreground">Audit logs are immutable</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every sensitive action is recorded (§37). Logs include actor, action, target, metadata, and source IP. Entries cannot be modified or deleted.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-accent-emerald" /> Audit Trail
            <span className="text-xs font-normal text-muted-foreground">({filtered.length} of {data?.length ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search action, user, IP, target…"
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {(Object.keys(ACTION_META)).map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_META[a].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end">
              <Badge variant="outline" className="font-normal">Last 100 entries</Badge>
            </div>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : paged.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No audit entries match your filters"
              description="Try clearing filters or widening your search. Every sensitive action will appear here."
            />
          ) : (
            <ScrollArea className="max-h-[640px]">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <TableHead className="w-8" />
                    <TableHead className="pr-3">Timestamp</TableHead>
                    <TableHead className="pr-3">User</TableHead>
                    <TableHead className="pr-3">Action</TableHead>
                    <TableHead className="pr-3 hidden md:table-cell">Target</TableHead>
                    <TableHead className="pr-3 hidden lg:table-cell">IP Address</TableHead>
                    <TableHead className="pr-3 hidden xl:table-cell">Target ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e) => {
                    const meta = actionMeta(e.action)
                    const Icon = meta.icon
                    const isExpanded = expandedId === e.id
                    return (
                      <Fragment key={e.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => setSheetEntry(e)}
                        >
                          <TableCell className="w-8">
                            <button
                              type="button"
                              onClick={(ev) => { ev.stopPropagation(); setExpandedId(isExpanded ? null : e.id) }}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRightIcon className="h-3.5 w-3.5" />}
                            </button>
                          </TableCell>
                          <TableCell className="pr-3 whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</TableCell>
                          <TableCell className="pr-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {e.user?.avatarUrl ? <AvatarImage src={e.user.avatarUrl} alt={e.user.name} /> : null}
                                <AvatarFallback className="text-[10px]">{(e.user?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground">{e.user?.name ?? 'System'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`flex h-6 w-6 items-center justify-center rounded ${TONE_TINT[meta.tone]}`}>
                                <Icon className="h-3 w-3" />
                              </span>
                              <span className="text-sm text-foreground">{meta.label}</span>
                            </span>
                          </TableCell>
                          <TableCell className="pr-3 hidden md:table-cell">
                            <Badge variant="outline" className="font-mono text-[10px]">{e.targetType ?? '—'}</Badge>
                          </TableCell>
                          <TableCell className="pr-3 hidden lg:table-cell font-mono text-xs text-muted-foreground">{e.ipAddress ?? '—'}</TableCell>
                          <TableCell className="pr-3 hidden xl:table-cell font-mono text-[11px] text-muted-foreground">{e.targetId ? `${e.targetId.slice(0, 12)}…` : '—'}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={7} className="py-3">
                              <div className="rounded-lg border border-border/60 bg-card p-3">
                                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Metadata</div>
                                {e.metadata && Object.keys(e.metadata).length > 0 ? (
                                  <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-xs text-foreground/90">
                                    {JSON.stringify(e.metadata, null, 2)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No metadata recorded.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {safePage + 1} of {pageCount} · {filtered.length} entries
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safePage === 0}
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  >
                    Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AuditDetailSheet entry={sheetEntry} onClose={() => setSheetEntry(null)} />
    </PageContainer>
  )
}

function AuditDetailSheet({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  if (!entry) return null
  const meta = actionMeta(entry.action)
  const Icon = meta.icon
  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg">Audit Entry</SheetTitle>
          <SheetDescription className="sr-only">Detailed audit log entry information</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE_TINT[meta.tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">{meta.label}</div>
              <div className="text-xs text-muted-foreground">{entry.action}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {fmtDate(entry.createdAt)} · {fmtDateTime(entry.createdAt)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Actor">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {entry.user?.avatarUrl ? <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} /> : null}
                  <AvatarFallback className="text-[10px]">{(entry.user?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{entry.user?.name ?? 'System'}</span>
              </div>
            </Field>
            <Field label="IP Address">
              <span className="font-mono text-foreground/90">{entry.ipAddress ?? '—'}</span>
            </Field>
            <Field label="Target Type">
              <Badge variant="outline" className="font-mono">{entry.targetType ?? '—'}</Badge>
            </Field>
            <Field label="Target ID">
              <span className="font-mono text-foreground/90 break-all">{entry.targetId ?? '—'}</span>
            </Field>
          </div>

          <Separator />

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metadata</div>
            {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
              <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-foreground/90">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">No metadata recorded for this entry.</p>
            )}
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <Lock className="inline h-3 w-3 mr-1" /> This entry is immutable and was written at {fmtDateTime(entry.createdAt)}. Tampering is detectable (§37).
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div>{children}</div>
    </div>
  )
}
