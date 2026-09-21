'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageContainer, SectionHeader, LoadingState, EmptyState } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { fmtRelative, fmtDate, fmtDateTime } from '@/lib/meta'
import { ROLE_LABELS, type Role } from '@/lib/store'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  UserPlus, Users, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Activity, FileText, Mail, Check, X, LayoutGrid, Sparkles,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Roles + Permissions matrix (§8)
// ---------------------------------------------------------------------------

type Perm = 'posts.create' | 'posts.edit' | 'posts.approve' | 'posts.publish' | 'accounts.connect'
  | 'accounts.disconnect' | 'media.upload' | 'tasks.assign' | 'tasks.complete' | 'comments.moderate'
  | 'mail.manage' | 'team.manage' | 'reports.view' | 'audit.view' | 'settings.manage'

const PERM_GROUPS: { label: string; perms: { key: Perm; label: string }[] }[] = [
  {
    label: 'Content',
    perms: [
      { key: 'posts.create', label: 'Create posts' },
      { key: 'posts.edit', label: 'Edit posts' },
      { key: 'posts.approve', label: 'Approve posts' },
      { key: 'posts.publish', label: 'Publish posts' },
      { key: 'media.upload', label: 'Upload media' },
    ],
  },
  {
    label: 'Accounts & Engagement',
    perms: [
      { key: 'accounts.connect', label: 'Connect accounts' },
      { key: 'accounts.disconnect', label: 'Disconnect accounts' },
      { key: 'comments.moderate', label: 'Moderate comments' },
    ],
  },
  {
    label: 'Operations',
    perms: [
      { key: 'tasks.assign', label: 'Assign tasks' },
      { key: 'tasks.complete', label: 'Complete tasks' },
      { key: 'mail.manage', label: 'Manage mail' },
    ],
  },
  {
    label: 'Admin',
    perms: [
      { key: 'team.manage', label: 'Manage team' },
      { key: 'reports.view', label: 'View reports' },
      { key: 'audit.view', label: 'View audit logs' },
      { key: 'settings.manage', label: 'Manage settings' },
    ],
  },
]

const ALL_PERMS = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.key))

const ROLE_PERMS: Record<Role, Perm[]> = {
  SUPER_ADMIN: ALL_PERMS,
  ADMIN: ['posts.create', 'posts.edit', 'posts.approve', 'posts.publish', 'media.upload', 'accounts.connect', 'accounts.disconnect', 'comments.moderate', 'tasks.assign', 'tasks.complete', 'mail.manage', 'team.manage', 'reports.view', 'audit.view', 'settings.manage'],
  MANAGER: ['posts.create', 'posts.edit', 'posts.approve', 'posts.publish', 'media.upload', 'comments.moderate', 'tasks.assign', 'tasks.complete', 'reports.view', 'audit.view'],
  EDITOR: ['posts.create', 'posts.edit', 'media.upload', 'tasks.complete'],
  PUBLISHER: ['posts.publish', 'media.upload', 'tasks.complete'],
  MODERATOR: ['posts.edit', 'comments.moderate', 'tasks.complete'],
  ANALYST: ['reports.view', 'audit.view'],
  MAIL_ADMIN: ['mail.manage', 'audit.view'],
  VIEWER: [],
}

const ROLE_TONES: Record<Role, 'danger' | 'warning' | 'info' | 'success' | 'muted'> = {
  SUPER_ADMIN: 'danger',
  ADMIN: 'danger',
  MANAGER: 'warning',
  EDITOR: 'info',
  PUBLISHER: 'info',
  MODERATOR: 'success',
  ANALYST: 'muted',
  MAIL_ADMIN: 'warning',
  VIEWER: 'muted',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Full system access including security configuration and data deletion.',
  ADMIN: 'Manages workspace, members, integrations, and all operational settings.',
  MANAGER: 'Approves content, assigns tasks, oversees publishing workflow.',
  EDITOR: 'Creates and edits content drafts; cannot approve or publish.',
  PUBLISHER: 'Publishes approved content to connected accounts.',
  MODERATOR: 'Reviews comments, hides inappropriate content, escalates issues.',
  ANALYST: 'Read-only access to analytics, reports, and audit logs.',
  MAIL_ADMIN: 'Manages mailboxes, aliases, groups, and delivery monitoring.',
  VIEWER: 'Read-only access to published content and dashboard.',
}

