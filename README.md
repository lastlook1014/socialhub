# SocialHub

> **One Platform, Total Control.**

SocialHub is an enterprise **Social Operations, Publishing, Analytics & Organization Communications Platform** — a centralized command center for professional teams managing multiple authorized social-media accounts, content workflows, staff tasks, analytics, community management and organization email infrastructure.

---

## ✨ Highlights

- **Premium macOS-inspired UI** — glass surfaces, refined shadows, light & dark mode
- **15 integrated modules** — Dashboard, Tasks, Calendar, Composer, Content Library, Social Accounts, Inbox, Analytics, Reports, Approvals, Team, Mail Center, Notifications, Audit Logs, Settings
- **Command palette** (CTRL/CMD+K) with keyboard navigation
- **Role-based access control** with 9 roles and granular permissions
- **Audit logging** — every sensitive action is recorded immutably
- **Account health model** — explainable, never fabricated
- **Mail Center** — domains, mailboxes, aliases, groups, DNS verification, delivery monitoring, security events
- **Responsive & accessible** — mobile-first, keyboard navigable, semantic HTML

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| State | Zustand (client) + TanStack Query (server) |
| Charts | Recharts |
| Icons | Lucide React |

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Push the database schema + seed demo data
bun run db:push
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

The app runs on `http://localhost:3000`.

## 📂 Project Structure

```
src/
├── app/                    # Next.js App Router (routes, layouts, API routes)
│   ├── api/v1/             # Versioned REST API
│   ├── layout.tsx          # Root layout + providers
│   └── page.tsx            # Main application shell
├── components/
│   ├── shell/              # Sidebar, topbar, command palette
│   ├── views/              # 15 section views
│   ├── shared/             # Layout helpers, status pills
│   └── ui/                 # shadcn/ui components
├── lib/                    # Store, API helpers, meta utilities
prisma/                     # Schema + seed
```

## ⚠️ Integration Status

Social provider integrations (Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Threads, Pinterest) run in **DEMO mode** in this repository — OAuth credentials are not configured. Every provider card is clearly labeled `DEMO` and no mock data is presented as live. To enable live integrations, configure OAuth credentials in `.env` and re-verify per the provider's official documentation.

## 📜 License

MIT
