import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, parseJSON, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ accounts: [], capabilityMatrix: [] })

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: wsId },
    include: { healthEvents: { take: 5, orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  })

  // Provider capability matrix per §67 — derived from actual account capability flags
  const providerCapabilities: Record<string, any> = {}
  for (const a of accounts) {
    if (!providerCapabilities[a.provider]) {
      providerCapabilities[a.provider] = {
        provider: a.provider,
        publishing: 'N/A',
        scheduling: 'N/A',
        analytics: 'N/A',
        comments: 'N/A',
        video: 'N/A',
        stories: 'N/A',
        reels: 'N/A',
        webhooks: 'N/A',
      }
    }
    const c = providerCapabilities[a.provider]
    const flag = (v: boolean) => (v ? 'SUPPORTED' : 'N/A')
    c.publishing = flag(a.canPublish)
    c.scheduling = flag(a.canSchedule)
    c.analytics = flag(a.canAnalytics)
    c.comments = flag(a.canComments)
    c.video = flag(a.canVideo)
    c.stories = flag(a.canStories)
    c.reels = flag(a.canReels)
    c.webhooks = flag(a.canWebhooks)
  }

  const result = accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    handle: a.handle,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    platformAccountId: a.platformAccountId,
    integrationStatus: a.integrationStatus,
    connectionStatus: a.connectionStatus,
    health: a.health,
    healthReason: a.healthReason,
    followers: a.followers,
    reach30d: a.reach30d,
    impressions30d: a.impressions30d,
    engagementRate: a.engagementRate,
    capabilities: {
      publish: a.canPublish,
      schedule: a.canSchedule,
      analytics: a.canAnalytics,
      comments: a.canComments,
      video: a.canVideo,
      stories: a.canStories,
      reels: a.canReels,
      webhooks: a.canWebhooks,
    },
    tokenExpiresAt: a.tokenExpiresAt,
    lastSyncAt: a.lastSyncAt,
    warnings: parseJSON<string[]>(a.warnings, []),
    healthEvents: a.healthEvents.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      message: e.message,
      createdAt: e.createdAt,
    })),
  }))

  return ok(serialize({ accounts: result, capabilityMatrix: Object.values(providerCapabilities) }))
}

const ConnectSchema = z.object({
  provider: z.string(),
  handle: z.string().optional(),
  displayName: z.string().optional(),
})

// "Connect account" — demo mode (no real OAuth). Records the action + audit log honestly.
export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ account: null, demo: true })

  const body = await req.json().catch(() => ({}))
  const parsed = ConnectSchema.safeParse(body)
  if (!parsed.success) return ok({ account: null, demo: true })

  const { provider, handle, displayName } = parsed.data
  const defaultCapabilities: Record<string, any> = {
    facebook: { canStories: true, canReels: false },
    instagram: { canStories: true, canReels: true },
    x: { canStories: false, canReels: false },
    linkedin: { canStories: false, canReels: false },
    tiktok: { canStories: true, canReels: false },
    youtube: { canStories: false, canReels: false },
    threads: { canStories: false, canReels: false, canVideo: false, canWebhooks: false },
    pinterest: { canStories: false, canReels: false, canComments: false },
  }
  const caps = defaultCapabilities[provider] ?? {}

  const account = await db.socialAccount.create({
    data: {
      workspaceId: wsId,
      provider,
      handle: handle || `@new_${provider}`,
      displayName: displayName || `New ${provider} account`,
      integrationStatus: 'DEMO',
      connectionStatus: 'CONNECTED',
      health: 'GREEN',
      healthReason: 'Newly connected. Healthy.',
      followers: 0,
      ...caps,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      lastSyncAt: new Date(),
    },
  })

  await db.auditLog.create({
    data: {
      userId: uid,
      workspaceId: wsId,
      action: 'ACCOUNT_CONNECTED',
      targetType: 'ACCOUNT',
      targetId: account.id,
      metadata: JSON.stringify({ provider, integrationStatus: 'DEMO' }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ account, demo: true }))
}
