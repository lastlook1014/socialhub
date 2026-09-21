'use client'

import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { CommandPalette } from '@/components/shell/command-palette'
import { DashboardView } from '@/components/views/dashboard-view'
import { SocialAccountsView } from '@/components/views/social-accounts-view'
import { ComposerView } from '@/components/views/composer-view'
import { CalendarView } from '@/components/views/calendar-view'
import { ContentLibraryView } from '@/components/views/content-library-view'
import { TasksView } from '@/components/views/tasks-view'
import { ApprovalsView } from '@/components/views/approvals-view'
import { InboxView } from '@/components/views/inbox-view'
import { AnalyticsView } from '@/components/views/analytics-view'
import { ReportsView } from '@/components/views/reports-view'
import { TeamView } from '@/components/views/team-view'
import { MailCenterView } from '@/components/views/mail-center-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { AuditLogsView } from '@/components/views/audit-logs-view'
import { SettingsView } from '@/components/views/settings-view'
import { Suspense, useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">SocialHub</span>
          <span className="text-muted-foreground/60">·</span>
          <span>One Platform, Total Control</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>Social integrations: <span className="font-medium text-amber-600 dark:text-amber-400">DEMO</span></span>
          <span className="text-muted-foreground/60">·</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  )
}

function ViewRouter() {
  const { view } = useAppStore()
  switch (view) {
    case 'dashboard': return <DashboardView />
    case 'social-accounts': return <SocialAccountsView />
    case 'composer': return <ComposerView />
    case 'calendar': return <CalendarView />
    case 'content-library': return <ContentLibraryView />
    case 'tasks': return <TasksView />
    case 'approvals': return <ApprovalsView />
    case 'inbox': return <InboxView />
    case 'analytics': return <AnalyticsView />
    case 'reports': return <ReportsView />
    case 'team': return <TeamView />
    case 'mail-center': return <MailCenterView />
    case 'notifications': return <NotificationsView />
    case 'audit-logs': return <AuditLogsView />
    case 'settings': return <SettingsView />
    default: return <DashboardView />
  }
}

export default function Home() {
  // Scroll to top on view change for better UX
  const view = useAppStore((s) => s.view)
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>
        <div id="main-scroll" className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
          <Topbar />
          <main className="flex-1">
            <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
              <ViewRouter />
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
      <CommandPalette />
    </TooltipProvider>
  )
}
