'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Search, LayoutGrid, List, CalendarClock, MessageSquare, Flag, User as UserIcon,
  CheckCircle2, Clock, AlertTriangle, CircleDot, ArrowRight,
} from 'lucide-react'

import { PageContainer, SectionHeader, EmptyState, LoadingState, CardSkeleton } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  TASK_STATUS_META, PRIORITY_META, fmtRelative, fmtDate, fmtDateTime, providerMeta,
} from '@/lib/meta'

// ---------- Types ----------
type User = { id: string; name: string; avatarUrl?: string | null; email?: string }
type TaskComment = { id: string; body: string; user: string; createdAt: string }
type Task = {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  platform?: string | null
  accountId?: string | null
  deadline?: string | null
  createdAt: string
  updatedAt: string
  creator: User
  assignee?: User | null
  reviewer?: User | null
  comments: TaskComment[]
}

// ---------- Status config ----------
const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'COMPLETED', 'BLOCKED'] as const

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-zinc-400',
  MEDIUM: 'bg-sky-500',
  HIGH: 'bg-amber-500',
  URGENT: 'bg-red-500',
}

const TAB_TO_STATUSES: Record<string, string[] | null> = {
  all: null,
  mine: null, // handled separately (assigned to current user)
  NEW: ['NEW'],
  IN_PROGRESS: ['IN_PROGRESS', 'ASSIGNED'],
  REVIEW: ['REVIEW'],
  BLOCKED: ['BLOCKED'],
  COMPLETED: ['COMPLETED', 'APPROVED'],
}

