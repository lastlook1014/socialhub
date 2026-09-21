import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize } from '@/lib/api'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ members: [] })

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: wsId },
    include: { user: true },
  })

  // Performance metrics per member
  const tasksByAssignee = await db.task.groupBy({
    by: ['assigneeId'],
    where: { workspaceId: wsId },
    _count: { id: true },
  })
  const completedByAssignee = await db.task.groupBy({
    by: ['assigneeId'],
    where: { workspaceId: wsId, status: 'COMPLETED' },
    _count: { id: true },
  })
  const overdueByAssignee = await db.task.groupBy({
    by: ['assigneeId'],
    where: { workspaceId: wsId, status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'BLOCKED'] }, deadline: { lt: new Date() } },
    _count: { id: true },
  })

  const postsByAuthor = await db.post.groupBy({
    by: ['authorId'],
    where: { workspaceId: wsId },
    _count: { id: true },
  })

  const total = {
    assigned: Object.fromEntries(tasksByAssignee.map((t) => [t.assigneeId, t._count.id])),
    completed: Object.fromEntries(completedByAssignee.map((t) => [t.assigneeId, t._count.id])),
    overdue: Object.fromEntries(overdueByAssignee.map((t) => [t.assigneeId, t._count.id])),
    posts: Object.fromEntries(postsByAuthor.map((t) => [t.authorId, t._count.id])),
  }

  return ok(
    serialize({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          jobTitle: m.user.jobTitle,
          department: m.user.department,
          status: m.user.status,
          lastLoginAt: m.user.lastLoginAt,
        },
        performance: {
          tasksAssigned: total.assigned[m.userId] ?? 0,
          tasksCompleted: total.completed[m.userId] ?? 0,
          overdue: total.overdue[m.userId] ?? 0,
          postsAuthored: total.posts[m.userId] ?? 0,
        },
      })),
    }),
  )
}
