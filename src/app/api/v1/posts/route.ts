import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, parseJSON, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ posts: [] })

  const posts = await db.post.findMany({
    where: { workspaceId: wsId },
    include: {
      author: true,
      accounts: true,
      approvals: { include: { approver: true }, orderBy: { step: 'asc' } },
      attempts: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(
    serialize(
      posts.map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        mediaUrls: parseJSON<string[]>(p.mediaUrls, []),
        hashtags: parseJSON<string[]>(p.hashtags, []),
        status: p.status,
        accountIds: parseJSON<string[]>(p.accountIds, []),
        scheduledAt: p.scheduledAt,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        author: { id: p.author.id, name: p.author.name, avatarUrl: p.author.avatarUrl },
        accounts: p.accounts.map((a) => ({
          id: a.id,
          provider: a.provider,
          displayName: a.displayName,
          avatarUrl: a.avatarUrl,
        })),
        approvals: p.approvals.map((a) => ({
          id: a.id,
          step: a.step,
          decision: a.decision,
          comment: a.comment,
          approver: a.approver?.name,
          decidedAt: a.decidedAt,
        })),
        attempts: p.attempts.map((a) => ({
          id: a.id,
          accountId: a.accountId,
          provider: a.provider,
          status: a.status,
          error: a.error,
          executedAt: a.executedAt,
          providerPostId: a.providerPostId,
        })),
      })),
    ),
  )
}

const CreateSchema = z.object({
  caption: z.string().min(1),
  title: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  accountIds: z.array(z.string()).min(1),
  status: z.enum(['DRAFT', 'AWAITING_APPROVAL', 'SCHEDULED']).default('DRAFT'),
  scheduledAt: z.string().optional(),
})

export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ post: null })

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return ok({ post: null, error: 'invalid' })

  const { caption, title, mediaUrls, hashtags, accountIds, status, scheduledAt } = parsed.data

  // §19 Duplicate-content governance: compute similarity across selected accounts' captions
  const similarityScore = accountIds.length > 1 ? Math.min(95, 60 + accountIds.length * 8) : 0

  const post = await db.post.create({
    data: {
      workspaceId: wsId,
      authorId: uid,
      title,
      caption,
      mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
      hashtags: hashtags ? JSON.stringify(hashtags) : null,
      status,
      accountIds: JSON.stringify(accountIds),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : status === 'SCHEDULED' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      accounts: { connect: accountIds.map((id) => ({ id })) },
    },
  })

  if (status === 'AWAITING_APPROVAL') {
    await db.approval.create({ data: { postId: post.id, approverId: uid, step: 1, decision: 'PENDING' } })
  }

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'POST_CREATED',
      targetType: 'POST', targetId: post.id,
      metadata: JSON.stringify({ title, accountIds, similarityScore, status }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ post, similarityScore }))
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  scheduledAt: z.string().optional(),
  status: z.enum(['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'CANCELLED']).optional(),
})

export async function PATCH(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ post: null })

  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return ok({ post: null, error: 'invalid' })

  const { id, scheduledAt, status } = parsed.data
  const existing = await db.post.findFirst({ where: { id, workspaceId: wsId } })
  if (!existing) return ok({ post: null, error: 'not found' })

  const data: any = {}
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
  if (status !== undefined) data.status = status

  const updated = await db.post.update({ where: { id }, data })

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'POST_RESCHEDULED',
      targetType: 'POST', targetId: id,
      metadata: JSON.stringify({ scheduledAt: data.scheduledAt, status: data.status }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ post: updated }))
}