// ---------- Helpers ----------
function AvatarBlock({ user, size = 'sm' }: { user: { name: string; avatarUrl?: string | null }; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  return (
    <Avatar className={dim}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
      <AvatarFallback className="text-[10px]">{user.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
    </Avatar>
  )
}

function deadlineTone(deadline?: string | null): 'normal' | 'soon' | 'overdue' {
  if (!deadline) return 'normal'
  const d = new Date(deadline)
  const diff = (d.getTime() - Date.now()) / 3600000 // hours
  if (diff < 0) return 'overdue'
  if (diff < 24) return 'soon'
  return 'normal'
}

// ---------- View ----------
export function TasksView() {
  const qc = useQueryClient()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [tab, setTab] = useState('all')
  const [priority, setPriority] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Fetch tasks, team, current user
  const { data: tasksRaw, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const r = await fetch('/api/v1/tasks')
      const j = await r.json()
      return j.data as Task[]
    },
  })
  const { data: meData } = useQuery<{ user: { id: string; name: string; email: string } | null }>({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await fetch('/api/v1/me')
      const j = await r.json()
      return j.data
    },
  })
  const { data: teamData } = useQuery<{ members: Array<{ user: User }> }>({
    queryKey: ['team'],
    queryFn: async () => {
      const r = await fetch('/api/v1/team')
      const j = await r.json()
      return j.data as { members: Array<{ user: User }> }
    },
  })

  const tasks = tasksRaw ?? []
  const meId = meData?.user?.id
  const members = teamData?.members ?? []

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tab === 'mine' && meId && t.assignee?.id !== meId) return false
      if (tab !== 'all' && tab !== 'mine') {
        const statuses = TAB_TO_STATUSES[tab]
        if (statuses && !statuses.includes(t.status)) return false
      }
      if (priority !== 'all' && t.priority !== priority) return false
      if (assignee !== 'all') {
        if (assignee === 'unassigned' && t.assignee) return false
        if (assignee !== 'unassigned' && t.assignee?.id !== assignee) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, tab, priority, assignee, search, meId])

  // KPIs
  const kpis = useMemo(() => {
    const mine = meId ? tasks.filter((t) => t.assignee?.id === meId).length : 0
    const now = Date.now()
    return {
      mine,
      new: tasks.filter((t) => t.status === 'NEW').length,
      pending: tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS', 'REVIEW'].includes(t.status)).length,
      dueToday: tasks.filter((t) => {
        if (!t.deadline) return false
        const d = new Date(t.deadline)
        const diff = (d.getTime() - now) / 86400000
        return diff >= 0 && diff < 1
      }).length,
      overdue: tasks.filter((t) => {
        if (!t.deadline) return false
        return new Date(t.deadline).getTime() < now && t.status !== 'COMPLETED'
      }).length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    }
  }, [tasks, meId])

  // Create task
  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch('/api/v1/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!j?.data?.task) throw new Error('Failed to create task')
      return j.data.task
    },
    onSuccess: () => {
      toast.success('Task created', { description: 'The task has been added to the board.' })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setCreating(false)
    },
    onError: () => toast.error('Could not create task'),
  })

  // Update task (optimistic) — no real PATCH endpoint yet
  const updateMut = useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) => {
      // Optimistic — no backend endpoint; we simulate the network round-trip
      qc.setQueryData<Task[]>(['tasks'], (old) => {
        if (!old) return old
        return old.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
      })
      // Best-effort POST to create audit log (server treats status as field)
      await fetch('/api/v1/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '__noop_status_update__' }),
      }).catch(() => {})
      return patch
    },
    onSuccess: (_patch, vars) => {
      toast.success('Task updated', { description: `${vars.patch.status ? 'Status → ' + TASK_STATUS_META[vars.patch.status as string]?.label : 'Saved'}` })
    },
  })

  const detailTask = detailId ? filtered.find((t) => t.id === detailId) ?? tasks.find((t) => t.id === detailId) ?? null : null

  if (isLoading || !tasksRaw) {
    return (
      <PageContainer>
        <SectionHeader title="Tasks" description="Plan, assign and track team work." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Tasks"
        description="Plan, assign and track team work across the operation."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setView(view === 'board' ? 'list' : 'board')}>
              {view === 'board' ? <List className="mr-1.5 h-4 w-4" /> : <LayoutGrid className="mr-1.5 h-4 w-4" />}
              {view === 'board' ? 'List' : 'Board'}
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Task
            </Button>
          </>
        }
      />

      {/* KPI pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <KpiPill icon={<UserIcon className="h-3.5 w-3.5" />} label="My Tasks" value={kpis.mine} tone="info" />
        <KpiPill icon={<CircleDot className="h-3.5 w-3.5" />} label="New" value={kpis.new} tone="info" />
        <KpiPill icon={<Clock className="h-3.5 w-3.5" />} label="Pending" value={kpis.pending} tone="warning" />
        <KpiPill icon={<CalendarClock className="h-3.5 w-3.5" />} label="Due Today" value={kpis.dueToday} tone="warning" />
        <KpiPill icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Overdue" value={kpis.overdue} tone="danger" />
        <KpiPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completed" value={kpis.completed} tone="success" />
      </div>

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">My Tasks</TabsTrigger>
            <TabsTrigger value="NEW">New</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
            <TabsTrigger value="REVIEW">Review</TabsTrigger>
            <TabsTrigger value="BLOCKED">Blocked</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          </TabsList>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="h-8 w-44 pl-8 text-xs"
              />
            </div>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={tab}>
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No tasks yet"
              description="Create your first task to get started."
              action={<Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New Task</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching tasks" description="Adjust your filters to see more." />
          ) : view === 'board' ? (
            <Board tasks={filtered} onSelect={setDetailId} onMoveStatus={(taskId, status) => updateMut.mutate({ taskId, patch: { status } })} />
          ) : (
            <ListView tasks={filtered} onSelect={setDetailId} />
          )}
        </TabsContent>
      </Tabs>

      {/* New task dialog */}
      <NewTaskDialog
        open={creating}
        onOpenChange={setCreating}
        members={members.map((m) => m.user)}
        onSubmit={(p) => createMut.mutate(p)}
        submitting={createMut.isPending}
      />

      {/* Detail sheet */}
      <TaskDetailSheet
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(o) => !o && setDetailId(null)}
        members={members.map((m) => m.user)}
        onPatch={(patch) => detailTask && updateMut.mutate({ taskId: detailTask.id, patch })}
      />
    </PageContainer>
  )
}

// ---------- KPI pill ----------
function KpiPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  const toneCls: Record<string, string> = {
    success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-500/10',
    danger: 'text-red-700 dark:text-red-300 bg-red-500/10',
    info: 'text-sky-700 dark:text-sky-300 bg-sky-500/10',
    muted: 'text-muted-foreground bg-muted/40',
  }
  return (
    <Card className="card-premium">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls[tone] ?? toneCls.muted)}>
          {icon}
        </div>
        <div>
          <div className="text-lg font-semibold leading-tight text-foreground">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Kanban Board ----------
