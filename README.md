# TiCLearn - AI-Powered Study Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.6-2d3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwind-css)

**AI-powered study platform for Cameroonian GCE A-Level students**

</div>

## Features

- **Note Upload** - Upload PDF or image notes, transform them into quizzes
- **AI Quiz Generation** - Automatically generate quizzes from your notes
- **Mock Exams (Paper 1/2)** - Blueprint-driven mock exams from past questions with timed sessions, section-based UI, and detailed results
- **Paper 3 Exam System** - Full GCE Computer Science/ICT Paper 3 with programming, database, and spreadsheet tasks; AI-powered evaluation with partial credit; per-question leaderboards
- **Onboarding Wizard** - 5-step flow: level selection, programs, exam date, confidence baselines, readiness snapshot. Multi-program support (O-Level GCE: 15 subjects, HND: 8 specialties)
- **Readiness Engine** - 3-pillar score (35% baseline + 45% performance + 20% recency) with topic-level mastery tracking
- **TiC AI Tutor** - 24/7 AI-powered study assistant with conversation history, profile-aware context
- **Anti-Cheat** - Fullscreen enforcement, tab-switch warning with auto-submit
- **Shareable Results** - `/result/[shareId]` public result cards
- **Credit System** - Pay-as-you-go credits for quiz generation, mock exams, AI tutor messages; purchase credits via Mobile Money
- **Subscription Plans** - Free/Starter/Standard/Premium/PRO with Fapshi (MTN MoMo/Orange Money)
- **Revision Guides** - AI-generated with PDF export
- **Leaderboards** - Quiz, Paper 3 mock, and global rankings
- **Progress Tracking** - Topic mastery bars, readiness circle, risk warnings, detailed analytics
- **Community** - Forum posts, threaded comments, likes
- **Affiliate Program** - Referral codes, click tracking, commission earnings
- **Admin Panel** - 24 pages for user management, subscriptions, KPI/metrics, content management (blueprints, Paper 3 questions, revision guides), platform/ payment settings, invites
- **KPI & Analytics Dashboard** - Daily metrics, retention cohorts, revenue tracking
- **PWA Support** - Manifest, sitemap, SEO metadata

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 |
| Auth | Better Auth (email+password, Google OAuth, email OTP) |
| Database | PostgreSQL + Prisma 7 ORM |
| Styling | Tailwind CSS 4 + shadcn/ui + Framer Motion |
| State | TanStack React Query + Zustand (client state) |
| AI | AI SDK + OpenAI (GPT-5.5) |
| File Upload | UploadThing |
| Payments | Fapshi API (MTN MoMo / Orange Money) |
| Background Jobs | Inngest |
| Security | Arcjet (bot detection, rate limiting) |
| URL State | nuqs |
| Testing | Vitest |
| Linting | Biome |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (use Docker for local)
- OpenAI API key (for AI features)
- UploadThing account (for file uploads)
- Fapshi account (for payments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ticlearn/ticlearn.git
cd ticlearn
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start local PostgreSQL:
```bash
pnpm db:up
```

5. Generate Prisma client and apply migrations:
```bash
pnpm db:generate
pnpm db:migrate
```

6. (Optional) Seed exam data:
```bash
pnpm db:seed
```

7. Run the development server:
```bash
pnpm dev
```

### Environment Variables

See [`.env.example`](./.env.example) for the complete list with setup instructions:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (generate with `openssl rand -hex 64`) |
| `BETTER_AUTH_URL` | Yes | Auth callback URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI features | Google Gemini API key (get from https://aistudio.google.com/apikey) |
| `GOOGLE_CLIENT_ID` | Google auth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google auth | Google OAuth client secret |
| `UPLOADTHING_TOKEN` | File uploads | UploadThing API token |
| `UPLOADTHING_APP_ID` | File uploads | UploadThing app ID |
| `FAPSHI_API_USER` | Payments | Fapshi API username |
| `FAPSHI_API_KEY` | Payments | Fapshi API key |
| `FAPSHI_WEBHOOK_SECRET` | Payments | Fapshi webhook secret |
| `FAPSHI_SANDBOX` | Payments | Set to `true` for sandbox |
| `SMTP_HOST` | Email | SMTP server host |
| `SMTP_PORT` | Email | SMTP server port |
| `SMTP_USER` | Email | SMTP username |
| `SMTP_PASS` | Email | SMTP password |
| `ADMIN_EMAIL` | Email | Admin notification email |
| `FROM_EMAIL` | Email | From address for sent emails |
| `ARCJET_KEY` | Security | Arcjet API key |
| `INNGEST_EVENT_KEY` | Background | Inngest event key |
| `INNGEST_SIGNING_KEY` | Background | Inngest signing key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | PostHog host URL |
| `TAVILY_API_KEY` | Search | Tavily search API key |

## Project Structure

```
app/                     # Next.js App Router
├── (marketing)/         # Landing, pricing, about, FAQ, contact, privacy, terms
├── (auth)/              # Sign-in, sign-up, verify-email
├── (onboarding)/        # 5-step onboarding wizard
├── (dashboard)/         # Main app: dashboard, quizzes, exams, practice, chat, community, settings, upload
├── (admin)/             # 24 admin pages: users, subs, metrics, content, Paper 3, revision guides
├── chat/                # AI chat (standalone route)
├── result/              # Public shareable result pages
└── api/                 # 115+ API route handlers
components/
├── ui/                  # shadcn/ui primitives
├── layout/              # Navigation, sidebar, headers
├── app/                 # Feature-specific components
├── paper3/              # Paper 3 components
├── ai-elements/         # AI chat components
└── marketing/           # Marketing page components
hooks/                   # 21 custom hooks (76 exports)
lib/                     # Utilities, AI, auth, email, inngest, api-client
├── generated/prisma/    # Generated Prisma client
├── inngest/             # Background job functions
└── email/               # Email templates
prisma/
├── schema.prisma        # 59 models, 37 enums
└── migrations/          # Database migrations
providers/               # React providers (Query, Theme)
stores/                  # Zustand stores (onboarding)
constants/               # Shared constants (FAQ, landing mock data)
types/                   # TypeScript type definitions
config/                  # Axios config
scripts/                 # Seed scripts, repair tools
public/                  # Static assets, manifest, icons
```

## Available Scripts

```bash
pnpm dev                # Start development server
pnpm build              # Build for production (generates Prisma client + builds Next.js)
pnpm start              # Start production server
pnpm lint               # Run Biome linter
pnpm format             # Format code with Biome

# Database
pnpm db:generate        # Generate Prisma client
pnpm db:migrate         # Run database migrations (dev)
pnpm db:migrate:reset   # Reset and re-run all migrations
pnpm db:push            # Push schema to database (quick prototyping only)
pnpm db:push:reset      # Force reset and push schema
pnpm db:studio          # Open Prisma Studio
pnpm db:seed            # Seed exam data (15 O-Level + 8 HND programs)
pnpm db:up              # Start Docker PostgreSQL
pnpm db:down            # Stop Docker PostgreSQL
pnpm db:auth-template   # Generate Better Auth template

# Background Jobs
pnpm inngest:start      # Start Inngest dev server

# Dev Tools
pnpm dev:all            # Start all services via mprocs (Next.js + Inngest + ngrok)
pnpm ngrok:dev          # Start ngrok tunnel on port 3000
pnpm dev:clear          # Clear .next cache and restart dev

# Testing
pnpm test               # Run tests (Vitest)
pnpm test:ui            # Run tests with UI
pnpm test:coverage      # Run tests with coverage

# Utilities
pnpm bootstrap:accelerator  # Bootstrap accelerator data
pnpm db:repair:extracted-urls  # Repair extracted URLs in database
```

## Docker Setup

For local development with PostgreSQL:

```bash
pnpm db:up
```

This starts:
- PostgreSQL 15 on port **5435** (user: `ticlearn`, password: `ticlearn_password`, database: `ticlearn`)
- pgAdmin on port 5050 (admin@ticlearn.com / admin)

```bash
pnpm db:down  # Stop containers
```

## Background Jobs

The app uses **Inngest** for async processing:
- **Note Processing** - PDF text extraction, summarization, topic detection
- **Quiz Generation** - AI-generated questions from notes
- **Email Sending** - Welcome emails, verification

Run `pnpm dev:all` to start the Inngest dev server alongside Next.js.

## Testing

Vitest is configured as the test runner. Run tests with:

```bash
pnpm test                # Run once
pnpm test:ui             # Interactive UI mode
pnpm test:coverage       # With coverage report
```

## Linting & Formatting

Biome is used for both linting and formatting:

```bash
pnpm lint     # Check for issues
pnpm format   # Auto-format all files
```

## Contributing

1. Read [`RULES.md`](./RULES.md) first - contains non-negotiable project conventions
2. Read [`docs/codebase-index.md`](./docs/codebase-index.md) for architecture overview
3. Create a feature branch
4. Make your changes
5. Run `pnpm lint` before committing
6. Submit a pull request

---

<div align="center">

Made with ❤️ for Cameroonian students

</div>
