'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PageContainer, SectionHeader, EmptyState, CardSkeleton,
} from '@/components/shared/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/shared/status-pill'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { fmtNumber, fmtDate, fmtDateTime, providerMeta } from '@/lib/meta'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Eye, BarChart3, Activity, FileText,
  AlertTriangle, Info, ChevronRight, Sparkles, TrendingUp,
} from 'lucide-react'

type Summary = {
  totalFollowers: number
  totalReach: number
  totalImpressions: number
  avgEngagementRate: number
  publishedPosts: number
  sourceLabel: string
}

type AccountSeries = {
  id: string
  provider: string
  displayName: string
  avatarUrl: string | null
  followers: number
  reach30d: number
  impressions30d: number
  engagementRate: number
  series: { date: string; followers: number; reach: number; impressions: number; engagement: number; engagementRate: number }[]
}

type PostMetric = {
  id: string
  title: string | null
  caption: string
  publishedAt: string
  accounts: { provider: string; displayName: string }[]
  totals: { likes: number; comments: number; shares: number; saves: number; views: number; reach: number; impressions: number; clicks: number }
  series: { date: string; likes: number; comments: number; shares: number; views: number; reach: number; impressions: number }[]
}

type CrossPlatform = {
  provider: string
  followers: number
  reach: number
  impressions: number
  engagement: number
  posts: number
}

type AnalyticsData = {
  summary: Summary | null
  accounts: AccountSeries[]
  posts: PostMetric[]
  crossPlatform: CrossPlatform[]
}

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
]

