'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isSameMonth, format, isToday, addWeeks, subWeeks, addMonths, subMonths,
  startOfDay, isWithinInterval,
} from 'date-fns'
import {
  PageContainer, SectionHeader, EmptyState, CardSkeleton,
} from '@/components/shared/layout'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { useAppStore } from '@/lib/store'
import { providerMeta, POST_STATUS_META, fmtDateTime, fmtDate } from '@/lib/meta'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange, Calendar as CalIcon,
  List, CalendarPlus, Clock, User, AlertCircle, RefreshCw,
} from 'lucide-react'

type CalendarItem = {
  id: string
  title: string | null
  caption: string
  status: string
  scheduledAt: string | null
  accountIds: string[]
  accounts: { id: string; provider: string; displayName: string; avatarUrl: string | null }[]
  author: { name: string; avatarUrl: string | null }
}

type View = 'month' | 'week' | 'day' | 'list'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function statusDotColor(status: string) {
  const m = POST_STATUS_META[status]
  if (!m) return 'bg-zinc-400'
  switch (m.tone) {
    case 'success': return 'bg-emerald-500'
    case 'warning': return 'bg-amber-500'
    case 'danger': return 'bg-red-500'
    case 'info': return 'bg-sky-500'
    default: return 'bg-zinc-400'
  }
}

