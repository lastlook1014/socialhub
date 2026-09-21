import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, parseJSON } from '@/lib/api'

export async function GET() {
  const wsId = await currentWorkspaceId()
  if (!wsId) return ok({ kpis: [], accounts: [], activity: [] })

  const [
    accounts,
    scheduledPosts,
    pendingTasks,
    pendingApprovals,
    publishedToday,
    failedPublications,
    unreadComments,
    notifications,
    mailboxes,
    mailDelivery,
    auditLogs,
  ] = await Promise.all([
    db.socialAccount.findMany({ where: { workspaceId: wsId } }),
    db.post.count({ where: { workspaceId: wsId, status: 'SCHEDULED' } }),
    db.task.count({ where: { workspaceId: wsId, status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'BLOCKED'] } } }),
    db.post.count({ where: { workspaceId: wsId, status: 'AWAITING_APPROVAL' } }),
    db.post.count({ where: { workspaceId: wsId, status: 'PUBLISHED', publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.publicationAttempt.count({ where: { status: 'FAILED' } }),
    db.comment.count({ where: { workspaceId: wsId, moderationState: 'NEW' } }),
    db.notification.count({ where: { read: false } }),
    db.mailbox.count(),
    db.mailDeliveryEvent.findMany({ take: 50, orderBy: { timestamp: 'desc' } }),
    db.auditLog.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { user: true } }),
  ])

  const connected = accounts.length
  const active = accounts.filter((a) => a.connectionStatus === 'CONNECTED').length
  const attention = accounts.filter((a) => a.health !== 'GREEN').length
  const mailDelivered = mailDelivery.filter((d) => d.status === 'DELIVERED').length
  const mailBounced = mailDelivery.filter((d) => ['BOUNCED', 'REJECTED', 'FAILED'].includes(d.status)).length
  const mailDeliveryRate = mailDelivery.length ? Math.round((mailDelivered / mailDelivery.length) * 100) : 100

  const kpis = [
    { key: 'connected', label: 'Connected Accounts', value: connected, sub: `${active} active`, trend: 'up', icon: 'plug' },
    { key: 'attention', label: 'Accounts Needing Attention', value: attention, sub: attention === 0 ? 'All healthy' : 'Action recommended', trend: attention > 0 ? 'down' : 'flat', icon: 'alert' },
    { key: 'scheduled', label: 'Scheduled Posts', value: scheduledPosts, sub: 'In publishing queue', trend: 'up', icon: 'calendar' },
    { key: 'tasks', label: 'Pending Tasks', value: pendingTasks, sub: 'Across all teams', trend: 'flat', icon: 'check' },
    { key: 'approvals', label: 'Awaiting Approval', value: pendingApprovals, sub: 'Review pending', trend: 'flat', icon: 'clipboard' },
    { key: 'published', label: 'Published Today', value: publishedToday, sub: 'Successful publications', trend: 'up', icon: 'send' },
    { key: 'failed', label: 'Failed Publications', value: failedPublications, sub: 'Need attention', trend: failedPublications > 0 ? 'down' : 'flat', icon: 'x' },
    { key: 'comments', label: 'Unread Comments', value: unreadComments, sub: 'In unified inbox', trend: 'flat', icon: 'message' },
    { key: 'notifications', label: 'Notifications', value: notifications, sub: 'Unread', trend: 'flat', icon: 'bell' },
    { key: 'mailboxes', label: 'Mailboxes', value: mailboxes, sub: 'Organization mail', trend: 'flat', icon: 'mail' },
    { key: 'mailDelivery', label: 'Mail Delivery Health', value: `${mailDeliveryRate}%`, sub: `${mailBounced} bounced (24h)`, trend: mailDeliveryRate >= 95 ? 'up' : 'down', icon: 'server' },
  ]

  const accountStatus = accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    handle: a.handle,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    status: a.connectionStatus,
    health: a.health,
    healthReason: a.healthReason,
    integrationStatus: a.integrationStatus,
    followers: a.followers,
    lastSyncAt: a.lastSyncAt,
    tokenExpiresAt: a.tokenExpiresAt,
    warnings: parseJSON<string[]>(a.warnings, []),
  }))

  const activity = auditLogs.map((l) => ({
    id: l.id,
    action: l.action,
    user: l.user?.name ?? 'System',
    targetType: l.targetType,
    targetId: l.targetId,
    createdAt: l.createdAt,
  }))

  return ok(serialize({ kpis, accounts: accountStatus, activity }))
}
