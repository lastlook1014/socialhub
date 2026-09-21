import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ comments: [] })

  const comments = await db.comment.findMany({
    where: { workspaceId: wsId },
    include: { account: true, post: true, assignedTo: true },
    orderBy: { createdAt: 'desc' },
  })

  return ok(
    serialize(
      comments.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        authorHandle: c.authorHandle,
        authorAvatarUrl: c.authorAvatarUrl,
        body: c.body,
        sentiment: c.sentiment,
        moderationState: c.moderationState,
        createdAt: c.createdAt,
        repliedAt: c.repliedAt,
        account: { id: c.account.id, provider: c.account.provider, displayName: c.account.displayName, avatarUrl: c.account.avatarUrl },
        post: c.post ? { id: c.post.id, caption: c.post.caption.slice(0, 120) } : null,
        assignedTo: c.assignedTo ? { id: c.assignedTo.id, name: c.assignedTo.name } : null,
      })),
    ),
  )
}

const ActionSchema = z.object({
  commentId: z.string(),
  action: z.enum(['REPLY', 'RESOLVE', 'ASSIGN', 'HIDE', 'REPORT']),
  reply: z.string().optional(),
  assigneeId: z.string().optional(),
})

export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ comment: null })

  const body = await req.json().catch(() => ({}))
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) return ok({ comment: null, error: 'invalid' })

  const { commentId, action, reply, assigneeId } = parsed.data

  const data: any = {}
  if (action === 'REPLY') {
    data.moderationState = 'REPLIED'
    data.repliedAt = new Date()
  } else if (action === 'RESOLVE') {
    data.moderationState = 'RESOLVED'
  } else if (action === 'ASSIGN') {
    data.assignedToId = assigneeId
  } else if (action === 'HIDE') {
    data.moderationState = 'HIDDEN'
  } else if (action === 'REPORT') {
    data.moderationState = 'REPORTED'
  }

  const comment = await db.comment.update({ where: { id: commentId }, data })

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'COMMENT_MODERATED',
      targetType: 'COMMENT', targetId: commentId,
      metadata: JSON.stringify({ action, reply: reply?.slice(0, 80) }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ comment }))
}
