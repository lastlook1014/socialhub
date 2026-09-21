import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ tasks: [] })

  const tasks = await db.task.findMany({
    where: { workspaceId: wsId },
    include: {
      creator: true, assignee: true, reviewer: true,
      comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(
    serialize(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        platform: t.platform,
        accountId: t.accountId,
        deadline: t.deadline,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        creator: { id: t.creator.id, name: t.creator.name, avatarUrl: t.creator.avatarUrl },
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, avatarUrl: t.assignee.avatarUrl } : null,
        reviewer: t.reviewer ? { id: t.reviewer.id, name: t.reviewer.name, avatarUrl: t.reviewer.avatarUrl } : null,
        comments: t.comments.map((c) => ({ id: c.id, body: c.body, user: c.user.name, createdAt: c.createdAt })),
      })),
    ),
  )
}

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'COMPLETED', 'BLOCKED']).default('NEW'),
  assigneeId: z.string().optional(),
  reviewerId: z.string().optional(),
  deadline: z.string().optional(),
  platform: z.string().optional(),
  accountId: z.string().optional(),
})

export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ task: null })

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return ok({ task: null, error: 'invalid' })

  const { title, description, priority, status, assigneeId, reviewerId, deadline, platform, accountId } = parsed.data

  const task = await db.task.create({
    data: {
      workspaceId: wsId, title, description, priority, status,
      creatorId: uid, assigneeId, reviewerId,
      deadline: deadline ? new Date(deadline) : null,
      platform, accountId,
    },
  })

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'TASK_CREATED',
      targetType: 'TASK', targetId: task.id,
      metadata: JSON.stringify({ title, assigneeId, priority }),
      ipAddress: '10.0.0.5',
    },
  })

  if (assigneeId) {
    await db.auditLog.create({
      data: {
        userId: uid, workspaceId: wsId, action: 'TASK_ASSIGNED',
        targetType: 'TASK', targetId: task.id,
        metadata: JSON.stringify({ assigneeId }),
        ipAddress: '10.0.0.5',
      },
    })
    await db.notification.create({
      data: {
        userId: assigneeId, workspaceId: wsId, type: 'TASK_ASSIGNED',
        title: 'New task assigned', body: title, read: false,
      },
    })
  }

  return ok(serialize({ task }))
}
