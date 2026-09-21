import { db } from '@/lib/db'
import { ok, currentWorkspaceId, serialize, currentUserId } from '@/lib/api'
import { z } from 'zod'

export async function GET() {
  const domains = await db.mailDomain.findMany({
    include: {
      mailboxes: { include: { deliveries: { take: 10, orderBy: { timestamp: 'desc' } } } },
      aliases: true,
      groups: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const securityEvents = await db.mailSecurityEvent.findMany({ take: 20, orderBy: { createdAt: 'desc' } })

  return ok(
    serialize({
      domains: domains.map((d) => ({
        id: d.id,
        domain: d.domain,
        provider: d.provider,
        status: d.status,
        dns: {
          mx: d.mxStatus,
          spf: d.spfStatus,
          dkim: d.dkimStatus,
          dmarc: d.dmarcStatus,
          tls: d.tlsStatus,
          ptr: d.ptrStatus,
        },
        smtp: d.smtpHost ? { host: d.smtpHost, port: d.smtpPort } : null,
        imap: d.imapHost ? { host: d.imapHost, port: d.imapPort } : null,
        mailboxes: d.mailboxes.map((m) => ({
          id: m.id,
          emailAddress: m.emailAddress,
          displayName: m.displayName,
          firstName: m.firstName,
          lastName: m.lastName,
          department: m.department,
          role: m.role,
          status: m.status,
          quotaBytes: Number(m.quotaBytes),
          usedBytes: Number(m.usedBytes),
          forwardingTo: m.forwardingTo,
          recoveryAddress: m.recoveryAddress,
          recentDeliveries: m.deliveries.map((e) => ({
            id: e.id, status: e.status, recipient: e.recipient,
            subject: e.subject, timestamp: e.timestamp, errorCode: e.errorCode,
          })),
        })),
        aliases: d.aliases.map((a) => ({ id: a.id, alias: a.alias, forwardsTo: JSON.parse(a.forwardsTo) })),
        groups: d.groups.map((g) => ({ id: g.id, name: g.name, emailAddress: g.emailAddress, members: JSON.parse(g.members) })),
      })),
      securityEvents,
    }),
  )
}

const CreateMailboxSchema = z.object({
  domainId: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  quotaBytes: z.number().optional(),
})

export async function POST(req: Request) {
  const uid = await currentUserId()
  const body = await req.json().catch(() => ({}))
  const parsed = CreateMailboxSchema.safeParse(body)
  if (!parsed.success) return ok({ mailbox: null, error: 'invalid' })

  const { domainId, username, displayName, firstName, lastName, department, role, quotaBytes } = parsed.data
  const domain = await db.mailDomain.findUnique({ where: { id: domainId } })
  if (!domain) return ok({ mailbox: null, error: 'domain_not_found' })

  const emailAddress = `${username}@${domain.domain}`
  const existing = await db.mailbox.findUnique({ where: { emailAddress } })
  if (existing) return ok({ mailbox: null, error: 'duplicate_address' })

  const mailbox = await db.mailbox.create({
    data: {
      domainId, username, emailAddress, displayName, firstName, lastName, department, role,
      quotaBytes: quotaBytes ? BigInt(quotaBytes) : 5368709120n,
    },
  })

  await db.auditLog.create({
    data: {
      userId: uid ?? '', action: 'MAILBOX_CREATED',
      targetType: 'MAILBOX', targetId: mailbox.id,
      metadata: JSON.stringify({ emailAddress }),
      ipAddress: '10.0.0.5',
    },
  })

  return ok(serialize({ mailbox: { ...mailbox, quotaBytes: Number(mailbox.quotaBytes), usedBytes: Number(mailbox.usedBytes) } }))
}
