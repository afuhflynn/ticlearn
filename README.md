# TiCLearn - AI-Powered Study Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.6-2d3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwind-css)

**AI-powered study platform for Cameroonian GCE A-Level students**

</div>

## Features

- 📚 **Note Upload** - Upload PDF or image notes, transform them into quizzes
- 🎯 **AI Quiz Generation** - Automatically generate quizzes from your notes
- 📊 **Progress Tracking** - Track your learning progress with detailed analytics
- 🏆 **Leaderboards** - Compete with other students
- 💬 **AI Tutor** - 24/7 AI-powered study assistant
- 📝 **GCE Exam Prep** - Generate mock exams for A-Level subjects
- 💳 **Fapshi Payments** - MTN MoMo / Orange Money integration
- 👥 **Affiliate Program** - Earn commissions by referring students

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Auth | Better Auth |
| Database | PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack React Query |
| AI | AI SDK + OpenAI |
| File Upload | UploadThing |
| Payments | Fapshi API |
| Animations | Framer Motion |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key (optional, for AI features)
- UploadThing account (optional, for file uploads)
- Fapshi account (optional, for payments)

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

4. Generate Prisma client:
```bash
pnpm db:generate
```

5. Run the development server:
```bash
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
BETTER_AUTH_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI (Optional)
OPENAI_API_KEY=""

# UploadThing (Optional)
UPLOADTHING_TOKEN=""
UPLOADTHING_APP_ID=""

# Payments (Optional)
FAPSHI_API_USER=""
FAPSHI_API_KEY=""
FAPSHI_BASE_URL="https://sandbox.fapshi.com"
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (marketing)/        # Marketing pages (landing, pricing, etc.)
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/       # Dashboard pages
│   ├── (admin)/           # Admin pages
│   └── api/                # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── app/               # Feature components
│   └── marketing/          # Marketing components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
├── providers/             # React providers
└── types/                 # TypeScript types
```

## Available Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm start         # Start production server
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run database migrations
pnpm db:push       # Push schema to database
pnpm db:studio     # Open Prisma Studio
pnpm lint          # Run Biome linter
pnpm format        # Format code with Biome
```

## Docker Setup

For local development with PostgreSQL:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- pgAdmin on port 5050 (admin@admin.com / admin)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and formatting
4. Submit a pull request

## License

MIT License - see LICENSE for details.

---

<div align="center">

Made with ❤️ for Cameroonian students

</div>