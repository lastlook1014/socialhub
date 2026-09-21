// SocialHub API helpers
import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(code: string, message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json<ApiError>(
    { success: false, error: { code, message, details } },
    { status },
  )
}

export function zodErr(e: ZodError) {
  return err('VALIDATION_ERROR', 'The request was invalid.', 422, {
    issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  })
}

// JSON helpers for SQLite string-encoded fields
export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// Serialize BigInt (Prisma SQLite BigInt -> string) so JSON responses don't break
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
  ) as T
}

// Stable ID for current "session" user (demo: admin@northwind.io)
// In a real deployment this would resolve from NextAuth session.
import { db } from '@/lib/db'

export async function currentUserId(): Promise<string | null> {
  const u = await db.user.findFirst({ where: { email: 'admin@northwind.io' } })
  return u?.id ?? null
}

export async function currentWorkspaceId(): Promise<string | null> {
  const uid = await currentUserId()
  if (!uid) return null
  const m = await db.workspaceMember.findFirst({
    where: { userId: uid },
    orderBy: { joinedAt: 'asc' },
  })
  return m?.workspaceId ?? null
}
