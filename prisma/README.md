# Database Setup Guide

## Prerequisites

### 1. Install PostgreSQL 15+

#### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15
```

#### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. pgvector Extension (OPTIONAL)

**NOTE**: pgvector is currently disabled in the schema and is NOT required for development.

The application can optionally use the pgvector extension for semantic similarity search of school/major data. However, the current implementation uses keyword/feature matching instead, which works well without pgvector.

If you want to enable pgvector in the future:

#### macOS
```bash
brew install pgvector
```

#### From Source (Linux/macOS)
```bash
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

Then uncomment the relevant lines in `schema.prisma`:
- Line 7: `previewFeatures = ["postgresqlExtensions"]`
- Line 13: `extensions = [vector]`
- Line 169: `embedding` field in `SchoolMajorData` model

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE essaydoctor_dev;

# Exit
\q
```

### 2. Configure Environment

Update the `.env` file in the project root with your database credentials:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/essaydoctor_dev?schema=public"
```

### 3. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Verify schema
npx prisma studio
```

## Seed Data (Optional)

To populate the database with initial test data:

```bash
npm run prisma:seed
```

## Database Schema Overview

### Core Models

#### User & Authentication
- `User` - User accounts with email and password
- `Token` - Email verification and password reset tokens

#### Subscriptions & Usage
- `Subscription` - Stripe subscription management (FREE/PLUS/PRO tiers)
- `UsageTracking` - Track API usage limits per user

#### Drafts
- `Draft` - Essay drafts with versioning
- `DraftVersion` - Historical versions of drafts

#### School Knowledge
- `SchoolMajorData` - Scraped and AI-processed school/major information with pgvector embeddings

### Key Indexes

- Composite index on `(schoolName, majorName)` for fast lookups
- Timestamp indexes for freshness queries
- User ID indexes for all user-related tables
- pgvector indexes for similarity search

## Migrations

### Create a New Migration

```bash
npx prisma migrate dev --name description_of_changes
```

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check connection string in `.env`
- Ensure database exists: `psql -l`

### Permission Errors

If you encounter permission errors during migration:

```sql
GRANT ALL PRIVILEGES ON DATABASE essaydoctor_dev TO your_user;
```

## Useful Commands

```bash
# Open Prisma Studio (GUI for database)
npx prisma studio

# Format Prisma schema
npx prisma format

# Validate Prisma schema
npx prisma validate

# Check migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate
```

## Production Considerations

### Connection Pooling

For production, use connection pooling (PgBouncer or Prisma Data Proxy):

```env
DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true&connection_limit=10"
```

### Backups

Set up automated backups:

```bash
# Daily backup script
pg_dump essaydoctor_dev > backup_$(date +%Y%m%d).sql
```

### Security

- Use strong passwords
- Enable SSL/TLS connections
- Restrict database access by IP
- Use connection pooling to prevent exhaustion
- Regular security updates

## Schema Updates

When updating the schema:

1. Modify `schema.prisma`
2. Run `npx prisma format`
3. Run `npx prisma validate`
4. Create migration: `npx prisma migrate dev --name update_name`
5. Test migration on development database
6. Apply to staging/production: `npx prisma migrate deploy`

## Support

For issues with:
- Prisma: https://www.prisma.io/docs
- PostgreSQL: https://www.postgresql.org/docs/
- pgvector: https://github.com/pgvector/pgvector
