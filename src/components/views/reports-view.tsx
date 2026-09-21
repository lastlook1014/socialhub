'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PageContainer, SectionHeader, EmptyState, CardSkeleton,
} from '@/components/shared/layout'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  FileText, Plus, Download, Trash2, FileSpreadsheet, FileBarChart, Users,
  TrendingUp, BarChart3, ShieldCheck, Mail, Clock, Info, LayoutGrid, History,
} from 'lucide-react'
import { fmtDate, fmtDateTime, fmtRelative } from '@/lib/meta'
import { cn } from '@/lib/utils'

type Report = {
  id: string
  name: string
  type: string
  format: string
  dateRange: string | null
  status: string
  scheduledAt: string | null
  createdAt: string
}

const REPORT_TYPES: { value: string; label: string }[] = [
  { value: 'ACCOUNT_PERFORMANCE', label: 'Account Performance' },
  { value: 'POST_PERFORMANCE', label: 'Post Performance' },
  { value: 'FOLLOWER_GROWTH', label: 'Follower Growth' },
  { value: 'REACH', label: 'Reach' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
  { value: 'PUBLISHING', label: 'Publishing Activity' },
  { value: 'TEAM_OPS', label: 'Team Operations' },
  { value: 'ACCOUNT_HEALTH', label: 'Account Health' },
  { value: 'API_HEALTH', label: 'API Health' },
  { value: 'MAIL_HEALTH', label: 'Mail Health' },
]

const FORMATS = [
  { value: 'PDF', label: 'PDF', icon: FileText },
  { value: 'CSV', label: 'CSV', icon: FileSpreadsheet },
  { value: 'XLSX', label: 'XLSX', icon: FileBarChart },
]

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
]

const TEMPLATES = [
  {
    type: 'ACCOUNT_PERFORMANCE',
    icon: Users,
    title: 'Account Performance',
    description: 'Per-account follower growth, reach, impressions and engagement over the selected range.',
  },
  {
    type: 'POST_PERFORMANCE',
    icon: FileText,
    title: 'Post Performance',
    description: 'Top posts by engagement, reach, impressions and clicks — includes per-post breakdown.',
  },
  {
    type: 'FOLLOWER_GROWTH',
    icon: TrendingUp,
    title: 'Follower Growth',
    description: 'Net new followers per account and platform, with day-over-day deltas.',
  },
  {
    type: 'REACH',
    icon: BarChart3,
    title: 'Cross-Platform Reach',
    description: 'Reach and impressions aggregated across providers, with share-of-voice split.',
  },
  {
    type: 'TEAM_OPS',
    icon: ShieldCheck,
    title: 'Team Operations',
    description: 'Approval throughput, publishing latency, task completion and reviewer load.',
  },
  {
    type: 'MAIL_HEALTH',
    icon: Mail,
    title: 'Mail Health',
    description: 'Domain verification status, delivery rates, bounce rates and security events.',
  },
]

function statusMeta(status: string): { label: string; tone: string } {
  switch (status) {
    case 'READY': return { label: 'Ready', tone: 'success' }
    case 'GENERATING': return { label: 'Generating', tone: 'warning' }
    case 'FAILED': return { label: 'Failed', tone: 'danger' }
    default: return { label: status, tone: 'muted' }
  }
}

function typeLabel(t: string) {
  return REPORT_TYPES.find((r) => r.value === t)?.label ?? t
}

function formatIcon(f: string) {
  return FORMATS.find((x) => x.value === f)?.icon ?? FileText
}

function rangeLabel(r: string | null) {
  return RANGES.find((x) => x.value === r)?.label ?? (r ?? '—')
}

