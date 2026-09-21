import { db } from '@/lib/db'
import { ok, serialize } from '@/lib/api'

export async function GET() {
  const uid = 'demo-admin'
  // Return the current user + workspace context
  const user = await db.user.findFirst({ where: { email: 'admin@northwind.io' } })
  if (!user) return ok({ user: null, workspace: null })

  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { include: { organization: true } } },
  })

  return ok(
    serialize({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        department: user.department,
      },
      workspace: membership?.workspace
        ? {
            id: membership.workspace.id,
            name: membership.workspace.name,
            organization: membership.workspace.organization.name,
          }
        : null,
      session: { id: uid, ipAddress: '10.0.0.5' },
    }),
  )
}
