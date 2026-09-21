'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Check, X, AlertCircle, ShieldCheck, ArrowRight, FileText, Image as ImageIcon,
  PenLine, ThumbsUp, ThumbsDown, MessageCircle, Clock, Eye,
} from 'lucide-react'

import { PageContainer, SectionHeader, EmptyState, CardSkeleton } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fmtRelative, fmtDateTime, providerMeta, POST_STATUS_META } from '@/lib/meta'

type User = { id: string; name: string; avatarUrl?: string | null }
type ApprovalStep = {
  id: string; step: number; decision: string; comment?: string | null
  approver?: string | null; decidedAt?: string | null
}
type ApprovalPost = {
  id: string
  title?: string | null
  caption: string
  status: string
  createdAt: string
  author: User
  accounts: Array<{ id: string; provider: string; displayName: string }>
  approvals: ApprovalStep[]
}

// Workflow steps for visualization (purely visual)
const WORKFLOW = [
  { key: 'editor', label: 'Editor', icon: PenLine },
  { key: 'manager', label: 'Manager', icon: ShieldCheck },
  { key: 'approver', label: 'Approver', icon: Check },
  { key: 'publisher', label: 'Publisher', icon: FileText },
  { key: 'scheduled', label: 'Scheduled', icon: Clock },
  { key: 'published', label: 'Published', icon: ThumbsUp },
]

type Decision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'

