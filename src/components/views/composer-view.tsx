'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PageContainer, SectionHeader, EmptyState, LoadingState,
} from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  providerMeta, fmtBytes,
} from '@/lib/meta'
import {
  Image as ImageIcon, Search, X, Hash, Clock, Send, Save, ShieldCheck,
  AlertTriangle, CalendarClock, CheckCircle2, FileText, Play, ChevronRight,
} from 'lucide-react'

// Per master prompt §17 — platform-specific caption limits
const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  threads: 500,
  facebook: 63206,
  youtube: 5000,
  pinterest: 500, // title limit
}

interface MediaItem {
  id: string
  filename: string
  type: string
  mimeType: string
  url: string
  thumbnailUrl?: string | null
  size: number
  width?: number | null
  height?: number | null
  duration?: number | null
  tags?: string[]
  folder?: string | null
}

interface Account {
  id: string
  provider: string
  handle: string
  displayName: string
  avatarUrl?: string | null
  capabilities: {
    publish: boolean
    schedule: boolean
    analytics: boolean
    comments: boolean
    video: boolean
    stories: boolean
    reels: boolean
    webhooks: boolean
  }
  health?: string
}

// ============================================================
// LEFT — Media library
// ============================================================
function MediaLibrary({
  selectedIds, onToggle, selectedCount,
}: { selectedIds: string[]; onToggle: (id: string) => void; selectedCount: number }) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const r = await fetch('/api/v1/media')
      const j = await r.json()
      return ((j.data?.media ?? (Array.isArray(j.data) ? j.data : [])) as MediaItem[])
    },
  })

  const filtered = useMemo(() => {
    const list = data ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((m) => m.filename.toLowerCase().includes(q))
  }, [data, search])

  return (
    <Card className="card-premium flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Media Library</h3>
          {selectedCount > 0 && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {selectedCount} selected
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No media found.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pr-2">
              {filtered.map((m) => {
                const selected = selectedIds.includes(m.id)
                const isVideo = m.type === 'VIDEO'
                const thumb = m.thumbnailUrl ?? m.url
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggle(m.id)}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-md border bg-muted/40 transition-all hover:ring-2 hover:ring-emerald-500/40',
                      selected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-border',
                    )}
                    title={m.filename}
                  >
                    
                    <img src={thumb} alt={m.filename} className="h-full w-full object-cover" loading="lazy" />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                          <Play className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    )}
                    {selected && (
                      <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[9px] font-medium text-white">
                      {m.filename}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================
// CENTER — Post editor
// ============================================================
function PostEditor({
  title, setTitle, caption, setCaption, hashtags, setHashtags,
  selectedMedia, onRemoveMedia, accounts, selectedAccountIds,
  overrides, setOverride, onSubmit, isSubmitting,
}: {
  title: string
  setTitle: (v: string) => void
  caption: string
  setCaption: (v: string) => void
  hashtags: string[]
  setHashtags: (v: string[]) => void
  selectedMedia: MediaItem[]
  onRemoveMedia: (id: string) => void
  accounts: Account[]
  selectedAccountIds: string[]
  overrides: Record<string, string>
  setOverride: (accountId: string, value: string) => void
  onSubmit: (status: 'DRAFT' | 'AWAITING_APPROVAL' | 'SCHEDULED') => void
  isSubmitting: boolean
}) {
  const [hashtagInput, setHashtagInput] = useState('')

  const addHashtag = (val: string) => {
    const clean = val.trim().replace(/^#+/, '')
    if (clean && !hashtags.includes(clean)) {
      setHashtags([...hashtags, clean])
    }
    setHashtagInput('')
  }

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id))

  return (
    <Card className="card-premium flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Compose post</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {selectedAccountIds.length} account(s) selected
          </span>
        </div>

        {/* Title */}
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9"
        />

        {/* Caption */}
        <div className="relative">
          <Textarea
            placeholder="Write your caption…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[160px] resize-none"
            maxLength={6500}
          />
          <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground">
            {caption.length} chars
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Hash className="h-3 w-3" />
            Hashtags
          </div>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
            {hashtags.map((h) => (
              <Badge key={h} variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                #{h}
                <button
                  type="button"
                  onClick={() => setHashtags(hashtags.filter((x) => x !== h))}
                  className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`Remove #${h}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addHashtag(hashtagInput)
                }
              }}
              onBlur={() => hashtagInput && addHashtag(hashtagInput)}
              placeholder="Type hashtag + Enter"
              className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Selected media previews */}
        {selectedMedia.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Attached media · {selectedMedia.length}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMedia.map((m) => (
                <div key={m.id} className="group relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
                  
                  <img src={m.thumbnailUrl ?? m.url} alt={m.filename} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveMedia(m.id)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Remove ${m.filename}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Overrides */}
        {selectedAccounts.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Platform overrides
            </div>
            <Tabs defaultValue="__common">
              <ScrollArea className="w-full">
                <TabsList className="h-8 w-max">
                  <TabsTrigger value="__common" className="text-xs">Common</TabsTrigger>
                  {selectedAccounts.map((a) => {
                    const meta = providerMeta(a.provider)
                    const Icon = meta.icon
                    return (
                      <TabsTrigger key={a.id} value={a.id} className="gap-1 text-xs">
                        <Icon className={cn('h-3 w-3', meta.color)} />
                        {meta.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </ScrollArea>

              <TabsContent value="__common" className="mt-2">
                <p className="mb-1.5 text-[11px] text-muted-foreground">
                  Default caption applied to all selected accounts. Override per platform below.
                </p>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[100px] resize-none text-sm"
                />
              </TabsContent>

              {selectedAccounts.map((a) => {
                const meta = providerMeta(a.provider)
                const limit = PLATFORM_LIMITS[a.provider] ?? 2200
                const value = overrides[a.id] ?? caption
                const over = value.length > limit
                return (
                  <TabsContent key={a.id} value={a.id} className="mt-2">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground">{meta.label}</span> · {a.handle}
                      </span>
                      <span className={cn(over ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                        {value.length} / {limit.toLocaleString()}
                      </span>
                    </div>
                    <Textarea
                      value={value}
                      onChange={(e) => setOverride(a.id, e.target.value)}
                      className={cn(
                        'min-h-[100px] resize-none text-sm',
                        over && 'border-red-500/60 focus-visible:ring-red-500/40',
                      )}
                      placeholder={`Override caption for ${meta.label}…`}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {meta.label} caption limit: {limit.toLocaleString()} characters.
                    </p>
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        )}

        {/* Action bar */}
        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => onSubmit('DRAFT')} disabled={isSubmitting || !caption}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save as Draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSubmit('AWAITING_APPROVAL')} disabled={isSubmitting || !caption || selectedAccountIds.length === 0}>
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Submit for Approval
          </Button>
          <Button size="sm" onClick={() => onSubmit('SCHEDULED')} disabled={isSubmitting || !caption || selectedAccountIds.length === 0}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// RIGHT — Account selection, preview, schedule
// ============================================================
function AccountSelector({
  accounts, selectedIds, onToggle,
}: { accounts: Account[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  // Group by provider
  const groups = useMemo(() => {
    const g: Record<string, Account[]> = {}
    for (const a of accounts) {
      if (!g[a.provider]) g[a.provider] = []
      g[a.provider].push(a)
    }
    return g
  }, [accounts])

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No accounts connected. Visit Social Accounts to connect one.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([provider, list]) => {
        const meta = providerMeta(provider)
        const Icon = meta.icon
        return (
          <div key={provider}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className={cn('h-3 w-3', meta.color)} />
              {meta.label}
            </div>
            <div className="space-y-1">
              {list.map((a) => {
                const checked = selectedIds.includes(a.id)
                return (
                  <label
                    key={a.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors',
                      checked ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border hover:bg-accent/40',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(a.id)}
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={a.avatarUrl ?? undefined} alt={a.displayName} />
                      <AvatarFallback className="text-[9px]">{a.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{a.displayName}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{a.handle}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PreviewCard({ account, caption, media, title }: {
  account: Account | null
  caption: string
  media: MediaItem[]
  title: string
}) {
  if (!account) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Select an account to preview.
      </div>
    )
  }
  const meta = providerMeta(account.provider)
  const Icon = meta.icon
  const previewCaption = caption || 'Your caption will appear here…'
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={account.avatarUrl ?? undefined} alt={account.displayName} />
          <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{account.displayName}</span>
            <Icon className={cn('h-3 w-3 shrink-0', meta.color)} />
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {account.handle} · {meta.label}
          </div>
        </div>
      </div>
      <div className="mt-2.5 space-y-2">
        {title && <div className="text-xs font-semibold text-foreground">{title}</div>}
        {media.length > 0 && (
          <div className={cn('grid gap-1', media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {media.slice(0, 4).map((m) => (
              <div key={m.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                
                <img src={m.thumbnailUrl ?? m.url} alt={m.filename} className="h-full w-full object-cover" />
                {m.type === 'VIDEO' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
          {previewCaption}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Main view
// ============================================================
export function ComposerView() {
  const qc = useQueryClient()

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const r = await fetch('/api/v1/media')
      const j = await r.json()
      return ((j.data?.media ?? (Array.isArray(j.data) ? j.data : [])) as MediaItem[])
    },
  })

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const r = await fetch('/api/v1/accounts')
      const j = await r.json()
      return (j.data?.accounts ?? []) as Account[]
    },
  })

  const accounts = accountsData ?? []
  const allMedia = mediaData ?? []

  // Compose state
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [scheduledAt, setScheduledAt] = useState('')
  const [previewAccountId, setPreviewAccountId] = useState<string | null>(null)

  const media = allMedia.filter((m) => selectedMediaIds.includes(m.id))
  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id))

  // §19 Duplicate-content governance — synthetic similarity for multi-account publishing
  const similarityScore = selectedAccountIds.length > 1
    ? Math.min(95, 60 + selectedAccountIds.length * 8)
    : 0
  const multiAccountWarning = selectedAccountIds.length > 1

  const setOverride = (accountId: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [accountId]: value }))
  }

  const toggleMedia = (id: string) => {
    setSelectedMediaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const removeMedia = (id: string) => setSelectedMediaIds((prev) => prev.filter((x) => x !== id))

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // Auto-set preview to first selected if current preview not in set
      if (previewAccountId && !next.includes(previewAccountId)) {
        setPreviewAccountId(next[0] ?? null)
      } else if (!previewAccountId && next.length > 0) {
        setPreviewAccountId(next[0])
      }
      return next
    })
  }

  const previewAccount = previewAccountId
    ? accounts.find((a) => a.id === previewAccountId) ?? null
    : selectedAccounts[0] ?? null

  const mutation = useMutation({
    mutationFn: async (status: 'DRAFT' | 'AWAITING_APPROVAL' | 'SCHEDULED') => {
      const body = {
        title: title || undefined,
        caption,
        mediaUrls: selectedMediaIds.length > 0
          ? media.map((m) => m.url)
          : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        accountIds: selectedAccountIds,
        status,
        scheduledAt: status === 'SCHEDULED'
          ? (scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
          : undefined,
      }
      const r = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return r.json()
    },
    onSuccess: (data, status) => {
      const sim = data?.data?.similarityScore ?? 0
      const labels: Record<string, string> = {
        DRAFT: 'Draft saved',
        AWAITING_APPROVAL: 'Submitted for approval',
        SCHEDULED: 'Post scheduled',
      }
      toast.success(labels[status] ?? 'Post created', {
        description: sim > 0
          ? `Cross-account similarity score: ${sim}%. Reviewer will be notified.`
          : undefined,
      })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      // Reset form
      setTitle(''); setCaption(''); setHashtags([])
      setSelectedMediaIds([]); setSelectedAccountIds([])
      setOverrides({}); setScheduledAt(''); setPreviewAccountId(null)
    },
    onError: () => toast.error('Failed to create post'),
  })

  const onSubmit = (status: 'DRAFT' | 'AWAITING_APPROVAL' | 'SCHEDULED') => {
    if (status === 'DRAFT' && !caption) {
      toast.error('Caption is required')
      return
    }
    if (status !== 'DRAFT' && selectedAccountIds.length === 0) {
      toast.error('Select at least one account')
      return
    }
    mutation.mutate(status)
  }

  if (mediaLoading || accountsLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Composer"
        description="Craft, customize and schedule posts across all connected social accounts"
        actions={
          <StatusPill tone="warning" dot={false}>DEMO · publishing simulated</StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
        {/* LEFT — Media library */}
        <div className="h-[640px] lg:sticky lg:top-4">
          <MediaLibrary
            selectedIds={selectedMediaIds}
            onToggle={toggleMedia}
            selectedCount={selectedMediaIds.length}
          />
        </div>

        {/* CENTER — Editor */}
        <div className="h-[640px]">
          <PostEditor
            title={title}
            setTitle={setTitle}
            caption={caption}
            setCaption={setCaption}
            hashtags={hashtags}
            setHashtags={setHashtags}
            selectedMedia={media}
            onRemoveMedia={removeMedia}
            accounts={accounts}
            selectedAccountIds={selectedAccountIds}
            overrides={overrides}
            setOverride={setOverride}
            onSubmit={onSubmit}
            isSubmitting={mutation.isPending}
          />
        </div>

        {/* RIGHT — Account selection, preview, schedule */}
        <div className="space-y-4">
          {/* Account selector */}
          <Card className="card-premium">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Target accounts</h3>
                {selectedAccountIds.length > 0 && (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {selectedAccountIds.length} selected
                  </Badge>
                )}
              </div>
              <AccountSelector
                accounts={accounts}
                selectedIds={selectedAccountIds}
                onToggle={toggleAccount}
              />
            </CardContent>
          </Card>

          {/* Multi-account governance */}
          {multiAccountWarning && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Multi-account publishing detected
                  </div>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    Similarity score: <span className="font-semibold">{similarityScore}%</span>. Cross-posting similar content may violate platform rules (e.g. X&apos;s automation policy). Reviewer will be notified.
                  </p>
                  <StatusPill tone="warning" dot={false} className="mt-1">Similarity {similarityScore}%</StatusPill>
                </div>
              </div>
            </div>
          )}

          {/* Live preview */}
          <Card className="card-premium">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Live preview</h3>
                {selectedAccounts.length > 1 && (
                  <Tabs value={previewAccountId ?? undefined} onValueChange={(v) => setPreviewAccountId(v)}>
                    <ScrollArea className="w-full max-w-[180px]">
                      <TabsList className="h-7 w-max">
                        {selectedAccounts.map((a) => {
                          const meta = providerMeta(a.provider)
                          return (
                            <TabsTrigger key={a.id} value={a.id} className="px-2 py-0 text-[11px]">
                              <meta.icon className="h-3 w-3" />
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>
                    </ScrollArea>
                  </Tabs>
                )}
              </div>
              <PreviewCard
                account={previewAccount}
                caption={caption}
                media={media}
                title={title}
              />
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="card-premium">
            <CardContent className="space-y-3 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Schedule
              </h3>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Timezone: <span className="font-medium text-foreground">Asia/Karachi</span> (PKT, UTC+5)
              </div>
            </CardContent>
          </Card>

          {/* Approval status */}
          <Card className="card-premium">
            <CardContent className="space-y-2 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Approval flow
              </h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <span><b className="text-foreground">Draft</b> — saved privately</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <span><b className="text-foreground">Submit</b> — routed to approver (step 1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <span><b className="text-foreground">Schedule</b> — queue + scheduledAt</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {accounts.length === 0 && allMedia.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="No accounts or media yet"
          description="Connect a social account and upload media to start composing."
        />
      )}
    </PageContainer>
  )
}
