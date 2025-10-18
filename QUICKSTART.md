# Quick Start Guide

## Prerequisites Check

✅ PostgreSQL running on port 5432
✅ Node.js 20+ installed
✅ OpenAI API key ready

## Setup Steps (5 minutes)

### 1. Create .env file

```bash
cp .env.example .env
```

### 2. Edit .env with your credentials

Open `.env` in your editor and set these **required** variables:

```bash
# Database (PostgreSQL already running on 5432)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/essaydoctor_dev?schema=public"

# Auth Secret (generate a new one)
AUTH_SECRET="GENERATE_THIS_WITH_COMMAND_BELOW"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY="sk-proj-YOUR_ACTUAL_KEY_HERE"
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Create database

```bash
createdb essaydoctor_dev
```

If you get "database already exists", that's fine! Skip to step 4.

### 4. Set up database schema

```bash
npm run db:setup
```

This runs:
- `prisma generate` - Generates TypeScript client
- `prisma migrate dev` - Creates database tables
- `prisma seed` - Adds test data

### 5. Start the app

```bash
npm run dev
```

Open http://localhost:3000

## Test It Out

### Login with test account:

- **Email:** user.free@test.com
- **Password:** password123

### Try these features:

1. ✅ Dashboard - See your usage stats
2. ✅ Create Draft - Click "New Draft"
3. ✅ Editor - Write an essay and get AI feedback
4. ✅ Settings - Update your profile

## Troubleshooting

### "Cannot connect to database"

Check PostgreSQL is running:
```bash
brew services list | grep postgresql
# Should show "started"
```

Test connection:
```bash
psql -U postgres -d essaydoctor_dev
# Should connect successfully
```

### "Invalid API key"

Make sure you copied the full key including the `sk-proj-` prefix.

Test it:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### "Prisma client not generated"

```bash
npm run prisma:generate
```

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed guide
- Check [README.md](README.md) for features
- See [PROGRESS.md](PROGRESS.md) for development status

---

**Security Note:** Never commit your `.env` file! It's already in `.gitignore`.