const CHART_COLORS = {
  emerald: 'oklch(0.62 0.13 165)',
  blue: 'oklch(0.65 0.16 250)',
  amber: 'oklch(0.72 0.15 75)',
  red: 'oklch(0.58 0.20 25)',
  violet: 'oklch(0.55 0.18 295)',
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid oklch(0.5 0 0 / 0.15)',
  fontSize: 12,
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <div className="h-7 w-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function KpiCard({
  icon: Icon, label, value, sub, sparkData, color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  sparkData: { v: number }[]
  color: string
}) {
  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3 w-3" />
              {label}
            </div>
            <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
            {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
          </div>
          <Sparkline data={sparkData} color={color} />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title, subtitle, action, children, className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`card-premium ${className ?? ''}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function AnalyticsView() {
  const [range, setRange] = useState('30d')
  const [accountId, setAccountId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics', range],
    queryFn: async () => {
      const r = await fetch(`/api/v1/analytics?range=${range}`)
      const j = await r.json()
      return j.data as AnalyticsData
    },
  })

  if (isLoading) {
    return (
      <PageContainer>
        <SectionHeader title="Analytics" description="Performance metrics across all connected accounts" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton className="h-72" />
          <CardSkeleton className="h-72" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <SectionHeader title="Analytics" description="Performance metrics across all connected accounts" />
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load analytics"
          description="There was a problem fetching performance metrics. Please try again."
        />
      </PageContainer>
    )
  }

  const { summary, accounts, posts, crossPlatform } = data

  if (!summary || (accounts.length === 0 && posts.length === 0)) {
    return (
      <PageContainer>
        <SectionHeader title="Analytics" description="Performance metrics across all connected accounts" />
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Connect a social account and publish posts to see performance metrics here. Provider metrics populate after the first sync."
        />
      </PageContainer>
    )
  }

  // Sparkline series for KPI cards (from account series when present)
  const followerSpark = (accounts[0]?.series ?? []).slice(-14).map((s) => ({ v: s.followers }))
  const reachSpark = (accounts[0]?.series ?? []).slice(-14).map((s) => ({ v: s.reach }))
  const impressionsSpark = (accounts[0]?.series ?? []).slice(-14).map((s) => ({ v: s.impressions }))
  const engagementSpark = (accounts[0]?.series ?? []).slice(-14).map((s) => ({ v: s.engagementRate }))
  const postsSpark = posts.slice(0, 14).map((_, i) => ({ v: posts.length - i * (posts.length / 14) }))

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? accounts[0]

  // Aggregate publishing frequency per day across all accounts
  const freqMap = new Map<string, number>()
  for (const p of posts) {
    const day = fmtDate(p.publishedAt).slice(0, 6) + p.publishedAt.slice(8, 10)
    if (!freqMap.has(day)) freqMap.set(day, 0)
    freqMap.set(day, freqMap.get(day)! + 1)
  }
  const freqSeries = Array.from(freqMap.entries())
    .map(([day, count]) => ({ day, posts: count }))
    .slice(-14)

  // Top 5 posts by engagement (likes + comments + shares + saves)
  const topPosts = [...posts]
    .map((p) => ({
      ...p,
      totalEngagement: p.totals.likes + p.totals.comments + p.totals.shares + p.totals.saves,
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 5)

  return (
    <PageContainer>
      <SectionHeader
        title="Analytics"
        description="Performance metrics across all connected accounts"
        actions={
          <>
            <StatusPill tone="warning" dot={false}>DEMO · provider metrics not live-verified</StatusPill>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* DEMO banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted-foreground sm:text-sm">
          <span className="font-medium text-foreground">Social provider metrics are in DEMO mode.</span>{' '}
          Metrics shown are seeded for demonstration. Per §30 — only display metrics actually supplied by the provider.
          No metric is fabricated; this view surfaces exactly what the API returns.
        </div>
      </div>

      {/* KPI row */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Summary</h2>
          <StatusPill tone="warning" dot={false}>DEMO</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <KpiCard
            icon={Users}
            label="Total Followers"
            value={fmtNumber(summary.totalFollowers)}
            sub="All connected accounts"
            sparkData={followerSpark.length ? followerSpark : [{ v: 0 }, { v: summary.totalFollowers }]}
            color={CHART_COLORS.emerald}
          />
          <KpiCard
            icon={Eye}
            label="Total Reach"
            value={fmtNumber(summary.totalReach)}
            sub={`Last ${range}`}
            sparkData={reachSpark.length ? reachSpark : [{ v: 0 }, { v: summary.totalReach }]}
            color={CHART_COLORS.blue}
          />
          <KpiCard
            icon={BarChart3}
            label="Total Impressions"
            value={fmtNumber(summary.totalImpressions)}
            sub={`Last ${range}`}
            sparkData={impressionsSpark.length ? impressionsSpark : [{ v: 0 }, { v: summary.totalImpressions }]}
            color={CHART_COLORS.amber}
          />
          <KpiCard
            icon={Activity}
            label="Avg Engagement"
            value={`${summary.avgEngagementRate}%`}
            sub="Engagement rate"
            sparkData={engagementSpark.length ? engagementSpark : [{ v: 0 }, { v: summary.avgEngagementRate }]}
            color={CHART_COLORS.violet}
          />
          <KpiCard
            icon={FileText}
            label="Published Posts"
            value={fmtNumber(summary.publishedPosts)}
            sub="In range"
            sparkData={postsSpark.length ? postsSpark : [{ v: 0 }, { v: summary.publishedPosts }]}
            color={CHART_COLORS.red}
          />
        </div>
      </div>

      {/* Cross-platform comparison */}
      <ChartCard
        title="Cross-Platform Performance"
        subtitle="Followers / Reach / Impressions / Engagement by provider — Always show provider/source (§33)."
        action={<StatusPill tone="warning" dot={false}>DEMO</StatusPill>}
      >
        {crossPlatform.length === 0 ? (
          <EmptyState icon={BarChart3} title="No cross-platform data" description="Connect accounts to see comparison." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={crossPlatform} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
              <XAxis
                dataKey="provider"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.7)' }}
                tickFormatter={(v: string) => providerMeta(v).label}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v: number) => fmtNumber(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtNumber(v)} cursor={{ fill: 'oklch(0.5 0 0 / 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="followers" name="Followers" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              <Bar dataKey="reach" name="Reach" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="impressions" name="Impressions" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
              <Bar dataKey="engagement" name="Engagement" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Account analytics */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Account Analytics</h2>
          <StatusPill tone="warning" dot={false}>DEMO</StatusPill>
        </div>
        {accounts.length === 0 ? (
          <EmptyState icon={Users} title="No connected accounts" description="Connect accounts to see per-account analytics." />
        ) : (
          <Tabs value={selectedAccount.id} onValueChange={setAccountId}>
            <div className="overflow-x-auto scrollbar-thin -mx-1 px-1 pb-1">
              <TabsList className="w-max">
                {accounts.map((a) => {
                  const meta = providerMeta(a.provider)
                  const Icon = meta.icon
                  return (
                    <TabsTrigger key={a.id} value={a.id} className="gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      <span className="max-w-[120px] truncate">{a.displayName}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {accounts.map((a) => {
              const meta = providerMeta(a.provider)
              const Icon = meta.icon
              return (
                <TabsContent key={a.id} value={a.id} className="space-y-4">
                  {/* Account header */}
                  <Card className="card-premium">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg}`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{a.displayName}</div>
                          <div className="text-[11px] text-muted-foreground">{meta.label} · {fmtNumber(a.followers)} followers · {a.engagementRate}% engagement</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</div>
                          <div className="text-sm font-semibold text-foreground">{fmtNumber(a.reach30d)}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions</div>
                          <div className="text-sm font-semibold text-foreground">{fmtNumber(a.impressions30d)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Follower growth */}
                    <ChartCard title="Follower Growth" subtitle={`Daily followers · last ${range}`}>
                      {a.series.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">No metric history yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={a.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <defs>
                              <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v: string) => fmtDate(v)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }}
                              minTickGap={24}
                            />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v: number) => fmtNumber(v)} />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: string) => fmtDate(v)} formatter={(v: any) => fmtNumber(v)} />
                            <Area type="monotone" dataKey="followers" stroke={CHART_COLORS.emerald} strokeWidth={2} fill="url(#followersGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    {/* Reach & Impressions */}
                    <ChartCard title="Reach & Impressions" subtitle={`Daily totals · last ${range}`}>
                      {a.series.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">No metric history yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={a.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <defs>
                              <linearGradient id="reachArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="impressionsArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v: string) => fmtDate(v)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }}
                              minTickGap={24}
                            />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v: number) => fmtNumber(v)} />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: string) => fmtDate(v)} formatter={(v: any) => fmtNumber(v)} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="reach" name="Reach" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#reachArea)" />
                            <Area type="monotone" dataKey="impressions" name="Impressions" stroke={CHART_COLORS.amber} strokeWidth={2} fill="url(#impressionsArea)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    {/* Engagement trend */}
                    <ChartCard title="Engagement Trend" subtitle="Daily engagement actions (likes + comments + shares + saves)">
                      {a.series.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">No metric history yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={a.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v: string) => fmtDate(v)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }}
                              minTickGap={24}
                            />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v: number) => fmtNumber(v)} />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: string) => fmtDate(v)} formatter={(v: any) => fmtNumber(v)} />
                            <Line type="monotone" dataKey="engagement" name="Engagement" stroke={CHART_COLORS.violet} strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    {/* Publishing frequency */}
                    <ChartCard title="Publishing Frequency" subtitle="Posts published per day (workspace-wide)">
                      {freqSeries.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">No published posts in range.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={freqSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'oklch(0.5 0 0 / 0.05)' }} />
                            <Bar dataKey="posts" name="Posts" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </div>

                  {/* Top posts for this account */}
                  <Card className="card-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Posts — this account</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {posts.filter((p) => p.accounts.some((pa) => pa.provider === a.provider)).length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">No posts published from this account in range.</div>
                      ) : (
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                <th className="pb-2 pr-3 font-medium">Post</th>
                                <th className="pb-2 pr-3 font-medium">Published</th>
                                <th className="pb-2 pr-3 text-right font-medium">Likes</th>
                                <th className="pb-2 pr-3 text-right font-medium">Comments</th>
                                <th className="pb-2 pr-3 text-right font-medium">Shares</th>
                                <th className="pb-2 pr-3 text-right font-medium">Reach</th>
                                <th className="pb-2 text-right font-medium">Engagement</th>
                              </tr>
                            </thead>
                            <tbody>
                              {posts
                                .filter((p) => p.accounts.some((pa) => pa.provider === a.provider))
                                .slice(0, 5)
                                .map((p) => {
                                  const totalEng = p.totals.likes + p.totals.comments + p.totals.shares + p.totals.saves
                                  return (
                                    <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                                      <td className="py-2 pr-3">
                                        <div className="line-clamp-1 max-w-[260px] text-sm font-medium text-foreground">{p.title ?? p.caption.slice(0, 60)}</div>
                                      </td>
                                      <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(p.publishedAt)}</td>
                                      <td className="py-2 pr-3 text-right text-foreground/80">{fmtNumber(p.totals.likes)}</td>
                                      <td className="py-2 pr-3 text-right text-foreground/80">{fmtNumber(p.totals.comments)}</td>
                                      <td className="py-2 pr-3 text-right text-foreground/80">{fmtNumber(p.totals.shares)}</td>
                                      <td className="py-2 pr-3 text-right text-foreground/80">{fmtNumber(p.totals.reach)}</td>
                                      <td className="py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{fmtNumber(totalEng)}</td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </div>

      {/* Post analytics — top 5 expandable */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Top Posts by Engagement</h2>
          <StatusPill tone="warning" dot={false}>DEMO</StatusPill>
        </div>
        {topPosts.length === 0 ? (
          <EmptyState icon={Sparkles} title="No published posts" description="Posts will appear here once published." />
        ) : (
          <Card className="card-premium">
            <CardContent className="p-2">
              <Accordion type="single" collapsible>
                {topPosts.map((p, idx) => {
                  const totalEng = p.totals.likes + p.totals.comments + p.totals.shares + p.totals.saves
                  return (
                    <AccordionItem key={p.id} value={p.id} className="px-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-4">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="line-clamp-1 text-sm font-medium text-foreground">{p.title ?? p.caption.slice(0, 80)}</div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{fmtDate(p.publishedAt)}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                {p.accounts.map((a, i) => {
                                  const m = providerMeta(a.provider)
                                  const I = m.icon
                                  return <I key={i} className={`h-3 w-3 ${m.color}`} />
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            {fmtNumber(totalEng)}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Overview */}
                          <div>
                            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overview</div>
                            <p className="text-sm text-foreground/80">{p.caption}</p>
                          </div>

                          {/* Performance grid */}
                          <div>
                            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Performance</div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                              {[
                                { k: 'Likes', v: p.totals.likes, c: 'text-rose-500' },
                                { k: 'Comments', v: p.totals.comments, c: 'text-blue-500' },
                                { k: 'Shares', v: p.totals.shares, c: 'text-emerald-500' },
                                { k: 'Saves', v: p.totals.saves, c: 'text-amber-500' },
                                { k: 'Views', v: p.totals.views, c: 'text-violet-500' },
                                { k: 'Reach', v: p.totals.reach, c: 'text-cyan-500' },
                                { k: 'Impressions', v: p.totals.impressions, c: 'text-orange-500' },
                                { k: 'Clicks', v: p.totals.clicks, c: 'text-pink-500' },
                              ].map((m) => (
                                <div key={m.k} className="rounded-lg border border-border/60 bg-card/40 p-2">
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.k}</div>
                                  <div className={`mt-0.5 text-sm font-semibold ${m.c}`}>{fmtNumber(m.v)}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Engagement over time chart */}
                          <div>
                            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Engagement Over Time</div>
                            {p.series.length === 0 ? (
                              <div className="py-6 text-center text-xs text-muted-foreground">No time-series metrics for this post.</div>
                            ) : (
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={p.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id={`post-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.35} />
                                      <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" vertical={false} />
                                  <XAxis dataKey="date" tickFormatter={(v: string) => fmtDate(v)} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} minTickGap={20} />
                                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.6)' }} tickFormatter={(v: number) => fmtNumber(v)} />
                                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: string) => fmtDate(v)} formatter={(v: any) => fmtNumber(v)} />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <Area type="monotone" dataKey="likes" name="Likes" stroke="oklch(0.65 0.20 15)" strokeWidth={1.5} fillOpacity={0.1} fill="oklch(0.65 0.20 15)" />
                                  <Area type="monotone" dataKey="comments" name="Comments" stroke={CHART_COLORS.blue} strokeWidth={1.5} fillOpacity={0.1} fill={CHART_COLORS.blue} />
                                  <Area type="monotone" dataKey="reach" name="Reach" stroke={CHART_COLORS.emerald} strokeWidth={1.5} fill={`url(#post-${p.id})`} />
                                </AreaChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Source footer */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
        <span>Source: <span className="font-medium text-foreground">{summary.sourceLabel}</span></span>
        <span>Last refreshed: {fmtDateTime(new Date())}</span>
      </div>
    </PageContainer>
  )
}
