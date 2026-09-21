'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PageContainer, SectionHeader, EmptyState, LoadingState,
} from '@/components/shared/layout'
import { StatusPill } from '@/components/shared/status-pill'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Upload, Search, LayoutGrid, List, ChevronDown, Star, Trash2, Eye, Send,
  FileVideo, FileImage, FileText, Play, Folder as FolderIcon, Filter, CheckCircle2,
} from 'lucide-react'
import { fmtBytes, fmtDateTime } from '@/lib/meta'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

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
  createdAt?: string
}

const FOLDERS = ['All Media', 'Brand', 'Q4 Campaign', 'Case Studies', 'Events']
const TYPES: { key: string; label: string }[] = [
  { key: 'IMAGE', label: 'Images' },
  { key: 'VIDEO', label: 'Videos' },
  { key: 'GIF', label: 'GIFs' },
  { key: 'DOCUMENT', label: 'Documents' },
]

function TypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'VIDEO': return <FileVideo className={className} />
    case 'GIF': return <FileImage className={className} />
    case 'DOCUMENT': return <FileText className={className} />
    default: return <FileImage className={className} />
  }
}

function typeBadgeTone(type: string): string {
  switch (type) {
    case 'VIDEO': return 'bg-red-500/15 text-red-700 dark:text-red-300'
    case 'GIF': return 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
    case 'DOCUMENT': return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    default: return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  }
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload media</DialogTitle>
          <DialogDescription>
            Drag &amp; drop files or click to browse. Uploads are simulated in this sandbox — no bytes are persisted.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            toast.info('Upload simulated in demo', {
              description: `${e.dataTransfer.files.length} file(s) would be uploaded to the media library.`,
            })
            onOpenChange(false)
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/30',
          )}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/40 text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, MP4, GIF up to 50 MB</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              toast.info('Upload simulated in demo')
              onOpenChange(false)
            }}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Choose files
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MediaPreviewDialog({
  media, open, onOpenChange,
}: { media: MediaItem | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!media) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon type={media.type} className="h-4 w-4 text-muted-foreground" />
            {media.filename}
          </DialogTitle>
          <DialogDescription>{media.mimeType} · {fmtBytes(media.size)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            {media.type === 'IMAGE' || media.type === 'GIF' ? (

              <img src={media.url} alt={media.filename} className="mx-auto max-h-[400px] w-full object-contain" />
            ) : media.type === 'VIDEO' ? (
              <div className="relative aspect-video bg-black">
                
                <img src={media.thumbnailUrl ?? media.url} alt={media.filename} className="h-full w-full object-cover opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white">
                    <Play className="h-6 w-6" />
                  </div>
                </div>
                {media.duration && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(media.duration)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <FileText className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Detail label="Type" value={media.type} />
            <Detail label="Size" value={fmtBytes(media.size)} />
            <Detail label="Dimensions" value={media.width && media.height ? `${media.width}×${media.height}` : '—'} />
            {media.duration ? <Detail label="Duration" value={formatDuration(media.duration)} /> : null}
            <Detail label="MIME" value={media.mimeType} />
            <Detail label="Folder" value={media.folder ?? '—'} />
            {media.createdAt && <Detail label="Uploaded" value={fmtDateTime(media.createdAt)} />}
          </div>

          {media.tags && media.tags.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tags</div>
              <div className="flex flex-wrap gap-1">
                {media.tags.map((t) => (
                  <Badge key={t} variant="outline" className="bg-muted/40 text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button size="sm" onClick={() => { toast.success('Added to composer', { description: media.filename }); onOpenChange(false) }}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Use in composer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{value}</div>
    </div>
  )
}

function MediaCard({
  media, onOpen, favorites, toggleFavorite,
}: {
  media: MediaItem
  onOpen: (m: MediaItem) => void
  favorites: Set<string>
  toggleFavorite: (id: string) => void
}) {
  const isFav = favorites.has(media.id)
  const isVideo = media.type === 'VIDEO'

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(media)}
        className="relative block aspect-square w-full overflow-hidden bg-muted/40"
        aria-label={`Preview ${media.filename}`}
      >
        
        <img
          src={media.thumbnailUrl ?? media.url}
          alt={media.filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="h-4 w-4" />
            </div>
          </div>
        )}
        {media.duration && (
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
            {formatDuration(media.duration)}
          </div>
        )}
        <span className={cn(
          'absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider backdrop-blur',
          typeBadgeTone(media.type),
        )}>
          {media.type}
        </span>
      </button>

      {/* Favorite star */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleFavorite(media.id) }}
        className={cn(
          'absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur transition-all',
          isFav ? 'bg-amber-500/90 text-white' : 'bg-black/40 text-white opacity-0 group-hover:opacity-100',
        )}
        aria-label={isFav ? 'Unfavorite' : 'Favorite'}
      >
        <Star className={cn('h-3.5 w-3.5', isFav && 'fill-current')} />
      </button>

      <div className="p-2.5">
        <div className="truncate text-xs font-medium text-foreground" title={media.filename}>
          {media.filename}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{fmtBytes(media.size)}</span>
          {media.width && media.height && <span>{media.width}×{media.height}</span>}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 transition-transform duration-200 group-hover:translate-y-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-white hover:bg-white/20 hover:text-white"
          onClick={() => onOpen(media)}
        >
          <Eye className="h-3 w-3" /> Preview
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-white hover:bg-white/20 hover:text-white"
          onClick={() => toast.success('Added to composer', { description: media.filename })}
        >
          <Send className="h-3 w-3" /> Use
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-white hover:bg-red-500/80 hover:text-white"
          onClick={() => toast.error('Delete simulated in demo')}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </article>
  )
}

export function ContentLibraryView() {
  const { setView } = useAppStore()
  const [view, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState<string>('All Media')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const r = await fetch('/api/v1/media')
      const j = await r.json()
      return ((j.data?.media ?? (Array.isArray(j.data) ? j.data : [])) as MediaItem[])
    },
  })

  const allMedia = data ?? []

  // Aggregate all tags
  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const m of allMedia) {
      for (const t of m.tags ?? []) s.add(t)
    }
    return Array.from(s).sort()
  }, [allMedia])

  const filtered = useMemo(() => {
    let list = allMedia
    if (folder !== 'All Media') {
      list = list.filter((m) => m.folder === folder)
    }
    if (activeTypes.size > 0) {
      list = list.filter((m) => activeTypes.has(m.type))
    }
    if (activeTags.size > 0) {
      list = list.filter((m) => (m.tags ?? []).some((t) => activeTags.has(t)))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.filename.toLowerCase().includes(q))
    }
    return list
  }, [allMedia, folder, activeTypes, activeTags, search])

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }
  const toggleTag = (t: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Content Library"
        description="Upload, organize and reuse media assets across your posts"
        actions={
          <>
            <div className="hidden items-center rounded-md border border-border bg-card p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  view === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-40 pl-8 text-xs sm:w-48"
              />
            </div>

            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[14rem_1fr]">
        {/* Sidebar filters */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Folders */}
          <Card className="card-premium">
            <CardContent className="space-y-1 p-3">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <FolderIcon className="h-3 w-3" />
                Folders
              </div>
              {FOLDERS.map((f) => {
                const count = f === 'All Media'
                  ? allMedia.length
                  : allMedia.filter((m) => m.folder === f).length
                const active = folder === f
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFolder(f)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors',
                      active ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground/80 hover:bg-accent/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {active && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      {f}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Types */}
          <Card className="card-premium">
            <CardContent className="space-y-1 p-3">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3 w-3" />
                Type
              </div>
              {TYPES.map((t) => {
                const count = allMedia.filter((m) => m.type === t.key).length
                const active = activeTypes.has(t.key)
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleType(t.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors',
                      active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'text-foreground/80 hover:bg-accent/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                      {t.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="card-premium">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3 w-3" />
                Tags
              </div>
              {allTags.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-muted-foreground">No tags yet.</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {allTags.map((t) => {
                    const active = activeTags.has(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset transition-colors',
                          active
                            ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
                            : 'bg-muted/40 text-muted-foreground ring-border hover:bg-accent/40',
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main grid */}
        <div>
          {/* Filter summary */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{filtered.length} of {allMedia.length} items</span>
            {(activeTypes.size > 0 || activeTags.size > 0 || folder !== 'All Media' || search) && (
              <button
                type="button"
                onClick={() => {
                  setActiveTypes(new Set())
                  setActiveTags(new Set())
                  setFolder('All Media')
                  setSearch('')
                }}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-accent/40 dark:text-emerald-300"
              >
                Clear filters
              </button>
            )}
            {folder !== 'All Media' && (
              <Badge variant="outline" className="bg-muted/40 text-[10px]">{folder}</Badge>
            )}
            {Array.from(activeTypes).map((t) => (
              <Badge key={t} variant="outline" className="bg-muted/40 text-[10px]">{t}</Badge>
            ))}
            {Array.from(activeTags).map((t) => (
              <Badge key={t} variant="outline" className="bg-muted/40 text-[10px]">#{t}</Badge>
            ))}
          </div>

          {isLoading ? (
            <div className={cn(
              'grid gap-3',
              view === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid-cols-1',
            )}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className={view === 'grid' ? 'aspect-square' : 'h-16'} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileImage}
              title="No media found"
              description={
                allMedia.length === 0
                  ? 'Upload your first asset to start building your content library.'
                  : 'Try adjusting your filters or search query.'
              }
              action={
                allMedia.length === 0 ? (
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Upload className="mr-1.5 h-4 w-4" /> Upload media
                  </Button>
                ) : undefined
              }
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  onOpen={setPreview}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <Card className="card-premium">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {filtered.map((m) => {
                    const isFav = favorites.has(m.id)
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setPreview(m)}
                          className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-accent/30"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            
                            <img src={m.thumbnailUrl ?? m.url} alt={m.filename} className="h-full w-full object-cover" loading="lazy" />
                            {m.type === 'VIDEO' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{m.filename}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {m.folder ?? 'No folder'} · {fmtBytes(m.size)}{m.width && m.height ? ` · ${m.width}×${m.height}` : ''}
                            </div>
                          </div>
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                            typeBadgeTone(m.type),
                          )}>
                            <TypeIcon type={m.type} className="h-2.5 w-2.5" />
                            {m.type}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id) }}
                            className="p-1.5 text-muted-foreground hover:text-amber-500"
                            aria-label="Toggle favorite"
                          >
                            <Star className={cn('h-4 w-4', isFav && 'fill-amber-500 text-amber-500')} />
                          </button>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MediaPreviewDialog
        media={preview}
        open={!!preview}
        onOpenChange={(o) => { if (!o) setPreview(null) }}
      />
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </PageContainer>
  )
}
