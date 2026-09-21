'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { PageContainer, SectionHeader } from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { providerMeta } from '@/lib/meta'
import {
  User, Building2, ShieldCheck, Plug, Bell, Palette, Database,
  Sun, Moon, Monitor, Upload, Key, Trash2, LogOut, History, Plus, Copy,
  Check, ChevronRight, Lock, Save, ExternalLink, Download,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Integrations list (DEMO mode)
// ---------------------------------------------------------------------------

const PROVIDERS = ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'threads', 'pinterest'] as const

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function SettingsView() {
  return (
    <PageContainer>
      <SectionHeader
        title="Settings"
        description="Manage your profile, workspace, security, and integrations"
      />

      <Tabs defaultValue="profile" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max">
            <TabsTrigger value="profile"><User className="mr-1.5 h-3.5 w-3.5" /> Profile</TabsTrigger>
            <TabsTrigger value="workspace"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Workspace</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="integrations"><Plug className="mr-1.5 h-3.5 w-3.5" /> Integrations</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="mr-1.5 h-3.5 w-3.5" /> Appearance</TabsTrigger>
            <TabsTrigger value="privacy"><Database className="mr-1.5 h-3.5 w-3.5" /> Data & Privacy</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="workspace" className="mt-4">
          <WorkspaceTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="privacy" className="mt-4">
          <PrivacyTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfileTab() {
  const [name, setName] = useState('Aisha Rahman')
  const [email, setEmail] = useState('admin@northwind.io')
  const [jobTitle, setJobTitle] = useState('Head of Communications')
  const [department, setDepartment] = useState('Executive')
  const [bio, setBio] = useState('Leading the social operations team with a focus on transparency, security, and measurable outcomes.')

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Profile saved', { description: 'Audit log recorded (§37).' })
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-accent-emerald" /> Profile</CardTitle>
          <CardDescription>Your personal information visible to other workspace members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://i.pravatar.cc/120?img=47" alt={name} />
              <AvatarFallback className="text-lg">{name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => toast.info('Avatar upload simulated in demo')}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload new
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 2 MB.</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name">Full Name</Label>
              <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-email">Email</Label>
              <Input id="pf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-job">Job Title</Label>
              <Input id="pf-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-dept">Department</Label>
              <Input id="pf-dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-bio">Bio</Label>
            <Textarea id="pf-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Brief description for your team profile. {bio.length}/500 characters.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit"><Save className="mr-1.5 h-3.5 w-3.5" /> Save changes</Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

function WorkspaceTab() {
  const [name, setName] = useState('Northwind Communications')
  const [org, setOrg] = useState('Northwind, Inc.')
  const [plan, setPlan] = useState('Business')

  return (
    <div className="space-y-4">
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-accent-emerald" /> Workspace</CardTitle>
          <CardDescription>Manage workspace identity and organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-org">Organization</Label>
              <Input id="ws-org" value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Member Count</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">9 members</div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-plan">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id="ws-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace Switcher</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-emerald/15 text-accent-emerald font-semibold">N</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Northwind Communications</div>
                    <div className="text-[11px] text-muted-foreground">9 members · Business plan</div>
                  </div>
                </div>
                <StatusPill tone="success">Active</StatusPill>
              </div>
              <button
                type="button"
                onClick={() => toast.info('Workspace switching is simulated in demo')}
                className="flex w-full items-center justify-between rounded-lg border border-dashed border-border p-3 text-left transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Create or join another workspace</div>
                    <div className="text-[11px] text-muted-foreground">Switch context anytime</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium border-red-500/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-medium text-foreground">Delete this workspace</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All posts, tasks, mailboxes, and audit logs will be permanently erased after the 30-day retention window (§61).
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete workspace</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete workspace permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All posts, tasks, mailboxes, accounts, and audit logs associated with this workspace will be queued for permanent deletion after the retention window expires (§61). Type the workspace name to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input placeholder="Northwind Communications" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => toast.error('Deletion simulated in demo', { description: 'A real deletion would create an audit entry and start the §61 retention clock.' })}
                  >
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function SecurityTab() {
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [sessions, setSessions] = useState([
    { id: 's1', device: 'Chrome · macOS', location: 'San Francisco, US', ip: '10.0.0.5', current: true, lastActive: 'Active now' },
    { id: 's2', device: 'Safari · iPhone', location: 'San Francisco, US', ip: '10.0.0.8', current: false, lastActive: '2h ago' },
    { id: 's3', device: 'Firefox · Linux', location: 'Berlin, DE', ip: '10.0.1.2', current: false, lastActive: '3d ago' },
  ])
  const [apiKeys] = useState([
    { id: 'k1', label: 'Production webhook', prefix: 'cmdc_live_8x2k', created: '2025-09-01', lastUsed: '12m ago' },
    { id: 'k2', label: 'Analytics export', prefix: 'cmdc_live_3f7q', created: '2025-08-12', lastUsed: '5h ago' },
  ])

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      toast.error('Fill all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    toast.success('Password updated', { description: 'Audit log recorded (§37).' })
    setOldPassword(''); setNewPassword(''); setConfirmPassword('')
  }

  return (
    <div className="space-y-4">
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-accent-emerald" /> Authentication</CardTitle>
          <CardDescription>Two-factor authentication and password security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div>
              <div className="text-sm font-medium text-foreground">Multi-Factor Authentication (MFA)</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Require a second factor (TOTP) at sign-in. Strongly recommended for admin roles.
              </p>
            </div>
            <Switch checked={mfaEnabled} onCheckedChange={(v) => { setMfaEnabled(v); toast.info(`MFA ${v ? 'enabled' : 'disabled'}`, { description: 'Audit log recorded (§37).' }) }} />
          </div>

          <form onSubmit={submitPassword} className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="text-sm font-medium text-foreground">Change Password</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw-old">Current Password</Label>
                <Input id="pw-old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New Password</Label>
                <Input id="pw-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">Confirm New</Label>
                <Input id="pw-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="outline">Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-accent-emerald" /> Active Sessions</CardTitle>
          <CardDescription>Devices currently signed in. Revoke any you don't recognize.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.device}</span>
                      {s.current && <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">This device</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.location} · {s.ip} · {s.lastActive}</div>
                  </div>
                </div>
                {!s.current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSessions(sessions.filter((x) => x.id !== s.id))
                      toast.success('Session revoked', { description: 'Audit log recorded (§37).' })
                    }}
                  >
                    <LogOut className="mr-1.5 h-3.5 w-3.5" /> Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4 text-accent-emerald" /> API Keys</CardTitle>
          <CardDescription>Programmatic access tokens. Keys are masked after creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{k.label}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{k.prefix}••••••••</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(`${k.prefix}••••`).catch(() => {}); toast.info('Copied to clipboard (masked)') }}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Copy key"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Created {k.created} · Last used {k.lastUsed}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.error('Revoke simulated in demo')}>
                  Revoke
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={() => toast.success('New API key generated', { description: 'Copy shown once — stored encrypted at rest (§46).' })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Generate new key
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-accent-emerald" /> Login History</CardTitle>
          <CardDescription>Recent authentication events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">When</th>
                  <th className="pb-2 pr-3 font-medium">Method</th>
                  <th className="pb-2 pr-3 font-medium">IP</th>
                  <th className="pb-2 pr-3 font-medium">Location</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { when: '12m ago', method: 'Password + MFA', ip: '10.0.0.5', loc: 'San Francisco, US', ok: true },
                  { when: '5h ago', method: 'Password + MFA', ip: '10.0.0.5', loc: 'San Francisco, US', ok: true },
                  { when: '2d ago', method: 'Password', ip: '10.0.0.8', loc: 'San Francisco, US', ok: true },
                  { when: '5d ago', method: 'Password', ip: '10.0.1.2', loc: 'Berlin, DE', ok: false },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.when}</td>
                    <td className="py-2.5 pr-3">{r.method}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{r.ip}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.loc}</td>
                    <td className="py-2.5"><StatusPill tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'Success' : 'Failed'}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <Card className="card-premium border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Lock className="h-4.5 w-4.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-sm font-medium text-foreground">OAuth credentials not configured in sandbox</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All social integrations run in DEMO mode (§68/§69). Connect buttons simulate the OAuth flow — no live data is fetched or published.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const meta = providerMeta(p)
          const Icon = meta.icon
          return (
            <Card key={p} className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                      <StatusPill tone="warning" dot={false}>DEMO</StatusPill>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.info('OAuth flow simulated in demo', { description: `Would open ${meta.label} authorization dialog.` })}>
                    <Plug className="mr-1.5 h-3.5 w-3.5" /> Connect
                  </Button>
                  <Button size="sm" variant="ghost" disabled onClick={() => toast.error('Disconnect simulated in demo')}>
                    Disconnect
                  </Button>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Capabilities: publish, schedule, analytics, comments, webhooks (simulated)
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notifications (preferences)
// ---------------------------------------------------------------------------

function NotificationsTab() {
  const initial: Record<string, boolean> = {
    TASK_ASSIGNED: true,
    APPROVAL_REQUEST: true,
    PUBLISHED: true,
    FAILED: true,
    OAUTH_EXPIRED: true,
    PROVIDER_WARNING: true,
    RATE_LIMIT: true,
    MAIL_SECURITY: true,
    daily_digest: false,
    weekly_summary: true,
  }
  const [prefs, setPrefs] = useState(initial)

  const items: { key: string; label: string; desc: string }[] = [
    { key: 'TASK_ASSIGNED', label: 'Task assigned', desc: 'When a task is assigned to you.' },
    { key: 'APPROVAL_REQUEST', label: 'Approval request', desc: 'When a post awaits your approval.' },
    { key: 'PUBLISHED', label: 'Post published', desc: 'When a post you authored is published.' },
    { key: 'FAILED', label: 'Publication failed', desc: 'When publishing fails on any account.' },
    { key: 'OAUTH_EXPIRED', label: 'Connection expired', desc: 'When an OAuth token needs refresh.' },
    { key: 'PROVIDER_WARNING', label: 'Provider warning', desc: 'When a provider issues a warning.' },
    { key: 'RATE_LIMIT', label: 'Rate limit', desc: 'When approaching provider rate limits.' },
    { key: 'MAIL_SECURITY', label: 'Mail security', desc: 'Security events affecting mailboxes.' },
    { key: 'daily_digest', label: 'Daily digest', desc: 'One summary email per day.' },
    { key: 'weekly_summary', label: 'Weekly summary', desc: 'Operational summary every Monday.' },
  ]

  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-accent-emerald" /> Notification Preferences</CardTitle>
        <CardDescription>Choose which events trigger in-app and email notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.key} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
              <div>
                <div className="text-sm font-medium text-foreground">{it.label}</div>
                <div className="text-[11px] text-muted-foreground">{it.desc}</div>
              </div>
              <Switch
                checked={prefs[it.key]}
                onCheckedChange={(v) => {
                  setPrefs({ ...prefs, [it.key]: v })
                  toast.info(`${it.label} ${v ? 'enabled' : 'disabled'}`)
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success('Preferences saved')}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [sidebarDefault, setSidebarDefault] = useState<'expanded' | 'collapsed'>('expanded')

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="space-y-4">
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-accent-emerald" /> Theme</CardTitle>
          <CardDescription>Choose how Command Center looks to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon
              const active = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTheme(t.id); toast.info(`Theme: ${t.label}`) }}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:bg-accent/30'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t.label}</span>
                  {active && <Check className="h-3 w-3 text-accent-emerald" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Density</CardTitle>
          <CardDescription>Adjust spacing between elements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(['comfortable', 'compact'] as const).map((d) => {
              const active = density === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDensity(d); toast.info(`Density: ${d}`) }}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-border/60 bg-card/40 hover:bg-accent/30'
                  }`}
                >
                  <div className="text-sm font-medium capitalize text-foreground">{d}</div>
                  <div className="mt-1 space-y-1">
                    <div className={`h-1.5 w-full rounded ${d === 'comfortable' ? 'bg-muted' : 'bg-muted/60'}`} />
                    <div className={`h-1.5 w-2/3 rounded ${d === 'comfortable' ? 'bg-muted/70' : 'bg-muted/40'}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sidebar Default</CardTitle>
          <CardDescription>Default state of the sidebar on initial load.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(['expanded', 'collapsed'] as const).map((s) => {
              const active = sidebarDefault === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSidebarDefault(s); toast.info(`Sidebar: ${s}`) }}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-border/60 bg-card/40 hover:bg-accent/30'
                  }`}
                >
                  <span className="text-sm font-medium capitalize text-foreground">{s}</span>
                  {active && <Check className="h-3.5 w-3.5 text-accent-emerald" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data & Privacy
// ---------------------------------------------------------------------------

function PrivacyTab() {
  const [retention, setRetention] = useState('90')
  const [autoPurgeMedia, setAutoPurgeMedia] = useState(true)
  const [shareAnalytics, setShareAnalytics] = useState(false)

  return (
    <div className="space-y-4">
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-accent-emerald" /> Data Retention</CardTitle>
          <CardDescription>How long data is kept before automatic deletion (§61).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="retention">Retention window (days)</Label>
            <Select value={retention} onValueChange={setRetention}>
              <SelectTrigger id="retention" className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="forever">Indefinite</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Audit logs are exempt and retained indefinitely (§37).</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div>
              <div className="text-sm font-medium text-foreground">Auto-purge deleted media</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Permanently remove trashed media assets after retention expires.</p>
            </div>
            <Switch checked={autoPurgeMedia} onCheckedChange={setAutoPurgeMedia} />
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-accent-emerald" /> Access & Sharing</CardTitle>
          <CardDescription>Control how your data is used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div>
              <div className="text-sm font-medium text-foreground">Share anonymous usage analytics</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Help improve Command Center by sending anonymized telemetry.</p>
            </div>
            <Switch checked={shareAnalytics} onCheckedChange={setShareAnalytics} />
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <Lock className="inline h-3 w-3 mr-1" />
            Access to your workspace data is governed by RBAC (§8). Sensitive actions are recorded in the immutable audit log (§37).
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ExternalLink className="h-4 w-4 text-accent-emerald" /> Export & Deletion</CardTitle>
          <CardDescription>Exercise your data rights (§61).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Export my data</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Download all data associated with your account in JSON or CSV.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.info('Export queued', { description: 'You will receive a download link via email when ready.' })}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export my data
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Secure deletion policy</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Account deletion is queued immediately and completed within the retention window.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Request deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account and personal data will be queued for permanent deletion after the {retention}-day retention window (§61). Audit logs are exempt and retained indefinitely.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => toast.error('Deletion request simulated in demo')}
                  >
                    Request deletion
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Local import for Download icon (used in PrivacyTab) — moved to top imports
