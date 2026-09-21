'use client'

import { useAppStore, type ViewId, ROLE_LABELS } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, ListTodo, CalendarDays, PenSquare, FolderOpen, Share2,
  Inbox, BarChart3, FileText, ClipboardCheck, Users, Mail, Bell, ScrollText,
  Settings, ChevronLeft, ChevronRight, HelpCircle, LogOut, Building2, Shield,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Image from 'next/image'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
  badge?: 'notifications' | 'approvals' | 'tasks'
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, group: 'Overview', badge: 'tasks' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, group: 'Overview' },
  { id: 'composer', label: 'Composer', icon: PenSquare, group: 'Content' },
  { id: 'content-library', label: 'Content Library', icon: FolderOpen, group: 'Content' },
  { id: 'social-accounts', label: 'Social Accounts', icon: Share2, group: 'Content' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, group: 'Engagement' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Engagement' },
  { id: 'reports', label: 'Reports', icon: FileText, group: 'Engagement' },
  { id: 'approvals', label: 'Approvals', icon: ClipboardCheck, group: 'Team', badge: 'approvals' },
  { id: 'team', label: 'Team', icon: Users, group: 'Team' },
  { id: 'mail-center', label: 'Mail Center', icon: Mail, group: 'Organization' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Organization', badge: 'notifications' },
  { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, group: 'Organization' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Organization' },
]

const GROUPS = ['Overview', 'Content', 'Engagement', 'Team', 'Organization']

export function Sidebar() {
  const { view, sidebarCollapsed, setView, toggleSidebar } = useAppStore()
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await fetch('/api/v1/me')
      const j = await r.json()
      return j.data
    },
  })
  const { data: notif } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const r = await fetch('/api/v1/notifications')
      const j = await r.json()
      return j.data as { unread: number }
    },
    refetchInterval: 30_000,
  })

  const badgeCount: Record<string, number> = {
    notifications: notif?.unread ?? 0,
    approvals: 1, // demo
    tasks: 6, // demo
  }

  return (
    <aside
      className={cn(
        'glass-subtle flex h-full flex-col border-r border-border/60 transition-[width] duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-border/60">
          <Image
            src="/socialhub-logo.jpg"
            alt="SocialHub"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
            priority
          />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">SocialHub</div>
            <div className="truncate text-[11px] text-muted-foreground">One Platform, Total Control</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden h-7 w-7 text-muted-foreground hover:text-foreground lg:flex"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-3 py-2">
        {GROUPS.map((group) => {
          const items = NAV.filter((n) => n.group === group)
          return (
            <div key={group}>
              {!sidebarCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = view === item.id
                  const Icon = item.icon
                  const count = item.badge ? badgeCount[item.badge] : 0
                  const inner = (
                    <button
                      onClick={() => setView(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        sidebarCollapsed && 'justify-center px-2',
                        active
                          ? 'bg-accent text-accent-foreground nav-item-active'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent-emerald' : '')} />
                      {!sidebarCollapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                      {!sidebarCollapsed && count > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-emerald/15 px-1.5 text-[10px] font-semibold text-accent-emerald ring-1 ring-inset ring-accent-emerald/25">
                          {count}
                        </span>
                      )}
                      {sidebarCollapsed && count > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                      )}
                    </button>
                  )
                  if (sidebarCollapsed) {
                    return (
                      <TooltipProvider key={item.id} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>{inner}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  }
                  return <div key={item.id}>{inner}</div>
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer — user */}
      <div className="border-t border-border/60 p-3">
        <div className={cn('flex items-center gap-3 rounded-xl p-2', !sidebarCollapsed && 'bg-muted/40')}>
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background">
            <AvatarImage src={me?.user?.avatarUrl} />
            <AvatarFallback className="bg-accent-emerald/20 text-xs font-semibold text-accent-emerald">
              {(me?.user?.name ?? 'AD').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{me?.user?.name ?? '—'}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {me?.user?.role ? ROLE_LABELS[me.user.role as keyof typeof ROLE_LABELS] : '—'} · {me?.workspace?.name ?? '—'}
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Help">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={() => setView('settings')}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Building2 className="h-3 w-3" />
            Switch workspace
          </button>
        )}
      </div>
    </aside>
  )
}
