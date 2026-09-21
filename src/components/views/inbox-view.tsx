'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MessageSquare, Reply, CheckCircle2, EyeOff, Flag, UserPlus, StickyNote,
  Inbox as InboxIcon, Search, Filter, X,
} from 'lucide-react'

import { PageContainer, SectionHeader, EmptyState, CardSkeleton } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  fmtRelative, fmtDateTime, SENTIMENT_META, MODERATION_META, providerMeta,
} from '@/lib/meta'

// ---------- Types ----------
type CommentItem = {
  id: string
  authorName: string
  authorHandle?: string | null
  authorAvatarUrl?: string | null
  body: string
  sentiment: string
  moderationState: string
  createdAt: string
  repliedAt?: string | null
  account: { id: string; provider: string; displayName: string; avatarUrl?: string | null }
  post?: { id: string; caption: string } | null
  assignedTo?: { id: string; name: string } | null
}

type Member = { user: { id: string; name: string } }

// ---------- Filter buckets ----------
const BUCKETS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'replied', label: 'Replied' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'positive', label: 'Positive' },
  { key: 'negative', label: 'Negative' },
  { key: 'priority', label: 'Priority' },
] as const

const PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'threads', 'pinterest']

export function InboxView() {
  const qc = useQueryClient()
  const [bucket, setBucket] = useState<string>('all')
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set())
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, Array<{ id: string; text: string; at: string }>>>({})
  const [newNote, setNewNote] = useState('')
  const [reply, setReply] = useState('')
  const [mobileDetail, setMobileDetail] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const { data, isLoading } = useQuery<CommentItem[]>({
    queryKey: ['comments'],
    queryFn: async () => {
      const r = await fetch('/api/v1/comments')
      const j = await r.json()
      return j.data as CommentItem[]
    },
  })
  const { data: teamData } = useQuery<{ members: Member[] }>({
    queryKey: ['team'],
    queryFn: async () => {
      const r = await fetch('/api/v1/team')
      const j = await r.json()
      return j.data as { members: Member[] }
    },
  })

  const comments = data ?? []
  const members = teamData?.members ?? []

  // Bucket counts
  const counts = useMemo(() => {
    return {
      all: comments.length,
      unread: comments.filter((c) => c.moderationState === 'NEW').length,
      unanswered: comments.filter((c) => !['REPLIED', 'RESOLVED', 'HIDDEN'].includes(c.moderationState)).length,
      replied: comments.filter((c) => c.moderationState === 'REPLIED').length,
      resolved: comments.filter((c) => c.moderationState === 'RESOLVED').length,
      positive: comments.filter((c) => c.sentiment === 'POSITIVE').length,
      negative: comments.filter((c) => c.sentiment === 'NEGATIVE').length,
      priority: comments.filter((c) => c.sentiment === 'NEGATIVE' || c.moderationState === 'REPORTED').length,
    }
  }, [comments])

  // Filtered list
  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (bucket === 'unread' && c.moderationState !== 'NEW') return false
      if (bucket === 'unanswered' && ['REPLIED', 'RESOLVED', 'HIDDEN'].includes(c.moderationState)) return false
      if (bucket === 'replied' && c.moderationState !== 'REPLIED') return false
      if (bucket === 'resolved' && c.moderationState !== 'RESOLVED') return false
      if (bucket === 'positive' && c.sentiment !== 'POSITIVE') return false
      if (bucket === 'negative' && c.sentiment !== 'NEGATIVE') return false
      if (bucket === 'priority' && !(c.sentiment === 'NEGATIVE' || c.moderationState === 'REPORTED')) return false
      if (platformFilters.size > 0 && !platformFilters.has(c.account.provider)) return false
      if (accountFilter !== 'all' && c.account.id !== accountFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!c.body.toLowerCase().includes(q) && !c.authorName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [comments, bucket, platformFilters, accountFilter, search])

  const selected = selectedId ? filtered.find((c) => c.id === selectedId) ?? comments.find((c) => c.id === selectedId) ?? null : null

  // Unique accounts
  const accounts = useMemo(() => {
    const m = new Map<string, { id: string; provider: string; displayName: string }>()
    comments.forEach((c) => m.set(c.account.id, c.account))
    return Array.from(m.values())
  }, [comments])

  // Action mutation (REPLY, RESOLVE, HIDE, REPORT, ASSIGN)
  const actionMut = useMutation({
    mutationFn: async (payload: { commentId: string; action: string; reply?: string; assigneeId?: string }) => {
      const r = await fetch('/api/v1/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!j?.data?.comment) throw new Error('Failed')
      return j.data.comment
    },
    onSuccess: (_c, vars) => {
      const verbs: Record<string, string> = {
        REPLY: 'Reply sent', RESOLVE: 'Comment resolved', HIDE: 'Comment hidden',
        REPORT: 'Comment reported', ASSIGN: 'Comment assigned',
      }
      toast.success(verbs[vars.action] ?? 'Done')
      qc.invalidateQueries({ queryKey: ['comments'] })
      if (vars.action === 'REPLY') setReply('')
    },
    onError: () => toast.error('Could not apply action'),
  })

  function addNote() {
    if (!selected || !newNote.trim()) return
    setNotes((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] ?? []), { id: Math.random().toString(36).slice(2), text: newNote.trim(), at: new Date().toISOString() }],
    }))
    setNewNote('')
    toast.success('Internal note added')
  }

  function togglePlatform(p: string) {
    setPlatformFilters((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  if (isLoading || !data) {
    return (
      <PageContainer>
        <SectionHeader title="Unified Inbox" description="Comments, mentions and messages across platforms." />
        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Unified Inbox"
        description="Comments, mentions and messages across platforms."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <InboxIcon className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">{counts.unread} unread</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        {/* Left filter sidebar */}
        <Card className="card-premium h-fit md:sticky md:top-4">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3 w-3" /> Filters
            </div>
            <nav className="space-y-0.5">
              {BUCKETS.map((b) => {
                const n = (counts as Record<string, number>)[b.key] ?? 0
                const active = bucket === b.key
                return (
                  <button
                    key={b.key}
                    onClick={() => setBucket(b.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                      active ? 'bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                    )}
                  >
                    <span>{b.label}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', active ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground')}>{n}</span>
                  </button>
                )
              })}
            </nav>

            <Separator className="my-3" />

            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platforms</div>
            <div className="space-y-1.5 px-1">
              {PLATFORMS.map((p) => {
                const meta = providerMeta(p)
                const Icon = meta.icon
                const checked = platformFilters.has(p)
                return (
                  <label key={p} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent/30">
                    <Checkbox checked={checked} onCheckedChange={() => togglePlatform(p)} />
                    <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                    <span className="text-xs text-foreground/80">{meta.label}</span>
                  </label>
                )
              })}
              {platformFilters.size > 0 ? (
                <button onClick={() => setPlatformFilters(new Set())} className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Clear platforms
                </button>
              ) : null}
            </div>

            <Separator className="my-3" />

            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Accounts</div>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Right: list + detail */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Comments list */}
          <Card className="card-premium flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/60 p-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search comments…" className="h-8 pl-8 text-xs" />
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length}</span>
            </div>
            <ScrollArea className="h-[calc(100vh-260px)] min-h-[400px]">
              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={MessageSquare} title="No comments in your inbox yet" description="Comments from connected platforms will appear here once ingested." />
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {filtered.map((c) => {
                    const meta = providerMeta(c.account.provider)
                    const Icon = meta.icon
                    const active = c.id === selectedId
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => { setSelectedId(c.id); if (isMobile) setMobileDetail(true) }}
                          className={cn(
                            'relative flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/30',
                            active && 'bg-emerald-500/5',
                          )}
                        >
                          {active ? <span className="absolute left-0 top-0 h-full w-0.5 bg-emerald-500" /> : null}
                            <div className="flex items-start gap-2.5">
                              <Avatar className="h-8 w-8">
                                {c.authorAvatarUrl ? <AvatarImage src={c.authorAvatarUrl} alt={c.authorName} /> : null}
                                <AvatarFallback className="text-[10px]">{c.authorName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">{c.authorName}</span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">{fmtRelative(c.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Icon className={cn('h-3 w-3', meta.color)} />
                                  <span className="truncate">{c.account.displayName}</span>
                                  {c.authorHandle ? <span className="truncate opacity-70">@{c.authorHandle}</span> : null}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{c.body}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <StatusPill tone={SENTIMENT_META[c.sentiment]?.tone ?? 'muted'} dot={false}>{SENTIMENT_META[c.sentiment]?.label ?? c.sentiment}</StatusPill>
                                  <StatusPill tone={MODERATION_META[c.moderationState]?.tone ?? 'muted'} dot={false}>{MODERATION_META[c.moderationState]?.label ?? c.moderationState}</StatusPill>
                                </div>
                              </div>
                            </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </Card>

          {/* Detail pane (desktop) */}
          <Card className="card-premium hidden lg:flex lg:flex-col overflow-hidden">
            {selected ? (
              <DetailPane
                comment={selected}
                reply={reply}
                setReply={setReply}
                onReply={() => actionMut.mutate({ commentId: selected.id, action: 'REPLY', reply })}
                onAction={(action) => actionMut.mutate({ commentId: selected.id, action })}
                onAssign={(assigneeId) => actionMut.mutate({ commentId: selected.id, action: 'ASSIGN', assigneeId })}
                members={members.map((m) => m.user)}
                notes={notes[selected.id] ?? []}
                newNote={newNote}
                setNewNote={setNewNote}
                onAddNote={addNote}
                submitting={actionMut.isPending}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState icon={MessageSquare} title="Select a comment" description="Pick a comment from the list to view its full context, reply, and take moderation actions." />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={mobileDetail && !!selected} onOpenChange={setMobileDetail}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Comment</SheetTitle>
          </SheetHeader>
          {selected ? (
            <DetailPane
              comment={selected}
              reply={reply}
              setReply={setReply}
              onReply={() => actionMut.mutate({ commentId: selected.id, action: 'REPLY', reply })}
              onAction={(action) => actionMut.mutate({ commentId: selected.id, action })}
              onAssign={(assigneeId) => actionMut.mutate({ commentId: selected.id, action: 'ASSIGN', assigneeId })}
              members={members.map((m) => m.user)}
              notes={notes[selected.id] ?? []}
              newNote={newNote}
              setNewNote={setNewNote}
              onAddNote={addNote}
              submitting={actionMut.isPending}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}

// ---------- Detail pane ----------
function DetailPane({
  comment, reply, setReply, onReply, onAction, onAssign, members, notes, newNote, setNewNote, onAddNote, submitting,
}: {
  comment: CommentItem
  reply: string
  setReply: (s: string) => void
  onReply: () => void
  onAction: (a: string) => void
  onAssign: (id: string) => void
  members: Array<{ id: string; name: string }>
  notes: Array<{ id: string; text: string; at: string }>
  newNote: string
  setNewNote: (s: string) => void
  onAddNote: () => void
  submitting: boolean
}) {
  const meta = providerMeta(comment.account.provider)
  const Icon = meta.icon

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Author header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {comment.authorAvatarUrl ? <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} /> : null}
            <AvatarFallback>{comment.authorName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{comment.authorName}</div>
                {comment.authorHandle ? <div className="text-[11px] text-muted-foreground">@{comment.authorHandle}</div> : null}
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div>{fmtDateTime(comment.createdAt)}</div>
                <div className="opacity-70">{fmtRelative(comment.createdAt)}</div>
              </div>
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Icon className={cn('h-3 w-3', meta.color)} />
              {comment.account.displayName}
            </div>
          </div>
        </div>

        {/* Comment body */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={SENTIMENT_META[comment.sentiment]?.tone ?? 'muted'}>{SENTIMENT_META[comment.sentiment]?.label ?? comment.sentiment}</StatusPill>
          <StatusPill tone={MODERATION_META[comment.moderationState]?.tone ?? 'muted'}>{MODERATION_META[comment.moderationState]?.label ?? comment.moderationState}</StatusPill>
          {comment.assignedTo ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <UserPlus className="h-3 w-3" /> Assigned to {comment.assignedTo.name}
            </span>
          ) : null}
        </div>
        <p className="text-[10px] italic text-muted-foreground/70">
          Machine-generated sentiment classification — for operational aid only (§29).
        </p>

        {/* Linked post */}
        {comment.post ? (
          <div className="rounded-lg border border-border/50 bg-card/40 p-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Linked post</div>
            <p className="line-clamp-3 text-xs text-foreground/80">{comment.post.caption}</p>
          </div>
        ) : null}

        <Separator />

        {/* Reply */}
        <div className="space-y-2">
          <Label className="text-xs">Reply as {comment.account.displayName}</Label>
          <Textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a public reply to this comment…"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Replies are sent via the provider's API (DEMO mode in this sandbox).</span>
            <Button size="sm" onClick={onReply} disabled={!reply.trim() || submitting}>
              <Reply className="h-3.5 w-3.5" /> Reply
            </Button>
          </div>
        </div>

        {/* Action row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button size="sm" variant="outline" onClick={() => onAction('RESOLVE')} disabled={submitting}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction('HIDE')} disabled={submitting}>
            <EyeOff className="h-3.5 w-3.5" /> Hide
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction('REPORT')} disabled={submitting}>
            <Flag className="h-3.5 w-3.5" /> Report
          </Button>
          <Select onValueChange={onAssign}>
            <SelectTrigger size="sm" className="w-full"><UserPlus className="mr-1 h-3.5 w-3.5" /><span className="truncate">Assign…</span></SelectTrigger>
            <SelectContent>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Internal notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <StickyNote className="h-3.5 w-3.5" /> Internal notes
            </Label>
            <span className="text-[10px] text-muted-foreground">{notes.length}</span>
          </div>
          {notes.length > 0 ? (
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                  <p className="text-xs text-foreground/90">{n.text}</p>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{fmtRelative(n.at)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-muted/20 p-2 text-center text-[11px] text-muted-foreground">No internal notes yet.</p>
          )}
          <div className="flex gap-2">
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" className="h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={onAddNote} disabled={!newNote.trim()}>
              <StickyNote className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/70">Notes are stored locally in this session — they are not persisted in the audit log.</p>
        </div>
      </div>
    </ScrollArea>
  )
}
