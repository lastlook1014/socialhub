'use client'

import { create } from 'zustand'

export type ViewId =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'composer'
  | 'content-library'
  | 'social-accounts'
  | 'inbox'
  | 'analytics'
  | 'reports'
  | 'approvals'
  | 'team'
  | 'mail-center'
  | 'notifications'
  | 'audit-logs'
  | 'settings'

interface AppState {
  view: ViewId
  subview: string | null
  sidebarCollapsed: boolean
  commandOpen: boolean
  theme: 'light' | 'dark'
  setView: (v: ViewId, sub?: string | null) => void
  toggleSidebar: () => void
  setCommandOpen: (open: boolean) => void
  setTheme: (t: 'light' | 'dark') => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  subview: null,
  sidebarCollapsed: false,
  commandOpen: false,
  theme: 'light',
  setView: (view, sub = null) => set({ view, subview: sub }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setTheme: (theme) => set({ theme }),
}))

// Role + permissions for the current session (demo: admin)
export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'EDITOR'
  | 'PUBLISHER'
  | 'MODERATOR'
  | 'ANALYST'
  | 'MAIL_ADMIN'
  | 'VIEWER'

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EDITOR: 'Editor',
  PUBLISHER: 'Publisher',
  MODERATOR: 'Moderator',
  ANALYST: 'Analyst',
  MAIL_ADMIN: 'Mail Admin',
  VIEWER: 'Viewer',
}
