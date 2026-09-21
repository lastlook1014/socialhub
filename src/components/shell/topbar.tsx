'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { Search, Bell, Sun, Moon, Command, Plus, Menu, PanelLeft } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fmtRelative } from '@/lib/meta'
import { useRouter } from 'next/navigation'
import {
  Sheet, SheetContent, SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from './sidebar'

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Operational overview of your social command center' },
  tasks: { title: 'Tasks', subtitle: 'Manage team work, assignments and deadlines' },
  calendar: { title: 'Content Calendar', subtitle: 'Plan, schedule and review your publishing pipeline' },
  composer: { title: 'Composer', subtitle: 'Create, preview and schedule multi-account posts' },
  'content-library': { title: 'Content Library', subtitle: 'Your enterprise media and reusable assets' },
  'social-accounts': { title: 'Social Accounts', subtitle: 'Connect, monitor and manage authorized accounts' },
  inbox: { title: 'Unified Inbox', subtitle: 'Comments, mentions and messages across platforms' },
  analytics: { title: 'Analytics', subtitle: 'Normalized cross-platform performance metrics' },
  reports: { title: 'Reports', subtitle: 'Build, schedule and export performance reports' },
  approvals: { title: 'Approvals', subtitle: 'Review and approve content before publishing' },
  team: { title: 'Team', subtitle: 'Members, roles, permissions and performance' },
  'mail-center': { title: 'Mail Center', subtitle: 'Organization mail infrastructure and mailboxes' },
  notifications: { title: 'Notifications', subtitle: 'Stay on top of operational events' },
  'audit-logs': { title: 'Audit Logs', subtitle: 'Immutable record of sensitive actions' },
  settings: { title: 'Settings', subtitle: 'Workspace, security and integration preferences' },
}

export function Topbar() {
  const { view, setView, setCommandOpen, toggleSidebar } = useAppStore()
  const { theme, setTheme } = useTheme()
  const qc = useQueryClient()

  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await fetch('/api/v1/notifications')
      const j = await r.json()
      return j.data as { notifications: any[]; unread: number }
    },
    refetchInterval: 30_000,
  })

  const meta = VIEW_TITLES[view] ?? { title: 'SocialHub', subtitle: 'One Platform, Total Control' }

  return (
    <header className="glass-subtle sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 sm:px-6">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">{meta.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="w-32 text-left lg:w-40">Search…</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCommandOpen(true)} aria-label="Search">
        <Search className="h-5 w-5" />
      </Button>

      {/* Quick create */}
      <Button
        size="sm"
        className="hidden gap-1.5 sm:flex"
        onClick={() => setView('composer')}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">Create</span>
      </Button>

      {/* Theme */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {(notif?.unread ?? 0) > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-emerald opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-emerald" />
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5 text-sm">
            Notifications
            {notif && notif.unread > 0 && (
              <button
                className="text-xs text-accent-emerald hover:underline"
                onClick={async () => {
                  await fetch('/api/v1/notifications', { method: 'PATCH', body: JSON.stringify({ read: true }), headers: { 'Content-Type': 'application/json' } })
                  qc.invalidateQueries({ queryKey: ['notifications'] })
                  qc.invalidateQueries({ queryKey: ['notifications-count'] })
                }}
              >
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {(notif?.notifications ?? []).slice(0, 8).map((n: any) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 px-3 py-2.5">
                <div className="flex w-full items-center gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-emerald" />}
                  <span className="flex-1 text-sm font-medium text-foreground">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtRelative(n.createdAt)}</span>
                </div>
                {n.body && <p className="pl-3.5 text-xs text-muted-foreground">{n.body}</p>}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="justify-center text-sm text-accent-emerald"
            onClick={() => setView('notifications')}
          >
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full ring-2 ring-background transition-shadow hover:ring-accent-emerald/40">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://i.pravatar.cc/120?img=47" />
              <AvatarFallback className="bg-accent-emerald/20 text-xs font-semibold text-accent-emerald">AR</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Aisha Rahman</span>
              <span className="text-xs font-normal text-muted-foreground">admin@northwind.io</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setView('settings')}>Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setView('audit-logs')}>Audit Logs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setView('team')}>Team</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
