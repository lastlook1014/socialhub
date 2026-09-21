import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ approvals: [] })

  // Posts that are awaiting approval or recently approved
  const posts = await db.post.findMany({
    where: { workspaceId: wsId, status: { in: ['AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'REJECTED'] } },
    include: {
      author: true, accounts: true,
      approvals: { include: { approver: true }, orderBy: { step: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return ok(
    serialize(
      posts.map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        status: p.status,
        createdAt: p.createdAt,
        author: { id: p.author.id, name: p.author.name, avatarUrl: p.author.avatarUrl },
        accounts: p.accounts.map((a) => ({ id: a.id, provider: a.provider, displayName: a.displayName })),
        approvals: p.approvals.map((a) => ({
          id: a.id, step: a.step, decision: a.decision, comment: a.comment,
          approver: a.approver?.name, decidedAt: a.decidedAt,
        })),
      })),
    ),
  )
}

const DecideSchema = z.object({
  postId: z.string(),
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().optional(),
})

export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ approval: null })

  const body = await req.json().catch(() => ({}))
  const parsed = DecideSchema.safeParse(body)
  if (!parsed.success) return ok({ approval: null, error: 'invalid' })

  const { postId, decision, comment } = parsed.data

  const existing = await db.approval.findFirst({
    where: { postId, decision: 'PENDING' },
    orderBy: { step: 'asc' },
  })
  if (!existing) return ok({ approval: null, error: 'no_pending' })

  const approval = await db.approval.update({
    where: { id: existing.id },
    data: { decision, comment, decidedAt: new Date(), approverId: uid },
  })

  // Update post status based on decision
  if (decision === 'APPROVED') {
    await db.post.update({ where: { id: postId }, data: { status: 'APPROVED' } })
  } else if (decision === 'REJECTED') {
    await db.post.update({ where: { id: postId }, data: { status: 'DRAFT' } })
  }

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: decision === 'APPROVED' ? 'POST_APPROVED' : 'POST_REJECTED',
      targetType: 'POST', targetId: postId,
      metadata: JSON.stringify({ step: existing.step, comment }),
      ipAddress: '10.0.0.5',
    },
  })

  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
  if (post) {
    await db.notification.create({
      data: {
        userId: post.authorId, workspaceId: wsId,
        type: decision === 'APPROVED' ? 'APPROVAL_RESULT' : 'APPROVAL_RESULT',
        title: decision === 'APPROVED' ? 'Post approved' : 'Post changes requested',
        body: comment || 'Review your post.', read: false,
      },
    })
  }

  return ok(serialize({ approval }))
}
