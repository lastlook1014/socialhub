import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize } from '@/lib/api'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ media: [] })

  const media = await db.mediaAsset.findMany({
    where: { workspaceId: wsId },
    orderBy: { createdAt: 'desc' },
  })

  return ok(
    serialize(
      media.map((m) => ({
        ...m,
        tags: m.tags ? JSON.parse(m.tags) : [],
      })),
    ),
  )
}
