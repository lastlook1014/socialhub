import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize } from '@/lib/api'

export async function GET(req: Request) {
  const wsId = await currentWorkspaceId()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const limit = Number(url.searchParams.get('limit') || 100)

  const where: any = {}
  if (wsId) where.workspaceId = wsId
  if (action) where.action = action

  const logs = await db.auditLog.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return ok(
    serialize(
      logs.map((l) => ({
        id: l.id,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        ipAddress: l.ipAddress,
        user: l.user ? { id: l.user.id, name: l.user.name, avatarUrl: l.user.avatarUrl } : null,
        createdAt: l.createdAt,
      })),
    ),
  )
}
