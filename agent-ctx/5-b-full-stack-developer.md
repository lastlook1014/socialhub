# Task 5-b — Team workflow views (Tasks, Approvals, Inbox)

## Scope
Built three production-grade views for the Command Center SPA:
- `src/components/views/tasks-view.tsx` — Kanban board + list + new task dialog + detail sheet
- `src/components/views/approvals-view.tsx` — workflow diagram + tabs + decision cards + dialog
- `src/components/views/inbox-view.tsx` — master-detail with filter sidebar + reply/resolve/notes

## Key decisions / blockers resolved
1. **Backend Prisma schema bug fixed**: `/api/v1/tasks` GET was 500ing because `TaskComment` lacked a `user` relation but the route included `user: true`. Added `user User @relation("TaskCommentAuthor", fields: [userId], references: [id])` to TaskComment and matching back-reference on User. Ran `bun run db:push` to sync. (See worklog.md §5-b for full details.)
2. **API response shape**: All three GET endpoints (`/tasks`, `/approvals`, `/comments`) return `ok(serialize(array))` → `{success:true, data: T[]}` (array directly, not wrapped in `{tasks:[]}` etc.). Typed TanStack Query hooks accordingly: `useQuery<Task[]>`, `useQuery<ApprovalPost[]>`, `useQuery<CommentItem[]>`.
3. **Radix Select empty-value bug**: `<SelectItem value="">` crashes Radix Select. Switched the platform "None" option in New Task Dialog to `value="none"` sentinel; assignee/reviewer initial state uses `undefined` instead of `''`.
4. **Inbox mobile detection**: Added `useMediaQuery('(max-width: 1023px)')` hook so clicking a comment on desktop selects it inline (right pane), while on mobile the same tap opens a bottom Sheet.

## End-to-end verification (via agent-browser)
- Tasks: created "Test task from agent" via the New Task dialog → task appeared in the New column with toast "Task created".
- Approvals: clicked Approve → dialog → comment → submit → toast "Post approved · Decision recorded in the audit log"; Awaiting Review count went 1→0 and Recently Approved 1→2.
- Inbox: clicked comment → typed reply → clicked Reply → toast "Reply sent"; Replied count 1→2.

## Files touched
- `prisma/schema.prisma` (TaskComment.user relation + User.taskComments back-ref)
- `src/components/views/tasks-view.tsx` (replaced stub)
- `src/components/views/approvals-view.tsx` (replaced stub)
- `src/components/views/inbox-view.tsx` (replaced stub)

## Lint status
`bun run lint` shows 1 pre-existing error in `src/components/shell/topbar.tsx` (not in scope). My three views are clean.
