import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize } from '@/lib/api'

export async function GET(req: Request) {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ summary: null, accounts: [], posts: [], crossPlatform: [] })

  const url = new URL(req.url)
  const range = url.searchParams.get('range') || '30d'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '6m' ? 180 : range === '12m' ? 365 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: wsId },
    include: { metrics: { where: { date: { gte: since } }, orderBy: { date: 'asc' } } },
  })

  const posts = await db.post.findMany({
    where: { workspaceId: wsId, status: 'PUBLISHED' },
    include: {
      metrics: { where: { date: { gte: since } }, orderBy: { date: 'asc' } },
      accounts: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  // Account analytics series
  const accountSeries = accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    followers: a.followers,
    reach30d: a.reach30d,
    impressions30d: a.impressions30d,
    engagementRate: a.engagementRate,
    series: a.metrics.map((m) => ({
      date: m.date,
      followers: m.followers,
      reach: m.reach,
      impressions: m.impressions,
      engagement: m.engagement,
      engagementRate: m.engagementRate,
    })),
  }))

  // Post analytics
  const postMetrics = posts.map((p) => {
    const total = p.metrics.reduce(
      (acc, m) => ({
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        saves: acc.saves + m.saves,
        views: acc.views + m.views,
        reach: acc.reach + m.reach,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
      }),
      { likes: 0, comments: 0, shares: 0, saves: 0, views: 0, reach: 0, impressions: 0, clicks: 0 },
    )
    return {
      id: p.id,
      title: p.title,
      caption: p.caption.slice(0, 100),
      publishedAt: p.publishedAt,
      accounts: p.accounts.map((a) => ({ provider: a.provider, displayName: a.displayName })),
      totals: total,
      series: p.metrics.map((m) => ({
        date: m.date,
        likes: m.likes, comments: m.comments, shares: m.shares,
        views: m.views, reach: m.reach, impressions: m.impressions,
      })),
    }
  })

  // Cross-platform aggregation
  const crossPlatform: Record<string, any> = {}
  for (const a of accounts) {
    const key = a.provider
    if (!crossPlatform[key]) {
      crossPlatform[key] = {
        provider: a.provider,
        followers: 0, reach: 0, impressions: 0, engagement: 0, posts: 0,
      }
    }
    crossPlatform[key].followers += a.followers
    crossPlatform[key].reach += a.reach30d
    crossPlatform[key].impressions += a.impressions30d
    crossPlatform[key].engagement += Math.round(a.followers * a.engagementRate / 100)
  }
  for (const p of posts) {
    for (const a of p.accounts) {
      if (crossPlatform[a.provider]) crossPlatform[a.provider].posts += 1
    }
  }

  const summary = {
    totalFollowers: accounts.reduce((s, a) => s + a.followers, 0),
    totalReach: accounts.reduce((s, a) => s + a.reach30d, 0),
    totalImpressions: accounts.reduce((s, a) => s + a.impressions30d, 0),
    avgEngagementRate: accounts.length
      ? Math.round((accounts.reduce((s, a) => s + a.engagementRate, 0) / accounts.length) * 10) / 10
      : 0,
    publishedPosts: posts.length,
    // NOTE: clearly labeled — metrics derived from provider APIs in DEMO mode
    sourceLabel: 'DEMO — provider metrics not live-verified',
  }

  return ok(serialize({ summary, accounts: accountSeries, posts: postMetrics, crossPlatform: Object.values(crossPlatform) }))
}
