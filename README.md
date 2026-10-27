# TiCLearn - AI-Powered Study Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.6-2d3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwind-css)

**Study platform for Cameroonian university students: upload lecture notes, generate quizzes, learn with Tip**

</div>

## Features

- **Note Upload** - Upload PDF, Word or photo notes; text extraction, summaries, key points and topic detection
- **AI Quiz Generation** - Quizzes generated from one of your own notes, every question traceable to your material
- **Tip AI Tutor** - Teaches from your notes instead of handing over answers, explains at your year of study
- **Readiness Tracking** - Topic mastery from quiz attempts, weakest topics first
- **Leaderboards** - Quiz points, streaks and rankings
- **Progress Tracking** - Notes, quizzes, attempts and streaks
- **Community** - Forum posts and public quizzes
- **Level Onboarding** - One question: your year of study
- **Credit System** - Pay-as-you-go credits for quiz generation and tutor messages; top up with Mobile Money
- **Subscription Plans** - Free/Starter/Standard/Premium/PRO with Fapshi (MTN MoMo/Orange Money)
- **Affiliate Program** - Referral codes, click tracking, commission earnings
- **Admin Panel** - User management, subscriptions, metrics, platform and payment settings
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
| AI | AI SDK via OpenRouter (existing chain) + Meta Model API (Muse Spark 1.3 direct) + Baseten (Muse Spark Open for visual analysis) |
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
- Google Gemini API key (for AI features)
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

6. (Optional) Ensure platform settings:
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
| `SENTRY_DSN` | Error Tracking | Sentry DSN (get from Sentry project settings) |
| `SENTRY_AUTH_TOKEN` | Error Tracking | Sentry auth token for source map uploads |
| `SENTRY_ORG` | Error Tracking | Sentry organization slug |
| `SENTRY_PROJECT` | Error Tracking | Sentry project slug |
| `TAVILY_API_KEY` | Search | Tavily search API key |
| `MUSE_API_KEY` | AI (hackathon) | Meta Model API key for Muse Spark 1.3 (get from https://dev.meta.ai) |
| `BAASETEN_API_KEY` | AI (hackathon) | Baseten API key for Muse Spark Open visual analysis (get from https://app.baseten.co) |

## Project Structure

```
app/                     # Next.js App Router
├── (marketing)/         # Landing, pricing, about, FAQ, contact, privacy, terms
├── (auth)/              # Sign-in, sign-up, verify-email
├── (onboarding)/        # Level of study picker
├── (dashboard)/         # Main app: dashboard, notes, quizzes, chat, community, settings, upload
├── (admin)/             # 10 admin pages: users, subs, metrics, affiliates, feedback, payments, platform settings
├── chat/                # Tip chat (standalone route)
├── result/              # Public shareable result pages
└── api/                 # 72 API route handlers
components/
├── ui/                  # shadcn/ui primitives
├── layout/              # Navigation, sidebar, headers
├── app/                 # Feature-specific components
├── ai-elements/         # AI chat components
└── marketing/           # Marketing page components
hooks/                   # 19 custom hooks, re-exported from hooks/index.ts
lib/                     # Utilities, AI, auth, email, inngest, api-client
├── generated/prisma/    # Generated Prisma client (gitignored, run pnpm db:generate)
├── ai/                  # Model calls, task registry, chat tools, cache
├── inngest/             # Background job functions
└── email/               # Email templates
prisma/
├── schema.prisma        # 39 models, 15 enums
└── migrations/          # 70 database migrations, ending with the pivot wipe
providers/               # React providers (Query, Theme)
stores/                  # Zustand client stores
constants/               # Shared constants (FAQ, levels, plans)
types/                   # TypeScript type definitions
config/                  # Axios config
scripts/                 # Seed, repair and verification tools
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
pnpm db:seed            # Ensure platform settings (creates no content rows)
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

Vitest runs 247 tests (`pnpm vitest run`). Verification is typecheck, lint, tests, prompt check and build.

## Linting & Formatting

Biome is used for both linting and formatting:

```bash
pnpm lint     # Check for issues
pnpm format   # Auto-format all files
```

## Contributing

1. Read [`AGENTS.md`](./AGENTS.md) first. It is the entry point for both humans and AI tools, and it links to the area specific context files for `lib/ai/`, `app/api/`, and `prisma/`.
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint` and `pnpm build` before committing
5. Submit a pull request

## Meta Global AI Developer Hackathon

See [`HACKATHON.md`](./HACKATHON.md) for what was built during the hackathon (October 26 to November 4, 2026), which Meta models are used and for what, how Baseten credits power the visual analysis experiment, and the three minute demo paths. The OpenRouter chain remains unchanged as the fallback for existing features.

---

<div align="center">

Made with ❤️ for Cameroonian students

</div>
