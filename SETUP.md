# Essay Doctor - Setup Guide

This guide will help you set up the College Essay Doctor MVP development environment.

## Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** 15+ (pgvector is optional for development)
- **Redis** (optional - for caching and rate limiting)
- **Git**
- **OpenAI API Key** (for AI essay feedback)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd essaydoctor

# Install dependencies
npm install
```

### 2. Database Setup

#### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
```

#### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE essaydoctor_dev;

# Exit
\q
```

**Note**: pgvector is currently disabled in the schema for easier development. School customization uses keyword matching instead of semantic embeddings. To enable pgvector later, see `prisma/README.md`.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

**Minimum required variables** for basic functionality:

```bash
# Database
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/essaydoctor_dev?schema=public"

# Auth (generate with: openssl rand -base64 32)
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Stripe (for payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# Email (Resend or similar)
EMAIL_FROM="noreply@essaydoctor.com"
RESEND_API_KEY="your-resend-api-key"

# Search API
BING_SEARCH_API_KEY="your-bing-search-api-key"

# Redis
REDIS_URL="redis://localhost:6379"
```

### 4. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Database Management

### View Database (Prisma Studio)

```bash
npm run prisma:studio
```

This opens a GUI at [http://localhost:5555](http://localhost:5555) to view and edit data.

### Create New Migration

```bash
# After modifying schema.prisma
npm run prisma:migrate
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

## Test Credentials

After seeding, you can log in with these test accounts:

| Email | Password | Tier | Role |
|-------|----------|------|------|
| admin@essaydoctor.com | admin123 | PRO | ADMIN |
| user.free@test.com | password123 | FREE | MEMBER |
| user.plus@test.com | password123 | PLUS | MEMBER |
| user.pro@test.com | password123 | PRO | MEMBER |

## Project Structure

```
essaydoctor/
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   ├── seed.ts            # Database seed data
│   └── README.md          # Database setup guide
├── src/
│   ├── app/               # Next.js app router
│   │   ├── api/          # API routes
│   │   │   └── auth/     # Authentication endpoints
│   │   ├── (auth)/       # Auth pages (login, register)
│   │   ├── members/      # Member pages
│   │   ├── messages/     # Messages pages
│   │   └── layout.tsx    # Root layout
│   ├── lib/              # Utility libraries
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── prisma.ts     # Prisma client singleton
│   │   ├── password.ts   # Password hashing utilities
│   │   └── tokens.ts     # Token generation utilities
│   ├── types/            # TypeScript type definitions
│   └── generated/        # Generated Prisma client
├── .taskmaster/          # Task breakdown and planning
├── CLAUDE.md             # Claude AI instructions
├── SETUP.md              # This file
└── package.json
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create and run migration
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open Prisma Studio GUI
npm run db:setup         # Full database setup (generate + migrate + seed)
```

## Development Workflow

### 1. Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature
```

### 2. Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Migration auto-applies to development database
4. Commit migration files to git

### 3. Adding New API Endpoints

1. Create route in `src/app/api/[route-name]/route.ts`
2. Use Next.js route handlers (GET, POST, etc.)
3. Import from `@/lib/prisma` for database access
4. Add authentication check if needed

## Architecture Overview

### Authentication

- **NextAuth v5** with JWT strategy
- Supports email/password and Google OAuth
- Email verification required
- Role-based access control (ADMIN/MEMBER)

### Database

- **PostgreSQL** with **Prisma ORM**
- **pgvector** extension for AI embeddings
- Automatic migrations
- Type-safe database queries

### Features

- User authentication and authorization
- Subscription tiers (FREE, PLUS, PRO)
- Draft management with versioning
- School/major data storage with AI embeddings
- Usage tracking and rate limiting

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Test connection
psql -U postgres -d essaydoctor_dev
```

### Missing Environment Variables

```bash
# Check which variables are missing
cat .env

# Compare with .env.example
diff .env .env.example
```

### Prisma Client Generation Errors

```bash
# Clear and regenerate
rm -rf node_modules/.prisma
rm -rf src/generated
npm run prisma:generate
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill
# Or specify different port
PORT=3001 npm run dev
```

## Next Steps

1. Review the [task breakdown](./.taskmaster/README.md)
2. Check out [sprint planning](./.taskmaster/sprint-template.md)
3. Read the [database schema docs](./prisma/README.md)
4. Start implementing features from the task list

## Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js v5 Documentation](https://authjs.dev)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review closed issues in the repository
3. Create a new issue with detailed information

---

**Ready to build!** 🚀