export function ReportsView() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'ACCOUNT_PERFORMANCE',
    format: 'PDF',
    dateRange: '30d',
  })

  const { data, isLoading } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const r = await fetch('/api/v1/reports')
      const j = await r.json()
      return j.data as Report[]
    },
  })

  const createMut = useMutation({
    mutationFn: async (input: typeof form) => {
      const r = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const j = await r.json()
      return j.data
    },
    onSuccess: (data) => {
      if (data?.report) {
        toast.success('Report generated', { description: `"${data.report.name}" is now ready to download.` })
        qc.invalidateQueries({ queryKey: ['reports'] })
        setDialogOpen(false)
        setForm({ name: '', type: 'ACCOUNT_PERFORMANCE', format: 'PDF', dateRange: '30d' })
      } else {
        toast.error('Could not generate report', { description: 'Please try again.' })
      }
    },
    onError: () => toast.error('Could not generate report'),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/reports?id=${id}`, { method: 'DELETE' })
      const j = await r.json()
      return j.data
    },
    onSuccess: (data) => {
      if (data?.deleted) {
        toast.success('Report deleted')
        qc.invalidateQueries({ queryKey: ['reports'] })
      } else {
        toast.error('Could not delete report')
      }
      setDeleteId(null)
    },
    onError: () => {
      toast.error('Could not delete report')
      setDeleteId(null)
    },
  })

  const reports = data ?? []

  const handleGenerate = (type: string, title: string) => {
    setForm({ name: `${title} — ${fmtDate(new Date())}`, type, format: 'PDF', dateRange: '30d' })
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Name required', { description: 'Please give the report a name.' })
      return
    }
    createMut.mutate(form)
  }

  const handleDownload = (r: Report) => {
    toast.info(`Export simulated in demo — would generate ${r.format} file`, {
      description: `"${r.name}" · ${rangeLabel(r.dateRange)}`,
    })
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Reports"
        description="Generate, schedule and export performance reports"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Report
          </Button>
        }
      />

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-accent-emerald">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted-foreground sm:text-sm">
          <span className="font-medium text-foreground">Per §35 — exports support PDF, CSV, XLSX.</span>{' '}
          Reports can be scheduled for recurring delivery. In this sandbox, file generation is simulated (no real
          file is written), but every report is recorded in the audit log.
        </div>
      </div>

      {/* Templates grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Templates</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon
            return (
              <Card key={t.type} className="card-premium group flex flex-col">
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-accent-emerald">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">{t.title}</div>
                  </div>
                  <p className="mt-2 flex-1 text-xs text-muted-foreground">{t.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => handleGenerate(t.type, t.title)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Generate
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent reports */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
          {reports.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {reports.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-12" />)}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports generated yet"
            description="Pick a template above or create a custom report to get started."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New Report
              </Button>
            }
          />
        ) : (
          <Card className="card-premium">
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => {
                      const st = statusMeta(r.status)
                      const FmtIcon = formatIcon(r.format)
                      return (
                        <TableRow key={r.id} className="hover:bg-accent/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                                <FmtIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                                {r.scheduledAt && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    Scheduled {fmtDate(r.scheduledAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-foreground/80">{typeLabel(r.type)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                              {r.format}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{rangeLabel(r.dateRange)}</span>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={st.tone}>{st.label}</StatusPill>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground/80">{fmtDate(r.createdAt)}</div>
                            <div className="text-[10px] text-muted-foreground">{fmtRelative(r.createdAt)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleDownload(r)}
                                title={`Download ${r.format}`}
                                aria-label={`Download ${r.name}`}
                                disabled={r.status !== 'READY'}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                                onClick={() => setDeleteId(r.id)}
                                title="Delete report"
                                aria-label={`Delete ${r.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Choose the report type, format and date range. The report will be saved to your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-name">Name</Label>
              <Input
                id="report-name"
                placeholder="e.g. Q3 Account Performance"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => {
                      const I = f.icon
                      return (
                        <SelectItem key={f.value} value={f.value}>
                          <span className="flex items-center gap-2">
                            <I className="h-3.5 w-3.5" />
                            {f.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date Range</Label>
                <Select value={form.dateRange} onValueChange={(v) => setForm((f) => ({ ...f, dateRange: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? 'Generating…' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently removed from your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn('bg-destructive text-white hover:bg-destructive/90')}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