export function CalendarView() {
  const qc = useQueryClient()
  const { setView: navigateView } = useAppStore()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(new Date())
  const [filters, setFilters] = useState({ platform: 'all', account: 'all', status: 'all' })
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined)

  const { data, isLoading } = useQuery<CalendarItem[]>({
    queryKey: ['calendar'],
    queryFn: async () => {
      const r = await fetch('/api/v1/calendar')
      const j = await r.json()
      return j.data as CalendarItem[]
    },
  })

  const rescheduleMut = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: Date }) => {
      const r = await fetch('/api/v1/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduledAt: date.toISOString() }),
      })
      const j = await r.json()
      return j.data
    },
    onSuccess: (data) => {
      if (data?.post) {
        toast.success('Post rescheduled', {
          description: `Moved to ${fmtDateTime(rescheduleDate!)}`,
        })
        qc.invalidateQueries({ queryKey: ['calendar'] })
      } else {
        toast.error('Could not reschedule post')
      }
      setRescheduleId(null)
      setRescheduleDate(undefined)
    },
    onError: () => {
      toast.error('Could not reschedule post')
      setRescheduleId(null)
    },
  })

  const items = useMemo(() => {
    const all = data ?? []
    return all.filter((it) => {
      if (filters.platform !== 'all' && !it.accounts.some((a) => a.provider === filters.platform)) return false
      if (filters.account !== 'all' && !it.accountIds?.includes(filters.account)) return false
      if (filters.status !== 'all' && it.status !== filters.status) return false
      return true
    })
  }, [data, filters])

  // All connected accounts (unique by id) for filter
  const allAccounts = useMemo(() => {
    const m = new Map<string, { id: string; provider: string; displayName: string }>()
    for (const it of data ?? []) {
      for (const a of it.accounts) {
        if (!m.has(a.id)) m.set(a.id, a)
      }
    }
    return Array.from(m.values())
  }, [data])

  const platforms = useMemo(() => {
    const s = new Set<string>()
    for (const it of data ?? []) for (const a of it.accounts) s.add(a.provider)
    return Array.from(s)
  }, [data])

  // Bucket items by date
  const itemsByDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>()
    for (const it of items) {
      if (!it.scheduledAt) continue
      const key = format(new Date(it.scheduledAt), 'yyyy-MM-dd')
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(it)
    }
    // sort each day's items by time
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    }
    return m
  }, [items])

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null
    return items.find((i) => i.id === selectedPostId) ?? null
  }, [items, selectedPostId])

  // ============== MONTH VIEW ==============
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  // ============== WEEK VIEW ==============
  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 })
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
  }, [cursor])

  // ============== DAY VIEW ==============
  const dayItems = useMemo(() => {
    const key = format(cursor, 'yyyy-MM-dd')
    return itemsByDay.get(key) ?? []
  }, [itemsByDay, cursor])

  // List items, sorted
  const listItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
      const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
      return at - bt
    })
  }, [items])

  const handleDayClick = (day: Date) => {
    setCursor(day)
    setView('day')
  }

  const handlePrev = () => {
    if (view === 'month') setCursor(subMonths(cursor, 1))
    else if (view === 'week') setCursor(subWeeks(cursor, 1))
    else setCursor(addDays(cursor, -1))
  }
  const handleNext = () => {
    if (view === 'month') setCursor(addMonths(cursor, 1))
    else if (view === 'week') setCursor(addWeeks(cursor, 1))
    else setCursor(addDays(cursor, 1))
  }
  const handleToday = () => setCursor(new Date())

  const headerLabel = useMemo(() => {
    if (view === 'month') return format(cursor, 'MMMM yyyy')
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 0 })
      const end = endOfWeek(cursor, { weekStartsOn: 0 })
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    if (view === 'day') return format(cursor, 'EEEE, MMM d, yyyy')
    return 'All upcoming content'
  }, [view, cursor])

  const openReschedule = (item: CalendarItem) => {
    setRescheduleId(item.id)
    setRescheduleDate(item.scheduledAt ? new Date(item.scheduledAt) : new Date())
  }

  const confirmReschedule = () => {
    if (rescheduleId && rescheduleDate) {
      rescheduleMut.mutate({ id: rescheduleId, date: rescheduleDate })
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <SectionHeader title="Content Calendar" description="Plan, schedule and review upcoming posts" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CardSkeleton className="h-96 lg:col-span-2" />
          <CardSkeleton className="h-96" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Content Calendar"
        description="Plan, schedule and review upcoming posts"
        actions={
          <>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} variant="outline" size="sm">
              <ToggleGroupItem value="month" aria-label="Month view">
                <CalendarDays className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Month</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Week view">
                <CalendarRange className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Week</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="Day view">
                <CalIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Day</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={() => navigateView('composer')}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Post</span>
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleToday}>Today</Button>
          <Button size="sm" variant="outline" onClick={handleNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 text-sm font-semibold text-foreground">{headerLabel}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.platform} onValueChange={(v) => setFilters((f) => ({ ...f, platform: v }))}>
            <SelectTrigger size="sm" className="h-8 w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map((p) => {
                const m = providerMeta(p)
                const I = m.icon
                return (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <I className={`h-3.5 w-3.5 ${m.color}`} />
                      {m.label}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger size="sm" className="h-8 w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(POST_STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {allAccounts.length > 0 && (
            <Select value={filters.account} onValueChange={(v) => setFilters((f) => ({ ...f, account: v }))}>
              <SelectTrigger size="sm" className="h-8 w-[160px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {allAccounts.map((a) => {
                  const m = providerMeta(a.provider)
                  const I = m.icon
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <I className={`h-3.5 w-3.5 ${m.color}`} />
                        <span className="truncate">{a.displayName}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Timezone indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        Times shown in Asia/Karachi (your local timezone)
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No scheduled content"
          description="No scheduled content. Create a post to populate your calendar."
          action={
            <Button size="sm" onClick={() => navigateView('composer')}>
              <Plus className="h-3.5 w-3.5" /> Compose Post
            </Button>
          }
        />
      ) : (
        <>
          {/* ============== MONTH VIEW ============== */}
          {view === 'month' && (
            <Card className="card-premium overflow-hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="overflow-x-auto scrollbar-thin">
                  <div className="min-w-[700px]">
                    {/* Weekday header */}
                    <div className="grid grid-cols-7 border-b border-border">
                      {WEEKDAYS.map((d) => (
                        <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {monthDays.map((day) => {
                        const key = format(day, 'yyyy-MM-dd')
                        const dayItems = itemsByDay.get(key) ?? []
                        const inMonth = isSameMonth(day, cursor)
                        const today = isToday(day)
                        return (
                          <div
                            key={key}
                            className={cn(
                              'min-h-[110px] border-b border-r border-border/60 p-1.5 transition-colors',
                              !inMonth && 'bg-muted/20',
                              today && 'ring-2 ring-inset ring-emerald-500/60',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors hover:bg-accent',
                                  today ? 'bg-emerald-500 text-white' : inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                                )}
                                aria-label={`Open day view for ${format(day, 'PPP')}`}
                              >
                                {format(day, 'd')}
                              </button>
                              <button
                                onClick={() => navigateView('composer')}
                                className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                                aria-label="Create post"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {dayItems.slice(0, 3).map((it) => {
                                const sm = POST_STATUS_META[it.status] ?? { label: it.status, tone: 'muted' }
                                return (
                                  <Popover key={it.id}>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="flex w-full items-center gap-1.5 rounded-md border border-border/40 bg-card/60 px-1.5 py-1 text-left text-[10px] font-medium text-foreground transition-colors hover:bg-accent/60 hover:border-border focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      >
                                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotColor(it.status))} />
                                        <span className="truncate">{it.scheduledAt && format(new Date(it.scheduledAt), 'HH:mm')} </span>
                                        <span className="truncate">{it.title ?? it.caption.slice(0, 24)}</span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-72 p-3">
                                      <PostPreview it={it} onOpen={() => setSelectedPostId(it.id)} onReschedule={() => openReschedule(it)} />
                                    </PopoverContent>
                                  </Popover>
                                )
                              })}
                              {dayItems.length > 3 && (
                                <button
                                  onClick={() => handleDayClick(day)}
                                  className="w-full rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  +{dayItems.length - 3} more
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============== WEEK VIEW ============== */}
          {view === 'week' && (
            <Card className="card-premium overflow-hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="overflow-x-auto scrollbar-thin">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-7 gap-1.5">
                      {weekDays.map((day) => {
                        const key = format(day, 'yyyy-MM-dd')
                        const dayItems = itemsByDay.get(key) ?? []
                        const today = isToday(day)
                        return (
                          <div key={key} className="min-w-[100px]">
                            <div className={cn(
                              'mb-2 rounded-md px-2 py-1 text-center text-[11px] font-medium',
                              today ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40 text-muted-foreground',
                            )}>
                              <div className="uppercase tracking-wider">{format(day, 'EEE')}</div>
                              <div className="text-sm font-semibold">{format(day, 'd')}</div>
                            </div>
                            <div className="space-y-1.5">
                              {dayItems.length === 0 ? (
                                <button
                                  onClick={() => handleDayClick(day)}
                                  className="w-full rounded-md border border-dashed border-border/60 py-2 text-[10px] text-muted-foreground/60 transition-colors hover:bg-accent/30"
                                >
                                  Empty
                                </button>
                              ) : (
                                dayItems.map((it) => (
                                  <button
                                    key={it.id}
                                    onClick={() => setSelectedPostId(it.id)}
                                    className="w-full rounded-md border border-border/40 bg-card/60 p-1.5 text-left transition-colors hover:bg-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotColor(it.status))} />
                                      <span className="text-[10px] font-semibold text-foreground">
                                        {it.scheduledAt ? format(new Date(it.scheduledAt), 'HH:mm') : '—'}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 line-clamp-2 text-[11px] text-foreground/80">
                                      {it.title ?? it.caption.slice(0, 50)}
                                    </div>
                                    <div className="mt-1 flex items-center gap-0.5">
                                      {it.accounts.slice(0, 4).map((a, i) => {
                                        const m = providerMeta(a.provider)
                                        const I = m.icon
                                        return (
                                          <div key={i} className={cn('flex h-4 w-4 items-center justify-center rounded', m.bg)}>
                                            <I className={cn('h-2.5 w-2.5', m.color)} />
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============== DAY VIEW ============== */}
          {view === 'day' && (
            <Card className="card-premium">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{format(cursor, 'EEEE')}</div>
                    <div className="text-xs text-muted-foreground">{format(cursor, 'MMMM d, yyyy')}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{dayItems.length} post(s) scheduled</div>
                </div>
                {dayItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-12 text-center">
                    <CalendarPlus className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No posts scheduled for this day.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => navigateView('composer')}>
                      <Plus className="h-3.5 w-3.5" /> Schedule a post
                    </Button>
                  </div>
                ) : (
                  <div className="relative space-y-2 pl-16">
                    <div className="absolute bottom-2 left-[60px] top-2 w-px bg-border" />
                    {dayItems.map((it) => {
                      const sm = POST_STATUS_META[it.status] ?? { label: it.status, tone: 'muted' }
                      return (
                        <button
                          key={it.id}
                          onClick={() => setSelectedPostId(it.id)}
                          className="group relative block w-full text-left"
                        >
                          <div className="absolute -left-16 top-1.5 w-12 text-right text-[11px] font-medium text-muted-foreground">
                            {it.scheduledAt ? format(new Date(it.scheduledAt), 'HH:mm') : '—'}
                          </div>
                          <span className={cn('absolute -left-[7px] top-3 h-2 w-2 rounded-full ring-4 ring-background', statusDotColor(it.status))} />
                          <div className="rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:bg-accent/40 group-hover:border-border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-foreground">
                                  {it.title ?? it.caption.slice(0, 80)}
                                </div>
                                <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{it.caption}</div>
                              </div>
                              <StatusPill tone={sm.tone}>{sm.label}</StatusPill>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              {it.accounts.map((a, i) => {
                                const m = providerMeta(a.provider)
                                const I = m.icon
                                return (
                                  <div key={i} className={cn('flex h-5 w-5 items-center justify-center rounded', m.bg)} title={a.displayName}>
                                    <I className={cn('h-3 w-3', m.color)} />
                                  </div>
                                )
                              })}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User className="h-2.5 w-2.5" />
                                {it.author.name}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ============== LIST VIEW ============== */}
          {view === 'list' && (
            <Card className="card-premium">
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                  {listItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No items match your filters.</div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {listItems.map((it) => {
                        const sm = POST_STATUS_META[it.status] ?? { label: it.status, tone: 'muted' }
                        const day = it.scheduledAt ? new Date(it.scheduledAt) : null
                        return (
                          <button
                            key={it.id}
                            onClick={() => setSelectedPostId(it.id)}
                            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/30"
                          >
                            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-muted/40 py-1.5">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {day ? format(day, 'MMM') : '—'}
                              </div>
                              <div className="text-base font-semibold text-foreground">
                                {day ? format(day, 'd') : '—'}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {day ? format(day, 'HH:mm') : ''}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill tone={sm.tone}>{sm.label}</StatusPill>
                                <div className="flex items-center gap-0.5">
                                  {it.accounts.map((a, i) => {
                                    const m = providerMeta(a.provider)
                                    const I = m.icon
                                    return (
                                      <div key={i} className={cn('flex h-5 w-5 items-center justify-center rounded', m.bg)} title={a.displayName}>
                                        <I className={cn('h-3 w-3', m.color)} />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              <div className="mt-1 truncate text-sm font-medium text-foreground">
                                {it.title ?? it.caption.slice(0, 100)}
                              </div>
                              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                by {it.author.name} · {day ? fmtDateTime(day) : 'Not scheduled'}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Post detail sheet */}
      <Sheet open={!!selectedPostId} onOpenChange={(o) => !o && setSelectedPostId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selectedPost && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{selectedPost.title ?? 'Untitled post'}</SheetTitle>
                <SheetDescription className="sr-only">Post details</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusPill tone={POST_STATUS_META[selectedPost.status]?.tone ?? 'muted'}>
                    {POST_STATUS_META[selectedPost.status]?.label ?? selectedPost.status}
                  </StatusPill>
                  <span className="text-xs text-muted-foreground">
                    Scheduled {selectedPost.scheduledAt ? fmtDateTime(selectedPost.scheduledAt) : '—'}
                  </span>
                </div>
                {selectedPost.caption && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Caption</div>
                    <p className="text-sm text-foreground/80">{selectedPost.caption}</p>
                  </div>
                )}
                <div>
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Accounts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.accounts.map((a, i) => {
                      const m = providerMeta(a.provider)
                      const I = m.icon
                      return (
                        <div key={i} className={cn('flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-xs', m.bg)}>
                          <I className={cn('h-3 w-3', m.color)} />
                          <span className="text-foreground/80">{a.displayName}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Author: <span className="font-medium text-foreground">{selectedPost.author.name}</span>
                </div>
              </div>
              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => openReschedule(selectedPost)}
                  disabled={rescheduleMut.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                </Button>
                <SheetClose asChild>
                  <Button variant="ghost">Close</Button>
                </SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reschedule sheet */}
      <Sheet open={!!rescheduleId} onOpenChange={(o) => !o && setRescheduleId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-base">Reschedule Post</SheetTitle>
            <SheetDescription>
              Pick a new date for this post. The change will be audited and reflected across the calendar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <CalendarPicker
              mode="single"
              selected={rescheduleDate}
              onSelect={setRescheduleDate}
              className="mx-auto"
            />
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="reschedule-time">Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleDate ? format(rescheduleDate, 'HH:mm') : ''}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  if (rescheduleDate && !Number.isNaN(h) && !Number.isNaN(m)) {
                    const next = new Date(rescheduleDate)
                    next.setHours(h, m, 0, 0)
                    setRescheduleDate(next)
                  }
                }}
              />
            </div>
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-3 w-3" /> Note (§23)
              </div>
              Drag-and-drop reschedule is supported on month view; this picker is the accessible fallback.
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={confirmReschedule} disabled={!rescheduleDate || rescheduleMut.isPending}>
              {rescheduleMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}

function PostPreview({
  it, onOpen, onReschedule,
}: {
  it: CalendarItem
  onOpen: () => void
  onReschedule: () => void
}) {
  const sm = POST_STATUS_META[it.status] ?? { label: it.status, tone: 'muted' }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={sm.tone}>{sm.label}</StatusPill>
        <span className="text-[10px] text-muted-foreground">
          {it.scheduledAt ? format(new Date(it.scheduledAt), 'HH:mm') : '—'}
        </span>
      </div>
      <div className="text-sm font-medium text-foreground">{it.title ?? it.caption.slice(0, 80)}</div>
      <div className="line-clamp-2 text-[11px] text-muted-foreground">{it.caption}</div>
      <div className="flex items-center gap-1">
        {it.accounts.map((a, i) => {
          const m = providerMeta(a.provider)
          const I = m.icon
          return (
            <div key={i} className={cn('flex h-5 w-5 items-center justify-center rounded', m.bg)} title={a.displayName}>
              <I className={cn('h-3 w-3', m.color)} />
            </div>
          )
        })}
        <span className="ml-1 text-[10px] text-muted-foreground">by {it.author.name}</span>
      </div>
      <div className="flex items-center gap-1 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpen}>Open</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onReschedule}>
          <RefreshCw className="h-3 w-3" /> Reschedule
        </Button>
      </div>
    </div>
  )
}
