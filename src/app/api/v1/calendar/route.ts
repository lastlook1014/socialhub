import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, parseJSON } from '@/lib/api'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ items: [] })

  const posts = await db.post.findMany({
    where: { workspaceId: wsId, status: { in: ['SCHEDULED', 'AWAITING_APPROVAL', 'APPROVED'] } },
    include: { accounts: true, author: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return ok(
    serialize(
      posts.map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        status: p.status,
        scheduledAt: p.scheduledAt,
        accountIds: parseJSON<string[]>(p.accountIds, []),
        accounts: p.accounts.map((a) => ({
          id: a.id,
          provider: a.provider,
          displayName: a.displayName,
          avatarUrl: a.avatarUrl,
        })),
        author: { name: p.author.name, avatarUrl: p.author.avatarUrl },
      })),
    ),
  )
}