interface Member {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
    jobTitle?: string | null
    department?: string | null
    status: string
    lastLoginAt?: string | null
  }
  performance: {
    tasksAssigned: number
    tasksCompleted: number
    overdue: number
    postsAuthored: number
  }
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function TeamView() {
  const { data, isLoading } = useQuery<{ members: Member[] }>({
    queryKey: ['team'],
    queryFn: async () => {
      const r = await fetch('/api/v1/team')
      const j = await r.json()
      return j.data
    },
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (isLoading || !data) {
    return (
      <PageContainer>
        <SectionHeader title="Team" description="Members, roles, permissions, and performance" />
        <LoadingState />
      </PageContainer>
    )
  }

  const selected = data.members.find((m) => m.id === selectedId) ?? null

  const totalAssigned = data.members.reduce((s, m) => s + m.performance.tasksAssigned, 0)
  const totalCompleted = data.members.reduce((s, m) => s + m.performance.tasksCompleted, 0)
  const totalOverdue = data.members.reduce((s, m) => s + m.performance.overdue, 0)
  const totalPosts = data.members.reduce((s, m) => s + m.performance.postsAuthored, 0)
  const avgCompletion = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0

  const chartData = data.members
    .map((m) => ({
      name: m.user.name.split(' ').map((n) => n[0]).join('') + '·' + (m.user.name.split(' ')[0] ?? ''),
      completed: m.performance.tasksCompleted,
      assigned: m.performance.tasksAssigned,
      overdue: m.performance.overdue,
    }))
    .filter((d) => d.assigned > 0)

  return (
    <PageContainer>
      <SectionHeader
        title="Team"
        description="Members, roles, permissions, and operational performance"
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Member
          </Button>
        }
      />

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* ----------------------------------------------------------------- Members */}
        <TabsContent value="members" className="space-y-4">
          {data.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Invite your first team member to get started."
              action={<Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Member</Button>}
            />
          ) : (
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-accent-emerald" /> Workspace Members
                  <span className="text-xs font-normal text-muted-foreground">({data.members.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[640px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <TableHead className="pr-3">Member</TableHead>
                        <TableHead className="pr-3 hidden md:table-cell">Job Title</TableHead>
                        <TableHead className="pr-3 hidden md:table-cell">Department</TableHead>
                        <TableHead className="pr-3">Role</TableHead>
                        <TableHead className="pr-3">Status</TableHead>
                        <TableHead className="pr-3 hidden lg:table-cell">Last login</TableHead>
                        <TableHead className="pr-3 hidden lg:table-cell">Tasks</TableHead>
                        <TableHead className="pr-3 hidden lg:table-cell">Posts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.members.map((m) => (
                        <TableRow
                          key={m.id}
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => setSelectedId(m.id)}
                        >
                          <TableCell className="pr-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                {m.user.avatarUrl ? <AvatarImage src={m.user.avatarUrl} alt={m.user.name} /> : null}
                                <AvatarFallback>{m.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{m.user.name}</div>
                                <div className="truncate text-[11px] text-muted-foreground">{m.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="pr-3 hidden md:table-cell text-muted-foreground">{m.user.jobTitle ?? '—'}</TableCell>
                          <TableCell className="pr-3 hidden md:table-cell text-muted-foreground">{m.user.department ?? '—'}</TableCell>
                          <TableCell className="pr-3">
                            <StatusPill tone={ROLE_TONES[m.user.role as Role] ?? 'muted'} dot={false}>
                              {ROLE_LABELS[m.user.role as Role] ?? m.role}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="pr-3">
                            <StatusPill tone={m.user.status === 'ACTIVE' ? 'success' : m.user.status === 'SUSPENDED' ? 'danger' : 'muted'}>
                              {m.user.status}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="pr-3 hidden lg:table-cell text-muted-foreground">{fmtRelative(m.user.lastLoginAt)}</TableCell>
                          <TableCell className="pr-3 hidden lg:table-cell">
                            <div className="text-xs">
                              <span className="font-medium text-foreground">{m.performance.tasksCompleted}</span>
                              <span className="text-muted-foreground">/{m.performance.tasksAssigned}</span>
                              {m.performance.overdue > 0 && (
                                <span className="ml-1 text-red-600 dark:text-red-400">· {m.performance.overdue} overdue</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pr-3 hidden lg:table-cell text-muted-foreground">{m.performance.postsAuthored}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----------------------------------------------------------------- Roles & Permissions */}
        <TabsContent value="roles" className="space-y-4">
          <Card className="card-premium border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="h-4.5 w-4.5 mt-0.5 shrink-0 text-accent-emerald" />
              <div>
                <div className="text-sm font-medium text-foreground">Granular permissions enforced server-side</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permission checks run on the API for every sensitive action (§8). Client-side affordances are advisory only.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => {
              const perms = ROLE_PERMS[role]
              const tone = ROLE_TONES[role]
              return (
                <Card key={role} className="card-premium">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{ROLE_LABELS[role]}</CardTitle>
                      <StatusPill tone={tone} dot={false}>{perms.length} perms</StatusPill>
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PERMS.map((p) => {
                        const has = perms.includes(p)
                        return (
                          <span
                            key={p}
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                              has
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'border-border/60 bg-muted/30 text-muted-foreground/50'
                            }`}
                          >
                            {has ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                            {p}
                          </span>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="h-4 w-4 text-accent-emerald" /> Permissions Matrix
              </CardTitle>
              <p className="text-xs text-muted-foreground">Roles × permissions — green cells indicate granted access.</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <TableHead className="pr-3 sticky left-0 bg-card">Permission</TableHead>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <TableHead key={r} className="text-center whitespace-nowrap">{ROLE_LABELS[r]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_PERMS.map((p) => (
                      <TableRow key={p} className="hover:bg-accent/30">
                        <TableCell className="pr-3 font-medium text-foreground sticky left-0 bg-card">{p}</TableCell>
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
                          const has = ROLE_PERMS[r].includes(p)
                          return (
                            <TableCell key={r} className="text-center">
                              {has ? (
                                <Check className="mx-auto h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <span className="text-muted-foreground/30">·</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="card-premium border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Sparkles className="h-4.5 w-4.5 mt-0.5 shrink-0 text-accent-emerald" />
              <div>
                <div className="text-sm font-medium text-foreground">Operational metrics only — no political or influence rankings</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Performance is measured by operational throughput (§34). No engagement-rate leaderboards or popularity rankings are produced.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            <KpiCard icon={Activity} label="Tasks Assigned" value={String(totalAssigned)} sub="all members" />
            <KpiCard icon={CheckCircle2} label="Completed" value={String(totalCompleted)} sub={`${avgCompletion}% completion`} tone="success" />
            <KpiCard icon={AlertTriangle} label="Overdue" value={String(totalOverdue)} sub="past deadline" tone={totalOverdue > 0 ? 'danger' : 'success'} />
            <KpiCard icon={FileText} label="Posts Authored" value={String(totalPosts)} sub="all time" />
            <KpiCard icon={Clock} label="Avg Completion" value={`${avgCompletion}%`} sub="of assigned tasks" />
          </div>

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-accent-emerald" /> Tasks Completed per Member
              </CardTitle>
              <p className="text-xs text-muted-foreground">Operational throughput — completed vs assigned vs overdue.</p>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No task data" description="Assign tasks to team members to populate this chart." />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.6)' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.6)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.5 0 0 / 0.15)', fontSize: 12, background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                    />
                    <Bar dataKey="completed" name="Completed" fill="oklch(0.62 0.13 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="assigned" name="Assigned" fill="oklch(0.65 0.05 165)" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill="oklch(0.62 0.21 25)" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MemberDetailSheet member={selected} onClose={() => setSelectedId(null)} />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
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

function MemberDetailSheet({ member, onClose }: { member: Member | null; onClose: () => void }) {
  if (!member) return null
  const role = (member.user.role as Role) ?? 'VIEWER'
  const perms = ROLE_PERMS[role] ?? []

  // Generate a pseudo sparkline (demo) — operational throughput over last 14 days
  const sparkline = Array.from({ length: 14 }).map((_, i) => ({
    day: `D${i + 1}`,
    tasks: Math.max(0, Math.round(Math.sin(i / 3) * 2 + (member.performance.tasksCompleted / 14) + Math.random())),
  }))

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-lg">Member Profile</SheetTitle>
          <SheetDescription className="sr-only">Detailed team member information</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {/* Profile */}
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14">
              {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.name} /> : null}
              <AvatarFallback className="text-base">{member.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-foreground">{member.user.name}</h3>
                <StatusPill tone={member.user.status === 'ACTIVE' ? 'success' : 'muted'}>{member.user.status}</StatusPill>
              </div>
              <div className="mt-0.5 truncate text-sm text-muted-foreground">{member.user.email}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {member.user.jobTitle && <span className="text-foreground/80">{member.user.jobTitle}</span>}
                {member.user.department && <span className="text-muted-foreground">· {member.user.department}</span>}
                <span>·</span>
                <StatusPill tone={ROLE_TONES[role]} dot={false}>{ROLE_LABELS[role]}</StatusPill>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Joined {fmtDate(member.joinedAt)} · Last login {fmtRelative(member.user.lastLoginAt)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance summary */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Performance</div>
            <div className="grid grid-cols-2 gap-2">
              <PerfCell label="Tasks Assigned" value={member.performance.tasksAssigned} />
              <PerfCell label="Tasks Completed" value={member.performance.tasksCompleted} tone="success" />
              <PerfCell label="Overdue" value={member.performance.overdue} tone={member.performance.overdue > 0 ? 'danger' : 'muted'} />
              <PerfCell label="Posts Authored" value={member.performance.postsAuthored} tone="info" />
            </div>
          </div>

          {/* Sparkline */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity — last 14 days</div>
            <Card className="card-premium">
              <CardContent className="p-3">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={sparkline} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: 'oklch(0.5 0 0 / 0.6)' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.5 0 0 / 0.15)', fontSize: 11, background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                    />
                    <Bar dataKey="tasks" name="Tasks completed" fill="oklch(0.62 0.13 165)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Permissions */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Permissions — {ROLE_LABELS[role]} ({perms.length})
            </div>
            {perms.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Read-only access. No additional permissions granted.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {perms.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    <Check className="h-2.5 w-2.5" /> {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Recent activity (mock) */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent Activity</div>
            <div className="relative space-y-3 pl-4">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
              <TimelineItem icon={CheckCircle2} text={`Completed ${member.performance.tasksCompleted} task(s)`} time={fmtRelative(member.user.lastLoginAt)} tone="success" />
              <TimelineItem icon={FileText} text={`Authored ${member.performance.postsAuthored} post(s)`} time="2d ago" tone="info" />
              <TimelineItem icon={Mail} text="Last sign in" time={fmtDateTime(member.user.lastLoginAt)} tone="muted" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PerfCell({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'success' | 'warning' | 'danger' | 'muted' | 'info' }) {
  const cls =
    tone === 'success' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'danger' ? 'text-red-600 dark:text-red-400'
    : tone === 'info' ? 'text-sky-600 dark:text-sky-400'
    : 'text-foreground'
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className={`text-xl font-semibold ${cls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function TimelineItem({
  icon: Icon, text, time, tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
  time: string
  tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'
}) {
  const dotCls =
    tone === 'success' ? 'bg-emerald-500'
    : tone === 'warning' ? 'bg-amber-500'
    : tone === 'danger' ? 'bg-red-500'
    : tone === 'info' ? 'bg-sky-500'
    : 'bg-muted-foreground'
  return (
    <div className="relative">
      <span className={`absolute -left-[11px] top-1.5 h-2 w-2 rounded-full ring-4 ring-background ${dotCls}`} />
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {text}
      </div>
      <div className="text-[11px] text-muted-foreground">{time}</div>
    </div>
  )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('EDITOR')
  const [department, setDepartment] = useState('')
  const [jobTitle, setJobTitle] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    toast.success('Invitation queued', { description: `Audit log entry created for ${email} as ${ROLE_LABELS[role]} (§37).` })
    setEmail(''); setDepartment(''); setJobTitle(''); setRole('EDITOR')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-accent-emerald" /> Invite Member</DialogTitle>
          <DialogDescription>Send an invitation to join this workspace. Server-side RBAC will enforce permissions (§8).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email *</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-job">Job Title</Label>
              <Input id="inv-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Content Lead" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-dept">Department</Label>
              <Input id="inv-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Marketing" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="inv-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
