import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize } from '@/lib/api'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ notifications: [] })

  const notifications = await db.notification.findMany({
    where: { workspaceId: wsId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unread = await db.notification.count({ where: { workspaceId: wsId, read: false } })

  return ok(serialize({ notifications, unread }))
}

export async function PATCH(req: Request) {
  const wsId = await currentWorkspaceId()
  const body = await req.json().catch(() => ({}))
  const { id, read } = body as { id?: string; read?: boolean }

  if (id) {
    await db.notification.update({ where: { id }, data: { read: read ?? true } })
  } else {
    // mark all read
    if (wsId) await db.notification.updateMany({ where: { workspaceId: wsId, read: false }, data: { read: true } })
  }
  return ok({ success: true })
}
