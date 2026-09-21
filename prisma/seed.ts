// Command Center — seed script
// Run with: bun run prisma/seed.ts
// Seeds a realistic enterprise dataset: org, workspaces, users, social accounts,
// posts (full lifecycle), tasks, approvals, comments, analytics, mail domain,
// mailboxes, aliases, groups, delivery events, notifications, audit logs.

import { PrismaClient } from '@prisma/client'
import { addDays, addHours, subDays, subHours } from 'date-fns'

const db = new PrismaClient()

const now = new Date()

async function main() {
  // Wipe
  await db.notification.deleteMany()
  await db.auditLog.deleteMany()
  await db.report.deleteMany()
  await db.mailDeliveryEvent.deleteMany()
  await db.mailSecurityEvent.deleteMany()
  await db.mailGroup.deleteMany()
  await db.mailAlias.deleteMany()
  await db.mailbox.deleteMany()
  await db.mailDomain.deleteMany()
  await db.comment.deleteMany()
  await db.postMetric.deleteMany()
  await db.accountMetric.deleteMany()
  await db.accountHealthEvent.deleteMany()
  await db.publicationAttempt.deleteMany()
  await db.approval.deleteMany()
  await db.taskComment.deleteMany()
  await db.task.deleteMany()
  await db.mediaAsset.deleteMany()
  await db.post.deleteMany()
  await db.socialAccount.deleteMany()
  await db.session.deleteMany()
  await db.workspaceMember.deleteMany()
  await db.user.deleteMany()
  await db.workspace.deleteMany()
  await db.organization.deleteMany()

  // ----- Organization + Workspace -----
  const org = await db.organization.create({
    data: {
      name: 'Northwind Communications',
      slug: 'northwind',
      domains: '["northwind.io"]',
    },
  })

  const ws = await db.workspace.create({
    data: {
      name: 'Marketing Operations',
      organizationId: org.id,
    },
  })

  // ----- Users (all roles per §8) -----
  const users = await Promise.all([
    db.user.create({ data: { email: 'admin@northwind.io', name: 'Aisha Rahman', role: 'SUPER_ADMIN', jobTitle: 'Head of Communications', department: 'Executive', avatarUrl: 'https://i.pravatar.cc/120?img=47', organizationId: org.id, lastLoginAt: subHours(now, 2) } }),
    db.user.create({ data: { email: 'ops.admin@northwind.io', name: 'Daniel Okafor', role: 'ADMIN', jobTitle: 'Operations Lead', department: 'Operations', avatarUrl: 'https://i.pravatar.cc/120?img=12', organizationId: org.id, lastLoginAt: subHours(now, 5) } }),
    db.user.create({ data: { email: 'maya.singh@northwind.io', name: 'Maya Singh', role: 'MANAGER', jobTitle: 'Social Media Manager', department: 'Marketing', avatarUrl: 'https://i.pravatar.cc/120?img=32', organizationId: org.id, lastLoginAt: subHours(now, 1) } }),
    db.user.create({ data: { email: 'leo.editor@northwind.io', name: 'Leo Müller', role: 'EDITOR', jobTitle: 'Content Editor', department: 'Content', avatarUrl: 'https://i.pravatar.cc/120?img=15', organizationId: org.id, lastLoginAt: subHours(now, 18) } }),
    db.user.create({ data: { email: 'priya.pub@northwind.io', name: 'Priya Nair', role: 'PUBLISHER', jobTitle: 'Publishing Specialist', department: 'Marketing', avatarUrl: 'https://i.pravatar.cc/120?img=45', organizationId: org.id, lastLoginAt: subHours(now, 8) } }),
    db.user.create({ data: { email: 'carlos.mod@northwind.io', name: 'Carlos Mendez', role: 'MODERATOR', jobTitle: 'Community Moderator', department: 'Support', avatarUrl: 'https://i.pravatar.cc/120?img=60', organizationId: org.id, lastLoginAt: subHours(now, 3) } }),
    db.user.create({ data: { email: 'sara.analyst@northwind.io', name: 'Sara Khalil', role: 'ANALYST', jobTitle: 'Performance Analyst', department: 'Insights', avatarUrl: 'https://i.pravatar.cc/120?img=20', organizationId: org.id, lastLoginAt: subHours(now, 26) } }),
    db.user.create({ data: { email: 'mail.admin@northwind.io', name: 'Hiroshi Tanaka', role: 'MAIL_ADMIN', jobTitle: 'Mail Infrastructure Admin', department: 'IT', avatarUrl: 'https://i.pravatar.cc/120?img=33', organizationId: org.id, lastLoginAt: subHours(now, 4) } }),
    db.user.create({ data: { email: 'viewer@northwind.io', name: 'Emma Laurent', role: 'VIEWER', jobTitle: 'Stakeholder', department: 'Executive', avatarUrl: 'https://i.pravatar.cc/120?img=48', organizationId: org.id, lastLoginAt: subDays(now, 2) } }),
  ])

  const [admin, opsAdmin, maya, leo, priya, carlos, sara, hiroshi, emma] = users

  await Promise.all(
    users.map((u) =>
      db.workspaceMember.create({
        data: { workspaceId: ws.id, userId: u.id, role: u.role === 'SUPER_ADMIN' ? 'OWNER' : u.role === 'ADMIN' ? 'ADMIN' : u.role === 'MANAGER' ? 'MANAGER' : u.role === 'VIEWER' ? 'VIEWER' : 'MEMBER' },
      }),
    ),
  )

  // ----- Social Accounts (DEMO mode — clearly labeled) -----
  const accounts = await Promise.all([
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'facebook', handle: '@NorthwindHQ', displayName: 'Northwind HQ',
        avatarUrl: 'https://i.pravatar.cc/120?img=5', platformAccountId: 'fb_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'GREEN',
        healthReason: 'All systems nominal. Last sync successful.',
        followers: 48210, reach30d: 312000, impressions30d: 540000, engagementRate: 4.2,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: true, canStories: true, canReels: false, canWebhooks: true,
        tokenExpiresAt: addDays(now, 18), lastSyncAt: subHours(now, 1),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'instagram', handle: '@northwind.creative', displayName: 'Northwind Creative',
        avatarUrl: 'https://i.pravatar.cc/120?img=23', platformAccountId: 'ig_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'YELLOW',
        healthReason: 'OAuth token expires in 3 days. Reconnect to keep publishing.',
        followers: 31400, reach30d: 198000, impressions30d: 410000, engagementRate: 5.8,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: true, canStories: true, canReels: true, canWebhooks: true,
        tokenExpiresAt: addDays(now, 3), lastSyncAt: subHours(now, 2),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'x', handle: '@northwind', displayName: 'Northwind',
        avatarUrl: 'https://i.pravatar.cc/120?img=8', platformAccountId: 'x_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'GREEN',
        healthReason: 'Healthy.',
        followers: 22900, reach30d: 410000, impressions30d: 980000, engagementRate: 2.9,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: true, canStories: false, canReels: false, canWebhooks: true,
        tokenExpiresAt: addDays(now, 60), lastSyncAt: subHours(now, 3),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'linkedin', handle: 'Northwind Inc.', displayName: 'Northwind Inc. (Company Page)',
        avatarUrl: 'https://i.pravatar.cc/120?img=14', platformAccountId: 'li_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'GREEN',
        healthReason: 'Healthy.',
        followers: 18400, reach30d: 92000, impressions30d: 145000, engagementRate: 6.1,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: true, canStories: false, canReels: false, canWebhooks: true,
        tokenExpiresAt: addDays(now, 45), lastSyncAt: subHours(now, 4),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'tiktok', handle: '@northwind', displayName: 'Northwind',
        avatarUrl: 'https://i.pravatar.cc/120?img=28', platformAccountId: 'tt_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'ORANGE',
        healthReason: 'Recent video rejected by provider: unsupported aspect ratio.',
        followers: 67200, reach30d: 1240000, impressions30d: 2100000, engagementRate: 9.4,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: true, canStories: true, canReels: false, canWebhooks: true,
        tokenExpiresAt: addDays(now, 30), lastSyncAt: subHours(now, 6),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'youtube', handle: 'Northwind Channel', displayName: 'Northwind Channel',
        avatarUrl: 'https://i.pravatar.cc/120?img=51', platformAccountId: 'yt_001',
        integrationStatus: 'DEMO', connectionStatus: 'EXPIRED', health: 'RED',
        healthReason: 'Connection expired. Reconnect this account to resume analytics sync.',
        followers: 12300, reach30d: 64000, impressions30d: 112000, engagementRate: 3.8,
        canPublish: true, canSchedule: false, canAnalytics: true, canComments: true, canVideo: true, canStories: false, canReels: false, canWebhooks: true,
        tokenExpiresAt: subDays(now, 2), lastSyncAt: subDays(now, 2),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'threads', handle: '@northwind', displayName: 'Northwind',
        avatarUrl: 'https://i.pravatar.cc/120?img=36', platformAccountId: 'th_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'GREEN',
        healthReason: 'Healthy.',
        followers: 8900, reach30d: 54000, impressions30d: 98000, engagementRate: 4.7,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: true, canVideo: false, canStories: false, canReels: false, canWebhooks: false,
        tokenExpiresAt: addDays(now, 50), lastSyncAt: subHours(now, 5),
      },
    }),
    db.socialAccount.create({
      data: {
        workspaceId: ws.id, provider: 'pinterest', handle: 'northwind', displayName: 'Northwind Pins',
        avatarUrl: 'https://i.pravatar.cc/120?img=41', platformAccountId: 'pn_001',
        integrationStatus: 'DEMO', connectionStatus: 'CONNECTED', health: 'GREEN',
        healthReason: 'Healthy.',
        followers: 15600, reach30d: 78000, impressions30d: 168000, engagementRate: 2.1,
        canPublish: true, canSchedule: true, canAnalytics: true, canComments: false, canVideo: true, canStories: false, canReels: false, canWebhooks: true,
        tokenExpiresAt: addDays(now, 40), lastSyncAt: subHours(now, 7),
      },
    }),
  ])

  const [fb, ig, x, li, tt, yt, th, pn] = accounts

  // Health events
  await db.accountHealthEvent.create({ data: { accountId: ig.id, type: 'TOKEN_EXPIRED', severity: 'WARNING', message: 'OAuth token expires in 3 days.' } })
  await db.accountHealthEvent.create({ data: { accountId: tt.id, type: 'REJECTED_CONTENT', severity: 'ERROR', message: 'Video rejected: unsupported aspect ratio (1:1 not allowed for this format).' } })
  await db.accountHealthEvent.create({ data: { accountId: yt.id, type: 'AUTH_FAILED', severity: 'CRITICAL', message: 'Token expired. Reconnect required.' } })
  await db.accountHealthEvent.create({ data: { accountId: x.id, type: 'RATE_LIMITED', severity: 'INFO', message: 'Approaching daily post limit (45/50).' } })

  // ----- Media assets -----
  const media = await Promise.all([
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'product-launch-hero.jpg', type: 'IMAGE', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400', size: 820000, width: 1920, height: 1080, tags: '["product","launch","hero"]', folder: 'Q4 Campaign', uploadedById: leo.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'team-portrait.jpg', type: 'IMAGE', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', size: 640000, width: 1600, height: 900, tags: '["team","culture"]', folder: 'Brand', uploadedById: leo.id, favorite: true } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'demo-reel.mp4', type: 'VIDEO', mimeType: 'video/mp4', url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400', size: 18400000, width: 1080, height: 1920, duration: 45, tags: '["video","reel"]', folder: 'Q4 Campaign', uploadedById: leo.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'infographic-stats.png', type: 'IMAGE', mimeType: 'image/png', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400', size: 410000, width: 1200, height: 630, tags: '["infographic","stats"]', folder: 'Brand', uploadedById: sara.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'holiday-promo.jpg', type: 'IMAGE', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238801c?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238801c?w=400', size: 720000, width: 1920, height: 1080, tags: '["holiday","promo"]', folder: 'Q4 Campaign', uploadedById: leo.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'founder-qa.mp4', type: 'VIDEO', mimeType: 'video/mp4', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7480?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7480?w=400', size: 28000000, width: 1920, height: 1080, duration: 180, tags: '["founder","qa"]', folder: 'Brand', uploadedById: leo.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'customer-story.jpg', type: 'IMAGE', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=400', size: 580000, width: 1600, height: 900, tags: '["customer","story"]', folder: 'Case Studies', uploadedById: leo.id } }),
    db.mediaAsset.create({ data: { workspaceId: ws.id, filename: 'event-recap.gif', type: 'GIF', mimeType: 'image/gif', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400', size: 2100000, width: 1280, height: 720, tags: '["event","recap"]', folder: 'Events', uploadedById: leo.id } }),
  ])

  // ----- Posts (full lifecycle) -----
  const posts = await Promise.all([
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Q4 Product Launch Announcement',
        caption: 'Introducing our newest product line — built for teams who move fast. Available now. #NorthwindLaunch',
        mediaUrls: '["https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800"]',
        hashtags: '["NorthwindLaunch","ProductLaunch","Q4"]',
        status: 'PUBLISHED', accountIds: JSON.stringify([fb.id, ig.id, x.id, li.id]),
        scheduledAt: subDays(now, 3), publishedAt: subDays(now, 3),
        accounts: { connect: [fb.id, ig.id, x.id, li.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Behind the Scenes — How We Built It',
        caption: 'A look inside our engineering process. From whiteboard to production in 90 days.',
        mediaUrls: '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"]',
        hashtags: '["BehindTheScenes","Engineering"]',
        status: 'SCHEDULED', accountIds: JSON.stringify([ig.id, li.id]),
        scheduledAt: addDays(now, 2),
        accounts: { connect: [ig.id, li.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Customer Story — How Acme Co. Scaled 3x',
        caption: 'Read how Acme Co. used Northwind to triple their reach in 6 months.',
        mediaUrls: '["https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800"]',
        hashtags: '["CustomerStory","CaseStudy"]',
        status: 'AWAITING_APPROVAL', accountIds: JSON.stringify([fb.id, ig.id, x.id, li.id, tt.id]),
        accounts: { connect: [fb.id, ig.id, x.id, li.id, tt.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Holiday Promo Teaser',
        caption: 'Something special is coming this holiday season. Stay tuned. #NorthwindHolidays',
        mediaUrls: '["https://images.unsplash.com/photo-1549465220-1a8b9238801c?w=800"]',
        hashtags: '["NorthwindHolidays","Holiday"]',
        status: 'APPROVED', accountIds: JSON.stringify([fb.id, ig.id, tt.id]),
        scheduledAt: addDays(now, 5),
        accounts: { connect: [fb.id, ig.id, tt.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Founder Q&A — Live Session',
        caption: 'Join our CEO for a live Q&A session this Friday. Submit your questions in the comments.',
        mediaUrls: '["https://images.unsplash.com/photo-1620712943543-bcc4688e7480?w=800"]',
        hashtags: '["AMA","FounderQA"]',
        status: 'DRAFT', accountIds: JSON.stringify([li.id, yt.id]),
        accounts: { connect: [li.id, yt.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Industry Report 2024',
        caption: 'Our annual state-of-the-industry report is now available. Key insights inside.',
        mediaUrls: '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"]',
        hashtags: '["IndustryReport","Insights"]',
        status: 'PUBLISHED', accountIds: JSON.stringify([li.id, x.id]),
        publishedAt: subDays(now, 7),
        accounts: { connect: [li.id, x.id].map((id) => ({ id })) },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Failed — Wrong Aspect Ratio',
        caption: 'Quick demo of our new feature.',
        mediaUrls: '["https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800"]',
        status: 'FAILED', accountIds: JSON.stringify([tt.id]),
        accounts: { connect: [{ id: tt.id }] },
      },
    }),
    db.post.create({
      data: {
        workspaceId: ws.id, authorId: leo.id, title: 'Event Recap — Summit 2024',
        caption: 'What an incredible summit. Thank you to everyone who joined us.',
        mediaUrls: '["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"]',
        hashtags: '["Summit2024","Recap"]',
        status: 'PUBLISHED', accountIds: JSON.stringify([fb.id, ig.id, li.id]),
        publishedAt: subDays(now, 14),
        accounts: { connect: [fb.id, ig.id, li.id].map((id) => ({ id })) },
      },
    }),
  ])

  const [p1, p2, p3, p4, p5, p6, p7, p8] = posts

  // Publication attempts
  await db.publicationAttempt.create({ data: { postId: p1.id, accountId: fb.id, provider: 'facebook', scheduledTime: subDays(now, 3), executedAt: subDays(now, 3), status: 'PUBLISHED', providerPostId: 'fb_post_001' } })
  await db.publicationAttempt.create({ data: { postId: p1.id, accountId: ig.id, provider: 'instagram', scheduledTime: subDays(now, 3), executedAt: subDays(now, 3), status: 'PUBLISHED', providerPostId: 'ig_post_001' } })
  await db.publicationAttempt.create({ data: { postId: p1.id, accountId: x.id, provider: 'x', scheduledTime: subDays(now, 3), executedAt: subDays(now, 3), status: 'PUBLISHED', providerPostId: 'x_post_001' } })
  await db.publicationAttempt.create({ data: { postId: p1.id, accountId: li.id, provider: 'linkedin', scheduledTime: subDays(now, 3), executedAt: subDays(now, 3), status: 'PUBLISHED', providerPostId: 'li_post_001' } })
  await db.publicationAttempt.create({ data: { postId: p2.id, accountId: ig.id, provider: 'instagram', scheduledTime: addDays(now, 2), status: 'QUEUED' } })
  await db.publicationAttempt.create({ data: { postId: p2.id, accountId: li.id, provider: 'linkedin', scheduledTime: addDays(now, 2), status: 'QUEUED' } })
  await db.publicationAttempt.create({ data: { postId: p7.id, accountId: tt.id, provider: 'tiktok', executedAt: subDays(now, 1), status: 'FAILED', error: 'Provider rejected: unsupported aspect ratio 1:1 for this format.', retryCount: 2 } })

  // Approvals
  await db.approval.create({ data: { postId: p3.id, approverId: maya.id, step: 1, decision: 'PENDING', comment: 'Awaiting manager review.' } })
  await db.approval.create({ data: { postId: p4.id, approverId: maya.id, step: 1, decision: 'APPROVED', decidedAt: subHours(now, 6), comment: 'Looks great. Approved.' } })
  await db.approval.create({ data: { postId: p4.id, approverId: admin.id, step: 2, decision: 'APPROVED', decidedAt: subHours(now, 4), comment: 'Final approval.' } })

  // Post metrics (30 days of data for published posts)
  for (const post of [p1, p6, p8]) {
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const base = post.id === p1.id ? 1000 : post.id === p6.id ? 600 : 400
      await db.postMetric.create({
        data: {
          postId: post.id, date,
          likes: Math.floor(base * (1 - i / 60) + Math.random() * 100),
          comments: Math.floor(base * 0.05 * (1 - i / 60) + Math.random() * 10),
          shares: Math.floor(base * 0.08 * (1 - i / 60) + Math.random() * 15),
          saves: Math.floor(base * 0.03 * (1 - i / 60) + Math.random() * 5),
          views: Math.floor(base * 8 * (1 - i / 60) + Math.random() * 500),
          reach: Math.floor(base * 5 * (1 - i / 60) + Math.random() * 300),
          impressions: Math.floor(base * 6 * (1 - i / 60) + Math.random() * 400),
          clicks: Math.floor(base * 0.5 * (1 - i / 60) + Math.random() * 50),
        },
      })
    }
  }

  // Account metrics (30 days)
  for (const acc of accounts) {
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const growth = (30 - i) * (acc.followers / 1000) * 0.5
      await db.accountMetric.create({
        data: {
          accountId: acc.id, date,
          followers: acc.followers - Math.floor(growth),
          reach: Math.floor(acc.reach30d / 30 * (0.8 + Math.random() * 0.4)),
          impressions: Math.floor(acc.impressions30d / 30 * (0.8 + Math.random() * 0.4)),
          engagement: Math.floor(acc.followers * acc.engagementRate / 100 * (0.8 + Math.random() * 0.4)),
          engagementRate: acc.engagementRate * (0.9 + Math.random() * 0.2),
        },
      })
    }
  }

  // ----- Tasks -----
  const tasks = await Promise.all([
    db.task.create({ data: { workspaceId: ws.id, title: 'Draft Q1 content calendar', description: 'Plan first-quarter content themes and posting schedule across all platforms.', status: 'IN_PROGRESS', priority: 'HIGH', creatorId: maya.id, assigneeId: leo.id, reviewerId: maya.id, deadline: addDays(now, 4), platform: 'all' } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Approve Customer Story post', description: 'Review and approve the Acme Co. customer story before publishing.', status: 'REVIEW', priority: 'HIGH', creatorId: leo.id, assigneeId: maya.id, reviewerId: admin.id, deadline: addDays(now, 1) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Reconnect YouTube account', description: 'OAuth token expired. Reconnect to resume analytics sync.', status: 'NEW', priority: 'URGENT', creatorId: sara.id, assigneeId: opsAdmin.id, deadline: addDays(now, 2), accountId: yt.id } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Moderate TikTok comments', description: 'Review and respond to comments on the latest TikTok video.', status: 'ASSIGNED', priority: 'MEDIUM', creatorId: maya.id, assigneeId: carlos.id, deadline: addHours(now, 6), platform: 'tiktok' } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Prepare monthly analytics report', description: 'Compile October performance report across all platforms.', status: 'NEW', priority: 'MEDIUM', creatorId: maya.id, assigneeId: sara.id, deadline: addDays(now, 7) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Design holiday campaign assets', description: 'Create visual assets for the December holiday promotion.', status: 'IN_PROGRESS', priority: 'HIGH', creatorId: maya.id, assigneeId: leo.id, deadline: addDays(now, 10) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Set up mail aliases for support team', description: 'Configure support@ and help@ aliases routing to the support mailbox group.', status: 'ASSIGNED', priority: 'MEDIUM', creatorId: opsAdmin.id, assigneeId: hiroshi.id, deadline: addDays(now, 3) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Review duplicate content warning', description: 'Similar captions detected across FB and IG for the launch post. Review and confirm compliance.', status: 'BLOCKED', priority: 'HIGH', creatorId: sara.id, assigneeId: maya.id, deadline: addDays(now, 1) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Founder Q&A prep', description: 'Collect and curate community questions for the founder Q&A session.', status: 'COMPLETED', priority: 'LOW', creatorId: maya.id, assigneeId: carlos.id, reviewerId: maya.id, deadline: subDays(now, 2) } }),
    db.task.create({ data: { workspaceId: ws.id, title: 'Update LinkedIn company page branding', description: 'Refresh banner and about section for the new quarter.', status: 'COMPLETED', priority: 'LOW', creatorId: maya.id, assigneeId: leo.id, reviewerId: maya.id, deadline: subDays(now, 5) } }),
  ])

  // Task comments
  await db.taskComment.create({ data: { taskId: tasks[0].id, userId: leo.id, body: 'Started drafting. Will share by EOD tomorrow.' } })
  await db.taskComment.create({ data: { taskId: tasks[0].id, userId: maya.id, body: 'Great. Make sure to include the TikTok slot for the 15th.' } })
  await db.taskComment.create({ data: { taskId: tasks[7].id, userId: sara.id, body: 'Similarity score 78%. Likely safe but flagging for human review per §19 governance.' } })

  // ----- Comments / Inbox -----
  const comments = [
    { account: fb, post: p1, author: 'Jordan Lee', handle: '@jordanlee', body: 'This is exactly what we needed. Congrats on the launch! 🎉', sentiment: 'POSITIVE', state: 'NEW' },
    { account: ig, post: p1, author: 'Priya K.', handle: '@priya.k', body: 'Love the design. Where can I learn more?', sentiment: 'POSITIVE', state: 'NEW' },
    { account: x, post: p1, author: 'Mark T.', handle: '@markt_dev', body: 'Finally! Been waiting for this.', sentiment: 'POSITIVE', state: 'REPLIED' },
    { account: ig, post: p8, author: 'Sara M.', handle: '@sara.m', body: 'The summit was incredible. Thank you for organizing!', sentiment: 'POSITIVE', state: 'RESOLVED' },
    { account: fb, post: p1, author: 'Angry Customer', handle: '@anon', body: 'Why is this so expensive? Not worth it.', sentiment: 'NEGATIVE', state: 'NEW' },
    { account: tt, post: p7, author: 'TikTok User', handle: '@tt_user', body: 'Video keeps failing to load.', sentiment: 'NEGATIVE', state: 'NEW' },
    { account: li, post: p6, author: 'Industry Analyst', handle: '@analyst', body: 'Great insights in this report. Will share with my team.', sentiment: 'POSITIVE', state: 'NEW' },
    { account: x, post: p6, author: 'Reader', handle: '@reader_42', body: 'Can you share the full PDF?', sentiment: 'NEUTRAL', state: 'NEW' },
    { account: fb, post: p1, author: 'Question Box', handle: '@qbox', body: 'Is there a team plan available?', sentiment: 'NEUTRAL', state: 'NEW' },
    { account: ig, post: p1, author: 'Fan Account', handle: '@fan_page', body: 'OBSESSED with this 🔥🔥', sentiment: 'POSITIVE', state: 'NEW' },
    { account: tt, post: p7, author: 'Confused User', handle: '@confused', body: "I can't find the link in bio.", sentiment: 'MIXED', state: 'NEW' },
    { account: x, post: p6, author: 'Competitor Watch', handle: '@comp_watch', body: 'Interesting strategy. Curious to see how it plays out.', sentiment: 'NEUTRAL', state: 'NEW' },
  ]

  for (const c of comments) {
    await db.comment.create({
      data: {
        workspaceId: ws.id, accountId: c.account.id, postId: c.post?.id || null,
        authorName: c.author, authorHandle: c.handle,
        authorAvatarUrl: `https://i.pravatar.cc/80?u=${c.handle}`,
        body: c.body, sentiment: c.sentiment, moderationState: c.state,
        createdAt: subHours(now, Math.floor(Math.random() * 72)),
        repliedAt: c.state === 'REPLIED' || c.state === 'RESOLVED' ? subHours(now, Math.floor(Math.random() * 48)) : null,
        assignedToId: c.state === 'NEW' && Math.random() > 0.5 ? carlos.id : null,
      },
    })
  }

  // ----- Mail Center -----
  const domain = await db.mailDomain.create({
    data: {
      domain: 'northwind.io', provider: 'SELF_HOSTED', status: 'HEALTHY',
      mxStatus: 'VERIFIED', spfStatus: 'VERIFIED', dkimStatus: 'VERIFIED',
      dmarcStatus: 'VERIFIED', tlsStatus: 'VERIFIED', ptrStatus: 'VERIFIED',
      smtpHost: 'smtp.northwind.io', smtpPort: 587,
      imapHost: 'imap.northwind.io', imapPort: 993,
    },
  })

  const mailboxes = await Promise.all([
    db.mailbox.create({ data: { domainId: domain.id, username: 'ahmed', emailAddress: 'ahmed@northwind.io', displayName: 'Ahmed Khan', firstName: 'Ahmed', lastName: 'Khan', department: 'Marketing', role: 'EDITOR', quotaBytes: 5368709120, usedBytes: 1840000000 } }),
    db.mailbox.create({ data: { domainId: domain.id, username: 'maya', emailAddress: 'maya@northwind.io', displayName: 'Maya Singh', firstName: 'Maya', lastName: 'Singh', department: 'Marketing', role: 'MANAGER', quotaBytes: 10737418240, usedBytes: 4200000000 } }),
    db.mailbox.create({ data: { domainId: domain.id, username: 'operations', emailAddress: 'operations@northwind.io', displayName: 'Operations Team', department: 'Operations', role: 'SHARED', quotaBytes: 26843545600, usedBytes: 12800000000 } }),
    db.mailbox.create({ data: { domainId: domain.id, username: 'support', emailAddress: 'support@northwind.io', displayName: 'Support Team', department: 'Support', role: 'SHARED', quotaBytes: 26843545600, usedBytes: 8900000000 } }),
    db.mailbox.create({ data: { domainId: domain.id, username: 'manager', emailAddress: 'manager@northwind.io', displayName: 'Manager Inbox', department: 'Marketing', role: 'MANAGER', quotaBytes: 5368709120, usedBytes: 4900000000 } }),
    db.mailbox.create({ data: { domainId: domain.id, username: 'staff01', emailAddress: 'staff01@northwind.io', displayName: 'Staff 01', department: 'Marketing', role: 'EDITOR', quotaBytes: 5368709120, usedBytes: 1200000000, status: 'DISABLED' } }),
  ])

  await db.mailAlias.create({ data: { domainId: domain.id, alias: 'info', forwardsTo: JSON.stringify(['operations@northwind.io', 'maya@northwind.io']) } })
  await db.mailAlias.create({ data: { domainId: domain.id, alias: 'sales', forwardsTo: JSON.stringify(['maya@northwind.io']) } })
  await db.mailAlias.create({ data: { domainId: domain.id, alias: 'help', forwardsTo: JSON.stringify(['support@northwind.io']) } })

  await db.mailGroup.create({ data: { domainId: domain.id, name: 'social-team', emailAddress: 'social-team@northwind.io', members: JSON.stringify(['maya@northwind.io', 'ahmed@northwind.io', 'priya.pub@northwind.io', 'leo.editor@northwind.io']) } })
  await db.mailGroup.create({ data: { domainId: domain.id, name: 'ops-team', emailAddress: 'ops-team@northwind.io', members: JSON.stringify(['operations@northwind.io', 'ops.admin@northwind.io']) } })

  // Delivery events
  const deliveryStatuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DEFERRED', 'BOUNCED', 'REJECTED', 'FAILED']
  for (let i = 0; i < 24; i++) {
    const mb = mailboxes[i % mailboxes.length]
    const status = deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)]
    await db.mailDeliveryEvent.create({
      data: {
        mailboxId: mb.id, direction: 'OUTBOUND',
        sender: mb.emailAddress,
        recipient: `recipient${i}@external.com`,
        subject: `Campaign update ${i}`,
        status,
        errorCode: status === 'BOUNCED' ? '5.1.1' : status === 'REJECTED' ? '5.7.1' : status === 'FAILED' ? '4.4.7' : null,
        providerResponse: status === 'DELIVERED' ? '250 OK' : status === 'BOUNCED' ? '550 User unknown' : status === 'REJECTED' ? '550 SPF check failed' : null,
        timestamp: subHours(now, i * 1.5),
      },
    })
  }

  await db.mailSecurityEvent.create({ data: { type: 'BRUTE_FORCE', severity: 'WARNING', mailboxId: mailboxes[5].id, message: '5 failed login attempts from 198.51.100.42 in 2 minutes. Account temporarily suspended.' } })
  await db.mailSecurityEvent.create({ data: { type: 'BOUNCE_SPIKE', severity: 'INFO', message: 'Bounce rate exceeded 2% threshold on operations@ mailbox in the last hour.' } })

  // ----- Notifications -----
  await db.notification.create({ data: { userId: maya.id, workspaceId: ws.id, type: 'APPROVAL_REQUEST', title: 'Approval needed', body: 'Customer Story post awaiting your review.', read: false } })
  await db.notification.create({ data: { userId: leo.id, workspaceId: ws.id, type: 'TASK_ASSIGNED', title: 'New task assigned', body: 'Draft Q1 content calendar — due in 4 days.', read: false } })
  await db.notification.create({ data: { userId: priya.id, workspaceId: ws.id, type: 'PUBLISHED', title: 'Post published', body: 'Q4 Product Launch Announcement published to 4 accounts.', read: true } })
  await db.notification.create({ data: { userId: sara.id, workspaceId: ws.id, type: 'FAILED', title: 'Publication failed', body: 'TikTok rejected a video. Review required.', read: false } })
  await db.notification.create({ data: { userId: admin.id, workspaceId: ws.id, type: 'OAUTH_EXPIRED', title: 'Connection expired', body: 'YouTube account requires reconnection.', read: false } })
  await db.notification.create({ data: { userId: carlos.id, workspaceId: ws.id, type: 'PROVIDER_WARNING', title: 'New comments to moderate', body: '6 unread comments across Facebook and TikTok.', read: false } })
  await db.notification.create({ data: { userId: hiroshi.id, workspaceId: ws.id, type: 'MAIL_SECURITY', title: 'Mail security event', body: 'Brute-force protection triggered on staff01@ mailbox.', read: false } })
  await db.notification.create({ data: { userId: maya.id, workspaceId: ws.id, type: 'RATE_LIMIT', title: 'Approaching rate limit', body: 'X account nearing daily post limit (45/50).', read: true } })

  // ----- Audit logs -----
  const auditActions = [
    { action: 'LOGIN', userId: admin.id, metadata: '{"method":"password"}' },
    { action: 'LOGIN', userId: maya.id, metadata: '{"method":"password"}' },
    { action: 'ACCOUNT_CONNECTED', userId: opsAdmin.id, targetType: 'ACCOUNT', targetId: tt.id, metadata: '{"provider":"tiktok"}' },
    { action: 'POST_CREATED', userId: leo.id, targetType: 'POST', targetId: p1.id, metadata: '{"title":"Q4 Product Launch Announcement"}' },
    { action: 'POST_APPROVED', userId: maya.id, targetType: 'POST', targetId: p4.id, metadata: '{"step":1}' },
    { action: 'POST_PUBLISHED', userId: priya.id, targetType: 'POST', targetId: p1.id, metadata: '{"accounts":4}' },
    { action: 'POST_FAILED', userId: priya.id, targetType: 'POST', targetId: p7.id, metadata: '{"error":"unsupported aspect ratio"}' },
    { action: 'TASK_CREATED', userId: maya.id, targetType: 'TASK', targetId: tasks[0].id, metadata: '{"title":"Draft Q1 content calendar"}' },
    { action: 'TASK_ASSIGNED', userId: maya.id, targetType: 'TASK', targetId: tasks[0].id, metadata: '{"assignee":"leo.editor@northwind.io"}' },
    { action: 'PERMISSION_CHANGED', userId: admin.id, targetType: 'USER', targetId: emma.id, metadata: '{"role":"VIEWER"}' },
    { action: 'MAILBOX_CREATED', userId: hiroshi.id, targetType: 'MAILBOX', targetId: mailboxes[3].id, metadata: '{"email":"support@northwind.io"}' },
    { action: 'MAILBOX_DISABLED', userId: hiroshi.id, targetType: 'MAILBOX', targetId: mailboxes[5].id, metadata: '{"email":"staff01@northwind.io"}' },
    { action: 'DOMAIN_CHANGED', userId: hiroshi.id, targetType: 'DOMAIN', targetId: domain.id, metadata: '{"domain":"northwind.io","action":"verify_dkim"}' },
    { action: 'SECURITY_SETTING_CHANGED', userId: admin.id, metadata: '{"setting":"require_mfa"}' },
    { action: 'LOGOUT', userId: leo.id },
  ]
  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i]
    await db.auditLog.create({
      data: { ...a, workspaceId: ws.id, ipAddress: '10.0.0.' + (i + 10), createdAt: subHours(now, i * 3) } as any,
    })
  }

  // ----- Reports -----
  await db.report.create({ data: { workspaceId: ws.id, name: 'October Account Performance', type: 'ACCOUNT_PERFORMANCE', format: 'PDF', dateRange: '30d', status: 'READY' } })
  await db.report.create({ data: { workspaceId: ws.id, name: 'Q4 Cross-Platform Reach', type: 'REACH', format: 'XLSX', dateRange: '90d', status: 'READY' } })
  await db.report.create({ data: { workspaceId: ws.id, name: 'Weekly Team Operations', type: 'TEAM_OPS', format: 'CSV', dateRange: '7d', status: 'READY' } })
  await db.report.create({ data: { workspaceId: ws.id, name: 'Account Health Snapshot', type: 'ACCOUNT_HEALTH', format: 'PDF', dateRange: '7d', status: 'READY' } })
  await db.report.create({ data: { workspaceId: ws.id, name: 'Mail Delivery — November', type: 'MAIL_HEALTH', format: 'PDF', dateRange: '30d', status: 'GENERATING', scheduledAt: addHours(now, 1) } })

  // Current user session — admin
  await db.session.create({ data: { userId: admin.id, userAgent: 'Mozilla/5.0 (Macintosh)', ipAddress: '10.0.0.5', expiresAt: addDays(now, 7) } })

  console.log('✓ Seed complete')
  console.log(`  ${users.length} users, ${accounts.length} social accounts, ${posts.length} posts`)
  console.log(`  ${tasks.length} tasks, ${comments.length} comments`)
  console.log(`  ${mailboxes.length} mailboxes, 1 domain`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