export function ApprovalsView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('awaiting')
  const [decision, setDecision] = useState<{ post: ApprovalPost; decision: Decision } | null>(null)

  const { data, isLoading } = useQuery<ApprovalPost[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      const r = await fetch('/api/v1/approvals')
      const j = await r.json()
      return j.data as ApprovalPost[]
    },
  })

  const approvals = data ?? []

  // Categorize
  const categorized = useMemo(() => {
    const awaiting = approvals.filter((p) => p.approvals.some((a) => a.decision === 'PENDING'))
    const recent = approvals.filter((p) =>
      p.status === 'APPROVED' && p.approvals.some((a) => a.decision === 'APPROVED'),
    )
    const rejected = approvals.filter((p) =>
      p.approvals.some((a) => a.decision === 'REJECTED' || a.decision === 'CHANGES_REQUESTED'),
    )
    return { awaiting, recent, rejected, all: approvals }
  }, [approvals])

  const list = useMemo(() => {
    if (tab === 'awaiting') return categorized.awaiting
    if (tab === 'approved') return categorized.recent
    if (tab === 'rejected') return categorized.rejected
    return categorized.all
  }, [tab, categorized])

  // Decide mutation
  const decideMut = useMutation({
    mutationFn: async ({ postId, decision, comment }: { postId: string; decision: Decision; comment?: string }) => {
      const r = await fetch('/api/v1/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, decision, comment }),
      })
      const j = await r.json()
      if (!j?.data?.approval) throw new Error(j?.data?.error ?? 'Failed')
      return j.data.approval
    },
    onSuccess: (_d, vars) => {
      const verb = vars.decision === 'APPROVED' ? 'approved' : vars.decision === 'REJECTED' ? 'rejected' : 'requested changes on'
      toast.success(`Post ${verb}`, { description: 'Decision recorded in the audit log.' })
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDecision(null)
    },
    onError: () => toast.error('Could not submit decision'),
  })

  // Compute workflow stage from each post
  function stageOf(post: ApprovalPost): number {
    // find first PENDING step → current stage
    const pending = post.approvals.find((a) => a.decision === 'PENDING')
    if (!pending) {
      // all decided
      if (post.status === 'PUBLISHED') return 6
      if (post.status === 'SCHEDULED') return 5
      if (post.status === 'APPROVED') return 4
      return post.approvals.length
    }
    return Math.min(pending.step, WORKFLOW.length)
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Approvals"
        description="Review and approve content before publishing."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">{categorized.awaiting.length} awaiting</span>
          </div>
        }
      />

      {/* Workflow diagram */}
      <Card className="card-premium">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {WORKFLOW.map((step, idx) => {
              const Icon = step.icon
              return (
                <div key={step.key} className="flex items-center gap-1">
                  <div className="flex flex-col items-center gap-1.5 px-2">
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                      idx === 0
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : idx === 1
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-border bg-muted/40 text-muted-foreground',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground">{step.label}</span>
                  </div>
                  {idx < WORKFLOW.length - 1 ? (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="awaiting">Awaiting Review <Count n={categorized.awaiting.length} /></TabsTrigger>
          <TabsTrigger value="approved">Recently Approved <Count n={categorized.recent.length} /></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <Count n={categorized.rejected.length} /></TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={Check}
              title="No posts awaiting approval"
              description="Submitted posts that need your review will appear here."
            />
          ) : (
            <div className="grid gap-3">
              {list.map((post) => (
                <ApprovalCard
                  key={post.id}
                  post={post}
                  stage={stageOf(post)}
                  onDecide={(d) => setDecision({ post, decision: d })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Audit note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-muted-foreground">
          Every approval decision is recorded in the audit log (§26). Each step shows the approver, decision,
          timestamp, and optional comment, producing a full non-repudiation trail for compliance review.
        </p>
      </div>

      {/* Decision dialog */}
      <DecisionDialog
        open={!!decision}
        onOpenChange={(o) => !o && setDecision(null)}
        post={decision?.post ?? null}
        decision={decision?.decision ?? null}
        submitting={decideMut.isPending}
        onSubmit={(comment) => {
          if (!decision) return
          decideMut.mutate({ postId: decision.post.id, decision: decision.decision, comment })
        }}
      />
    </PageContainer>
  )
}

function Count({ n }: { n: number }) {
  if (n === 0) return null
  return <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">{n}</span>
}

// ---------- Approval Card ----------
function ApprovalCard({
  post, stage, onDecide,
}: {
  post: ApprovalPost
  stage: number
  onDecide: (d: Decision) => void
}) {
  const hasPending = post.approvals.some((a) => a.decision === 'PENDING')
  const preview = post.caption?.slice(0, 200) ?? ''
  const status = POST_STATUS_META[post.status] ?? { label: post.status, tone: 'muted' }

  return (
    <Card className="card-premium">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left: author + content preview */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt={post.author.name} /> : null}
                  <AvatarFallback>{post.author.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-foreground">{post.author.name}</div>
                  <div className="text-[11px] text-muted-foreground">submitted {fmtRelative(post.createdAt)}</div>
                </div>
              </div>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>

            {post.title ? <div className="text-sm font-medium text-foreground">{post.title}</div> : null}
            <p className="line-clamp-3 text-xs text-foreground/80">{preview}{post.caption && post.caption.length > 200 ? '…' : ''}</p>

            {/* Target accounts */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">To</span>
              {post.accounts.length === 0 ? <span className="text-xs text-muted-foreground/70">No accounts selected</span> : null}
              {post.accounts.map((a) => {
                const meta = providerMeta(a.provider)
                const Icon = meta.icon
                return (
                  <span key={a.id} className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]', meta.bg, meta.color)}>
                    <Icon className="h-3 w-3" /> {a.displayName}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Right: approval steps + actions */}
          <div className="lg:w-72 lg:border-l lg:border-border/60 lg:pl-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Approval Steps</span>
              <span className="text-[10px] text-muted-foreground">Stage {stage}/{WORKFLOW.length}</span>
            </div>
            <ol className="space-y-1.5">
              {post.approvals.length === 0 ? (
                <li className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                  No approval chain configured.
                </li>
              ) : (
                post.approvals.map((a) => <StepRow key={a.id} step={a} />)
              )}
            </ol>

            {hasPending ? (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" onClick={() => onDecide('APPROVED')}>
                  <ThumbsUp className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300" onClick={() => onDecide('CHANGES_REQUESTED')}>
                  <PenLine className="h-3.5 w-3.5" /> Changes
                </Button>
                <Button size="sm" variant="outline" className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300" onClick={() => onDecide('REJECTED')}>
                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" /> No pending action — review only.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StepRow({ step }: { step: ApprovalStep }) {
  const toneMap: Record<string, { tone: string; icon: typeof Check }> = {
    PENDING: { tone: 'info', icon: Clock },
    APPROVED: { tone: 'success', icon: Check },
    REJECTED: { tone: 'danger', icon: X },
    CHANGES_REQUESTED: { tone: 'warning', icon: AlertCircle },
  }
  const cfg = toneMap[step.decision] ?? { tone: 'muted', icon: MessageCircle }
  const Icon = cfg.icon
  return (
    <li className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Icon className={cn('h-3 w-3', `text-${cfg.tone === 'success' ? 'emerald' : cfg.tone === 'danger' ? 'red' : cfg.tone === 'warning' ? 'amber' : cfg.tone === 'info' ? 'sky' : 'zinc'}-500`)} />
          Step {step.step}
        </span>
        <StatusPill tone={cfg.tone} dot={false}>{step.decision}</StatusPill>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{step.approver ?? 'Awaiting approver'}</span>
        <span>{step.decidedAt ? fmtDateTime(step.decidedAt) : '—'}</span>
      </div>
      {step.comment ? <p className="mt-1 text-[11px] italic text-muted-foreground">“{step.comment}”</p> : null}
    </li>
  )
}

// ---------- Decision Dialog ----------
function DecisionDialog({
  open, onOpenChange, post, decision, onSubmit, submitting,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  post: ApprovalPost | null
  decision: Decision | null
  onSubmit: (comment?: string) => void
  submitting: boolean
}) {
  const [comment, setComment] = useState('')
  if (!post || !decision) return null

  const cfg: Record<Decision, { title: string; icon: typeof Check; tone: string; btn: string; placeholder: string }> = {
    APPROVED: { title: 'Approve post', icon: ThumbsUp, tone: 'success', btn: 'Approve', placeholder: 'Optional note for the author…' },
    CHANGES_REQUESTED: { title: 'Request changes', icon: PenLine, tone: 'warning', btn: 'Request changes', placeholder: 'What needs to change before approval?' },
    REJECTED: { title: 'Reject post', icon: ThumbsDown, tone: 'danger', btn: 'Reject', placeholder: 'Reason for rejection (will be visible to the author).' },
  }
  const c = cfg[decision]
  const Icon = c.icon

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setComment('') }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', `text-${c.tone === 'success' ? 'emerald' : c.tone === 'danger' ? 'red' : 'amber'}-500`)} />
            {c.title}
          </DialogTitle>
          <DialogDescription>
            {post.title ? <span className="font-medium text-foreground">{post.title}</span> : null}
            {' '}by {post.author.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="comment">Comment</Label>
            <Textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={c.placeholder} />
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-[10px] text-muted-foreground">
            This decision will be recorded in the audit log (§26) and the author will be notified.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSubmit(comment.trim() || undefined)}
            disabled={submitting}
            className={cn(
              c.tone === 'success' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
              c.tone === 'danger' && 'bg-red-600 hover:bg-red-700 text-white',
              c.tone === 'warning' && 'bg-amber-500 hover:bg-amber-600 text-white',
            )}
          >
            {submitting ? 'Submitting…' : c.btn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