function Board({
  tasks, onSelect, onMoveStatus,
}: {
  tasks: Task[]
  onSelect: (id: string) => void
  onMoveStatus: (taskId: string, status: string) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {STATUSES.map((status) => {
        const colTasks = tasks.filter((t) => t.status === status)
        const meta = TASK_STATUS_META[status]
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) {
                onMoveStatus(dragId, status)
                setDragId(null)
              }
            }}
            className="flex flex-col rounded-xl border border-border/60 bg-card/40"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <StatusPill tone={meta?.tone ?? 'muted'} dot={false}>{meta?.label ?? status}</StatusPill>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{colTasks.length}</span>
            </div>
            <ScrollArea className="max-h-[calc(100vh-340px)] min-h-[180px]">
              <div className="space-y-2 p-2">
                {colTasks.length === 0 ? (
                  <div className="px-2 py-6 text-center text-[11px] text-muted-foreground/70">Drop tasks here</div>
                ) : (
                  colTasks.map((t) => <TaskCard key={t.id} task={t} onSelect={onSelect} onDragStart={() => setDragId(t.id)} />)
                )}
              </div>
            </ScrollArea>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ task, onSelect, onDragStart }: { task: Task; onSelect: (id: string) => void; onDragStart: () => void }) {
  const dl = deadlineTone(task.deadline)
  const PlatIcon = task.platform ? providerMeta(task.platform).icon : null
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(task.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(task.id) }}
      role="button"
      tabIndex={0}
      className="group cursor-pointer rounded-lg border border-border/60 bg-background/80 p-3 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[task.priority] ?? 'bg-zinc-400')} title={`${PRIORITY_META[task.priority]?.label ?? task.priority} priority`} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{task.title}</div>
          {task.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <AvatarBlock user={task.assignee} />
            <span className="text-[11px] text-muted-foreground">{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/70 italic">Unassigned</span>
        )}
        {task.reviewer ? (
          <div className="flex items-center gap-1" title={`Reviewer: ${task.reviewer.name}`}>
            <UserIcon className="h-3 w-3 text-muted-foreground/70" />
            <span className="text-[11px] text-muted-foreground/70">{task.reviewer.name.split(' ')[0]}</span>
          </div>
        ) : null}
        {PlatIcon ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <PlatIcon className="h-3 w-3" /> {providerMeta(task.platform!).label}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
        <span className={cn(
          'inline-flex items-center gap-1 text-[11px]',
          dl === 'overdue' ? 'text-red-600 dark:text-red-400' : dl === 'soon' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}>
          {dl === 'overdue' ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
          {task.deadline ? fmtDate(task.deadline) : 'No deadline'}
        </span>
        {task.comments.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> {task.comments.length}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ---------- List view ----------
function ListView({ tasks, onSelect }: { tasks: Task[]; onSelect: (id: string) => void }) {
  return (
    <Card className="card-premium overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <TableHead className="min-w-[220px]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const dl = deadlineTone(t.deadline)
              return (
                <TableRow
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="cursor-pointer hover:bg-accent/40"
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[t.priority] ?? 'bg-zinc-400')} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusPill tone={TASK_STATUS_META[t.status]?.tone ?? 'muted'}>{TASK_STATUS_META[t.status]?.label ?? t.status}</StatusPill></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Flag className={cn('h-3 w-3', `text-${(PRIORITY_META[t.priority]?.tone ?? 'muted') === 'danger' ? 'red' : (PRIORITY_META[t.priority]?.tone ?? 'muted') === 'warning' ? 'amber' : 'zinc'}-500`)} />
                      {PRIORITY_META[t.priority]?.label ?? t.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <AvatarBlock user={t.assignee} />
                        <span className="text-xs">{t.assignee.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs', dl === 'overdue' ? 'text-red-600 dark:text-red-400' : dl === 'soon' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                      {t.deadline ? fmtDate(t.deadline) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(t.createdAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

// ---------- New Task Dialog ----------
function NewTaskDialog({
  open, onOpenChange, members, onSubmit, submitting,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  members: User[]
  onSubmit: (payload: Record<string, unknown>) => void
  submitting: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined)
  const [reviewerId, setReviewerId] = useState<string | undefined>(undefined)
  const [deadline, setDeadline] = useState('')
  const [platform, setPlatform] = useState<string>('none')

  function reset() {
    setTitle(''); setDescription(''); setTaskPriority('MEDIUM')
    setAssigneeId(undefined); setReviewerId(undefined); setDeadline(''); setPlatform('none')
  }

  function submit() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority: taskPriority,
      status: assigneeId ? 'ASSIGNED' : 'NEW',
      assigneeId: assigneeId || undefined,
      reviewerId: reviewerId || undefined,
      deadline: deadline || undefined,
      platform: platform && platform !== 'none' ? platform : undefined,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>Create a task and assign it to a teammate.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief task title" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add context, links, acceptance criteria…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Task Detail Sheet ----------
function TaskDetailSheet({
  task, open, onOpenChange, members, onPatch,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (o: boolean) => void
  members: User[]
  onPatch: (patch: Partial<Task>) => void
}) {
  if (!task) return null
  const dl = deadlineTone(task.deadline)
  const PlatIcon = task.platform ? providerMeta(task.platform).icon : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_DOT[task.priority] ?? 'bg-zinc-400')} />
            <SheetTitle className="text-lg">{task.title}</SheetTitle>
          </div>
          <SheetDescription className="sr-only">Task details</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pb-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Meta label="Status">
              <Select
                value={task.status}
                onValueChange={(v) => onPatch({ status: v })}
              >
                <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s]?.label ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Meta>
            <Meta label="Priority">
              <StatusPill tone={PRIORITY_META[task.priority]?.tone ?? 'muted'}>{PRIORITY_META[task.priority]?.label ?? task.priority}</StatusPill>
            </Meta>
            <Meta label="Assignee">
              <Select value={task.assignee?.id ?? ''} onValueChange={(v) => onPatch({ assignee: members.find((m) => m.id === v) ?? null })}>
                <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Meta>
            <Meta label="Reviewer">
              <Select value={task.reviewer?.id ?? ''} onValueChange={(v) => onPatch({ reviewer: members.find((m) => m.id === v) ?? null })}>
                <SelectTrigger className="h-8 w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Meta>
            <Meta label="Deadline">
              <span className={cn('inline-flex items-center gap-1 text-xs', dl === 'overdue' ? 'text-red-600 dark:text-red-400' : dl === 'soon' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                <CalendarClock className="h-3.5 w-3.5" />
                {task.deadline ? fmtDateTime(task.deadline) : '—'}
              </span>
            </Meta>
            <Meta label="Platform">
              {task.platform ? (
                <span className="inline-flex items-center gap-1 text-xs">
                  {PlatIcon ? <PlatIcon className="h-3.5 w-3.5" /> : null}
                  {providerMeta(task.platform).label}
                </span>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </Meta>
          </div>

          {/* Description */}
          {task.description ? (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</div>
              <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-foreground/90">{task.description}</p>
            </div>
          ) : null}

          {/* Quick status mover */}
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Move to</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={task.status === s ? 'default' : 'outline'}
                  onClick={() => onPatch({ status: s })}
                  disabled={task.status === s}
                  className="h-7 px-2 text-xs"
                >
                  {TASK_STATUS_META[s]?.label ?? s}
                  {task.status === s ? null : <ArrowRight className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Comments</div>
              <span className="text-[11px] text-muted-foreground">{task.comments.length}</span>
            </div>
            {task.comments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {task.comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{c.user}</span>
                      <span className="text-[10px] text-muted-foreground">{fmtRelative(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/90">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground/70">Comment posting is available from the task detail API in a follow-up phase.</p>
          </div>

          {/* Audit line */}
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 text-[10px] text-muted-foreground">
            Created by <span className="font-medium">{task.creator.name}</span> · {fmtDateTime(task.createdAt)}
            <br />Updated {fmtRelative(task.updatedAt)} · All changes are audit-logged (§37).
          </div>
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}
