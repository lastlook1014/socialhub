'use client'

import { useAppStore, type ViewId } from '@/lib/store'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Search, LayoutDashboard, ListTodo, CalendarDays, PenSquare, FolderOpen,
  Share2, Inbox, BarChart3, FileText, ClipboardCheck, Users, Mail, Bell,
  ScrollText, Settings, CornerDownLeft, ArrowRight,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  group: string
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setView } = useAppStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const go = (v: ViewId) => {
    setView(v)
    setCommandOpen(false)
    setQuery('')
    setActive(0)
  }

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'dashboard', label: 'Open Dashboard', icon: LayoutDashboard, action: () => go('dashboard'), group: 'Navigation' },
      { id: 'tasks', label: 'Open Tasks', icon: ListTodo, action: () => go('tasks'), group: 'Navigation' },
      { id: 'calendar', label: 'Open Calendar', icon: CalendarDays, action: () => go('calendar'), group: 'Navigation' },
      { id: 'inbox', label: 'Open Inbox', icon: Inbox, action: () => go('inbox'), group: 'Navigation' },
      { id: 'analytics', label: 'Open Analytics', icon: BarChart3, action: () => go('analytics'), group: 'Navigation' },
      { id: 'reports', label: 'Open Reports', icon: FileText, action: () => go('reports'), group: 'Navigation' },
      { id: 'approvals', label: 'Open Approvals', icon: ClipboardCheck, action: () => go('approvals'), group: 'Navigation' },
      { id: 'team', label: 'Open Team', icon: Users, action: () => go('team'), group: 'Navigation' },
      { id: 'mail-center', label: 'Open Mail Center', icon: Mail, action: () => go('mail-center'), group: 'Navigation' },
      { id: 'notifications', label: 'View Notifications', icon: Bell, action: () => go('notifications'), group: 'Navigation' },
      { id: 'audit-logs', label: 'View Audit Logs', icon: ScrollText, action: () => go('audit-logs'), group: 'Navigation' },
      { id: 'settings', label: 'Open Settings', icon: Settings, action: () => go('settings'), group: 'Navigation' },
    ]
    const actions: Command[] = [
      { id: 'create-post', label: 'Create Post', hint: 'Open composer', icon: PenSquare, action: () => go('composer'), group: 'Actions' },
      { id: 'create-task', label: 'Create Task', hint: 'Open tasks', icon: ListTodo, action: () => go('tasks'), group: 'Actions' },
      { id: 'connect-account', label: 'Connect Social Account', hint: 'Open accounts', icon: Share2, action: () => go('social-accounts'), group: 'Actions' },
      { id: 'create-mailbox', label: 'Create Mailbox', hint: 'Open mail center', icon: Mail, action: () => go('mail-center'), group: 'Actions' },
      { id: 'open-calendar', label: 'Open Calendar', icon: CalendarDays, action: () => go('calendar'), group: 'Actions' },
      { id: 'open-analytics', label: 'Open Analytics', icon: BarChart3, action: () => go('analytics'), group: 'Actions' },
      { id: 'open-content', label: 'Open Content Library', icon: FolderOpen, action: () => go('content-library'), group: 'Actions' },
      { id: 'switch-workspace', label: 'Switch Workspace', hint: 'Northwind · Marketing Ops', icon: Users, action: () => go('settings'), group: 'Actions' },
    ]
    return [...nav, ...actions]
  }, [])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [query, commands])

  const groups = useMemo(() => {
    const g: Record<string, Command[]> = {}
    for (const c of filtered) {
      if (!g[c.group]) g[c.group] = []
      g[c.group].push(c)
    }
    return g
  }, [filtered])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (commandOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActive((a) => Math.min(a + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActive((a) => Math.max(a - 1, 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          filtered[active]?.action()
        } else if (e.key === 'Escape') {
          setCommandOpen(false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commandOpen, filtered, active, setCommandOpen])

  useEffect(() => {
    if (commandOpen) setActive(0)
  }, [commandOpen, query])

  let idx = -1

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search and run actions across SocialHub</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type a command…"
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:flex">
            ESC
          </kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin p-2">
          {Object.keys(groups).length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results found</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group}
              </div>
              {items.map((c) => {
                idx++
                const isActive = idx === active
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={c.action}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{c.label}</span>
                    {c.hint && <span className="truncate text-xs text-muted-foreground">{c.hint}</span>}
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px]">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px]">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px]">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            SocialHub
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
