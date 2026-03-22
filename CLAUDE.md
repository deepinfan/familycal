# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeCal is a family-shared calendar and task management PWA built with Next.js 15, supporting multi-role authentication, bilingual (Chinese/English) content, offline caching, and natural language task input via LLM.

## Development Commands

### Setup
```bash
npm install                    # Install dependencies
npx prisma generate           # Generate Prisma Client
npx prisma migrate dev        # Run database migrations
npm run prisma:seed           # Seed initial roles (admin + family roles)
```

### Development
```bash
npm run dev:safe              # Start dev server with cache cleanup (recommended)
npm run dev                   # Start dev server on 0.0.0.0:3000
npm run dev:raw               # Start dev server without safety checks
npm run clean:cache           # Clean Next.js cache manually
```

### Database
```bash
npx prisma studio             # Open Prisma Studio GUI
npx prisma migrate dev        # Create and apply new migration
npx prisma db push            # Push schema changes without migration
```

### Build & Deploy
```bash
npm run build                 # Production build
npm start                     # Start production server
npm run lint                  # Run ESLint
```

## Architecture

### Authentication System
- **Role-based auth** without email: family members log in with role selection + password
- JWT stored in HttpOnly cookie (30-day expiry if "remember me" checked)
- Middleware validates JWT and redirects unauthenticated users to `/login`
- Admin routes (`/admin`) require `isAdmin: true` in JWT payload
- Password hashing via bcryptjs

### Database Models (Prisma + PostgreSQL)

**Key relationships:**
- `Event.creator` (Role) - who created the task
- `Event.issuedBy` (Role) - who assigned the task (may differ from creator)
- `EventAssignee` - many-to-many between Event and Role (task assignees)
- `EventLog` - audit trail for task status changes (extended/cancelled/done)
- `DocumentVisibility` - controls which roles can view each document

**Bilingual storage:**
- Events: `titleZh` + `titleEn`
- Roles: `name` (Chinese) + `nameEn`
- Frontend displays based on user's language preference

### LLM Integration
- Pluggable adapter pattern in `lib/llm/`
- Supported providers: DeepSeek, Claude, OpenAI (GPT-4)
- Admin configures provider + API key in SystemConfig table
- API keys encrypted with AES-256 before storage (`lib/config/crypto.ts`)
- Natural language parsing: `POST /api/llm/parse` returns structured JSON

### Translation Fallback
- Primary: LLM generates both zh/en during parsing
- Fallback: Google Translate API (`lib/translate/google.ts`)
- Manual task creation triggers async translation

### PWA & Offline Support
- `next-pwa` configured for offline caching
- Offline fallback page: `/app/offline/page.tsx`
- Service worker caches static assets + recent pages

### Recurrence System
- Events support repeat cycles: none/daily/weekly/monthly
- `repeatUntil` defines end date for recurring tasks
- Recurrence logic in `lib/events/recurrence.ts`

## Code Patterns

### Immutability
Always create new objects instead of mutating:
```typescript
// Correct
const updated = { ...event, status: 'done' }

// Wrong
event.status = 'done'
```

### API Routes
- Use Next.js 15 App Router conventions
- Server Actions for mutations when possible
- API routes in `app/api/` for external integrations

### Error Handling
- Validate all user input with Zod schemas
- Return structured error responses: `{ success: false, error: string }`
- LLM parsing failures should gracefully fallback to manual input

## Important Constraints

### Task Permissions
- **Delete/Edit**: Only task creator
- **Mark done/cancel/extend**: Only assignees
- **View**: All family members (no task hiding)

### "All People" Assignee Handling
When assignee is "all people", create `EventAssignee` records for all current roles. New roles added later do NOT inherit historical "all people" tasks.

### Admin Access
- Only one admin account (seeded via `prisma/seed.ts`)
- Admin can modify any role's password
- Admin-only routes must check `isAdmin` in JWT

### Security
- Never expose encrypted API keys to frontend
- Decrypt API keys only server-side for LLM calls
- Use HttpOnly cookies for JWT
- Validate all inputs with Zod before database operations

## File Structure

```
app/
├── (auth)/login/          # Login page with role selection
├── (app)/                 # Main app with bottom nav
│   ├── page.tsx          # Task list (default landing)
│   ├── calendar/         # Week/month calendar views
│   ├── documents/        # Shared documents
│   └── admin/            # Admin dashboard (role + system config)
├── api/                  # API routes
└── offline/              # PWA offline fallback

lib/
├── auth.ts               # JWT signing/verification
├── admin-auth.ts         # Admin-specific auth checks
├── prisma.ts             # Prisma client singleton
├── llm/                  # LLM adapters (deepseek/claude/openai)
├── translate/            # Translation with Google fallback
├── config/               # System config + crypto utilities
└── events/               # Event recurrence logic

components/               # React components (organized by feature)
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Initial data seeding
```

## Development Notes

- Use HTTP for local development (HTTPS setup removed)
- Access via `http://localhost:3000` or `http://<your-ip>:3000` on LAN
- The project uses custom Next.js dist directories (`.next-dev`, `.next-build`)
- Always run `npm run dev:safe` to avoid cache issues during development
- Refer to `开发计划.md` for MVP milestones and task breakdown
- Refer to `需求.md` for complete product specifications

## Testing Strategy

When implementing new features:
1. Write tests for critical paths (auth, task CRUD, permissions)
2. Test LLM fallback scenarios (API failures, invalid JSON)
3. Verify offline PWA functionality
4. Test bilingual content display switching
5. Validate admin-only route protection
