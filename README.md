# College Essay Doctor 📝

An AI-powered web application for college essay drafting, editing, and school-specific customization. Built with Next.js 15, PostgreSQL, OpenAI GPT-4, and modern TypeScript.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748)](https://www.prisma.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991)](https://openai.com/)

## ✨ Features

### For Students
- **AI-Powered Feedback**: Get instant feedback on essays based on 10 proven principles
- **Draft Management**: Create, edit, and organize multiple essay drafts
- **Version Control**: Automatic versioning tracks changes over time
- **School Customization**: Tailor essays to specific colleges and majors
- **Word Count Tracking**: Real-time word count with college essay guidelines
- **Usage Analytics**: Track AI edits and draft limits by subscription tier

### 10 Essay Principles
Evaluation based on proven college essay best practices:
1. Compelling Hook
2. Show Don't Tell
3. Authentic Voice
4. Clear Structure
5. Specific Details
6. Meaningful Reflection
7. Focused Topic
8. Precise Word Choice
9. Strong Conclusion
10. Grammar & Mechanics

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- OpenAI API key
- Redis (optional, for caching)

### Installation

```bash
# 1. Clone and install
git clone <your-repo-url>
cd essaydoctor
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, AUTH_SECRET, OPENAI_API_KEY

# 3. Create database
createdb essaydoctor_dev

# 4. Set up database (runs: generate + migrate + seed)
npm run db:setup

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test Credentials

After seeding:

| Email | Password | Tier |
|-------|----------|------|
| admin@essaydoctor.com | admin123 | PRO (Admin) |
| user.free@test.com | password123 | FREE |
| user.plus@test.com | password123 | PLUS |
| user.pro@test.com | password123 | PRO |

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Comprehensive setup guide
- **[PROGRESS.md](PROGRESS.md)** - Development tracker (62% complete)
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide
- **[prisma/README.md](prisma/README.md)** - Database docs

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS v4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Authentication**: NextAuth v5
- **AI**: OpenAI GPT-4 Turbo
- **State**: Zustand
- **Validation**: Zod
- **Cache**: Redis

## 📊 Development Status

**Progress: 62% Complete** (56/90 tasks)

| Track | Status |
|-------|--------|
| Frontend UI | ✅ 100% |
| Authentication | 🟢 80% |
| Infrastructure | 🟡 60% |
| AI Integration | 🟡 40% |

See [PROGRESS.md](PROGRESS.md) for details.

## 🧪 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint

# Database
npm run db:setup         # Full setup
npm run prisma:studio    # Open GUI
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed data
```

## 🔑 Environment Variables

See [.env.example](.env.example). Minimum required:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/essaydoctor_dev"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-key"
```

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages
│   ├── (app)/           # Protected pages
│   ├── api/             # API routes
│   └── page.tsx         # Landing
├── components/ui/       # UI library
├── lib/                 # Utilities
├── store/               # Zustand stores
└── types/               # TypeScript types
```

## 🎯 Subscription Tiers

| Feature | FREE | PLUS | PRO |
|---------|------|------|-----|
| AI Edits/Month | 2 | ∞ | ∞ |
| Drafts | 2 | ∞ | ∞ |
| School Custom | ❌ | ✅ | ✅ |
| Support | Email | Priority | 1-on-1 |
| **Price** | $0 | $19/mo | $49/mo |

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Drafts
- `GET /api/drafts` - List all
- `GET /api/drafts/[id]` - Get one
- `POST /api/drafts` - Create
- `PUT /api/drafts/[id]` - Update
- `DELETE /api/drafts/[id]` - Delete

### Essays
- `POST /api/essays/edit` - Get AI feedback

### User
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `GET /api/user/usage-stats`

## 🛠️ Troubleshooting

**Database connection failed?**
```bash
brew services list  # Check if PostgreSQL running
psql -U postgres -d essaydoctor_dev  # Test connection
```

**Prisma errors?**
```bash
rm -rf node_modules/.prisma src/generated
npm run prisma:generate
```

See [SETUP.md](SETUP.md) for more help.

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel  # Development
vercel --prod  # Production
```

Set environment variables in Vercel dashboard. Database migrations run automatically.

### Environment Setup

1. PostgreSQL database (Railway, Neon, Supabase)
2. Set environment variables
3. Deploy to Vercel/Railway

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [OpenAI](https://openai.com/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://authjs.dev/)
- [TailwindCSS](https://tailwindcss.com/)

---

**MVP**: 62% Complete | **Target**: 5,000 users | **Timeline**: 12 weeks

Built with ❤️ for college applicants
