import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ reports: [] })

  const reports = await db.report.findMany({
    where: { workspaceId: wsId },
    orderBy: { createdAt: 'desc' },
  })

  return ok(serialize(reports))
}

const CreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['ACCOUNT_PERFORMANCE', 'POST_PERFORMANCE', 'FOLLOWER_GROWTH', 'REACH', 'ENGAGEMENT', 'PUBLISHING', 'TEAM_OPS', 'ACCOUNT_HEALTH', 'API_HEALTH', 'MAIL_HEALTH']),
  format: z.enum(['PDF', 'CSV', 'XLSX']).default('PDF'),
  dateRange: z.string().default('30d'),
})

export async function POST(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ report: null })

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return ok({ report: null, error: 'invalid' })

  const report = await db.report.create({
    data: { workspaceId: wsId, ...parsed.data, status: 'READY' },
  })

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'REPORT_GENERATED',
      targetType: 'REPORT', targetId: report.id,
      metadata: JSON.stringify({ type: parsed.data.type, format: parsed.data.format }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ report }))
}

export async function DELETE(req: Request) {
  const wsId = await currentWorkspaceId()
  const uid = await currentUserId()
  if (!wsId || !uid) return ok({ deleted: false })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return ok({ deleted: false, error: 'id required' })

  const existing = await db.report.findFirst({ where: { id, workspaceId: wsId } })
  if (!existing) return ok({ deleted: false, error: 'not found' })

  await db.report.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      userId: uid, workspaceId: wsId, action: 'REPORT_DELETED',
      targetType: 'REPORT', targetId: id,
      metadata: JSON.stringify({ name: existing.name, type: existing.type }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok({ deleted: true })
}
