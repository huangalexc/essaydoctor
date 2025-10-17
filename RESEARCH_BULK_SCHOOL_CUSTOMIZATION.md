# Research: Best Practices for Bulk School Customization Feature

**Research Date:** January 2025
**Project:** EssayDoctor - College Application Essay Platform
**Feature:** Bulk school/major customization for college essays

---

## Executive Summary

This document compiles best practices, modern patterns, and authoritative sources for implementing a bulk school customization feature where users can input multiple school/major combinations and receive AI-customized essay versions for each. The research covers 10 key areas: batch processing, UI/UX patterns, progress indicators, error handling, data caching, rate limiting, storage patterns, queue systems, comparison views, and web scraping ethics.

---

## 1. Batch Processing in Web Applications

### Must-Have Practices

**Choose Between Synchronous vs Asynchronous Processing:**
- **Synchronous (Real-time)**: Best for 1-5 schools, sub-10 second total processing
- **Queue-Based (Async)**: Required for 5+ schools, longer processing times, or Vercel deployment
- **Hybrid**: Start synchronously, switch to queue if exceeds threshold

**Source:** AWS Prescriptive Guidance - Best practices for implementing partial batch responses
- URL: https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/best-practices-partial-batch-responses.html

### API Design Pattern

**Permissive vs Strict Mode:**
- **Permissive (Recommended)**: Process all valid requests, continue on failures, return detailed results
- **Strict**: Fail entire batch on first error (use only if schools are logically dependent)

**Response Structure Pattern:**
```typescript
{
  success: boolean,
  totalProcessed: number,
  results: [
    {
      id: string,
      school: string,
      major: string,
      success: boolean,
      essayContent?: string,
      error?: {
        code: string,
        message: string
      }
    }
  ]
}
```

**Authority Level:** Industry Standard Pattern (AWS, Adidas API Guidelines)
- URL: https://adidas.gitbook.io/api-guidelines/rest-api-guidelines/execution/batch-operations

### Key Considerations

1. **Idempotency**: Assign unique ID to each school/major combination to prevent duplicate processing
2. **Failed Batch Threshold**: Stop entire operation if >30% fail (configurable)
3. **Structured Logging**: JSON format, log all successes, errors, and warnings

---

## 2. Multi-Item Input UI/UX Patterns

### Recommended Pattern: Autocomplete + Chips

**Implementation:**
- **School Input**: Autocomplete/typeahead with school database
- **Major Input**: Dependent autocomplete based on selected school
- **Display**: Multi-select chips showing school + major combinations
- **Limit**: Display 10 matching items max for performance

**Real-World Examples:**
- **Material UI Autocomplete**: Multiple selection with chips
  - URL: https://mui.com/material-ui/react-autocomplete/
- **PrimeNG AutoComplete**: Multi-value mode with typeahead
  - URL: https://primeng.org/autocomplete

### Key Features to Implement

1. **Recognition-Based Input**: Users select from validated options vs free text
2. **Inline Validation**: Show if school/major combo is valid before adding
3. **Batch Actions**: "Add 5 more", "Clear all", "Import from CSV"
4. **Visual Feedback**: Show count, estimated processing time, estimated cost

**Authority Level:** Official Component Documentation + UI Pattern Libraries
- URL: https://ui-patterns.com/patterns/Autocomplete

### Mobile Considerations

- Use bottom sheet for school/major selection on mobile
- Single-column layout for chips
- Collapsible list if >5 items

---

## 3. Progress Indicators for Long-Running Operations

### Must-Have: Determinate Progress Bar

**When to Use Each Type:**
- **1-3 seconds**: Spinner or skeleton screen
- **3-10 seconds**: Progress bar with percentage
- **10+ seconds**: Progress bar + time estimate + allow navigation away

**Source:** Nielsen Norman Group - Progress Indicators
- URL: https://www.nngroup.com/articles/progress-indicators/

### Implementation Pattern

```typescript
interface ProgressState {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  totalSchools: number;
  completedSchools: number;
  currentSchool?: string;
  currentMajor?: string;
  estimatedTimeRemaining?: number;
  errors: Array<{ school: string; error: string }>;
}
```

### Best Practices from Research

1. **Show Overall Progress**: Display aggregate progress (8/10 schools), not individual API calls
2. **Keep It Moving**: Never show static progress bar - update every 500ms minimum
3. **Don't Block Interface**: Allow users to navigate away, provide notification when complete
4. **Be Accurate**: Never fake progress - users prefer honesty over fake speed
5. **Provide Context**: Label shows "Customizing essays for Stanford (3/10)..."

**Authority Level:** Nielsen Norman Group (Gold Standard for UX Research)
- URL: https://www.smashingmagazine.com/2016/12/best-practices-for-animated-progress-indicators/

### User Satisfaction Impact

Research shows users who see moving progress bars:
- Experience higher satisfaction
- Are willing to wait 3x longer than those without indicators
- Have realistic expectations of completion time

**Source:** Smashing Magazine - Best Practices for Animated Progress Indicators

---

## 4. Error Handling for Partial Failures

### Required Pattern: Granular Error Reporting

**Display Strategy:**
- **During Processing**: Show errors inline in progress indicator
- **After Completion**: Summary card with success/failure breakdown
- **Per-Item**: Expandable error details for each failed school

### UI Pattern Example

```
✓ 7 schools customized successfully
✗ 3 schools failed

Failed Customizations:
✗ Stanford University - Computer Science
  Error: Rate limit exceeded. Try again in 2 minutes.
  [Retry] [Skip]

✗ MIT - Electrical Engineering
  Error: Unable to fetch school information. Please verify school name.
  [Edit School] [Remove]

✗ UC Berkeley - Data Science
  Error: AI service temporarily unavailable.
  [Retry] [Skip]
```

### Retry Strategies

1. **Automatic Retry**: With exponential backoff for rate limits (429 errors)
2. **User-Initiated Retry**: Button to retry failed items only
3. **Batch Retry**: "Retry All Failed" action
4. **Individual Skip**: Allow user to skip problematic schools

**Authority Level:** Software Engineering Best Practices (Stack Overflow, FastAPI Documentation)
- URL: https://www.codingeasypeasy.com/blog/robust-batch-api-handling-partial-failures-in-fastapi-for-enhanced-reliability

### Logging Requirements

- Log all errors with school/major context
- Include request ID for debugging
- Track error rates per error type
- Alert on threshold breaches (>20% failure rate)

---

## 5. Data Caching Strategies

### Recommended: Multi-Layer Caching

**Layer 1: School/Major Information (Redis)**
- **Strategy**: Cache-Aside (Lazy Loading)
- **TTL**: 30 days (school info changes infrequently)
- **Key Pattern**: `school:{schoolId}` or `school:{name}:info`

**Layer 2: AI-Generated Content (PostgreSQL + Redis)**
- **Strategy**: Write-Through for essays, Cache-Aside for reads
- **TTL**: 7 days in Redis (permanent in PostgreSQL)
- **Key Pattern**: `essay:{userId}:{essayId}:school:{schoolId}`

**Layer 3: Rate Limit Counters (Redis)**
- **Strategy**: Token Bucket or GCRA algorithm
- **TTL**: 1 minute to 1 hour (based on rate limit window)
- **Key Pattern**: `rate-limit:{userId}:batch-requests`

**Authority Level:** Industry Best Practices (Better Stack, Redis Official Documentation)
- URL: https://betterstack.com/community/guides/scaling-nodejs/nodejs-caching-redis/
- URL: https://redis.io/learn/howtos/solutions/caching-architecture/write-through

### Cache Configuration Best Practices

```typescript
// Cache-Aside Pattern for School Info
async function getSchoolInfo(schoolName: string) {
  const cacheKey = `school:${schoolName}:info`;

  // 1. Try cache first
  let schoolInfo = await redis.get(cacheKey);

  if (schoolInfo) {
    return JSON.parse(schoolInfo);
  }

  // 2. Cache miss - fetch from API/database
  schoolInfo = await fetchSchoolFromAPI(schoolName);

  // 3. Store in cache with TTL
  await redis.setex(cacheKey, 2592000, JSON.stringify(schoolInfo)); // 30 days

  return schoolInfo;
}
```

### Cache Invalidation

**When to Invalidate:**
- User manually updates school information
- Batch operation completes (clear rate limit counters)
- Admin updates school database

**Pattern:** Use cache key prefixes for easy bulk invalidation
```typescript
await redis.del(`essay:${userId}:*`); // Clear all essays for user
```

### Performance Benefits

- Reduces database queries by 70-90%
- Reduces external API calls by 95%+ (school info)
- Response time improvement: 2000ms → 50ms for cached data

**Source:** Multiple case studies on Redis caching with Node.js
- URL: https://geshan.com.np/blog/2021/05/nodejs-redis/

---

## 6. Rate Limiting for AI API Calls in Batch Operations

### Three-Tier Rate Limiting Strategy

**Tier 1: Per-User Batch Limits (Application Level)**
- Limit: 10 schools per batch, 3 batches per hour
- Storage: Redis with sliding window
- Purpose: Prevent abuse, manage costs

**Tier 2: Global API Rate Limits (Application Level)**
- Limit: Respect Anthropic Claude API limits (RPM, TPM)
- Storage: Redis with token bucket algorithm
- Purpose: Avoid 429 errors from AI provider

**Tier 3: Cost-Based Quotas (Application Level)**
- Limit: Track token usage per user, enforce monthly quotas
- Storage: PostgreSQL for accurate billing
- Purpose: Cost management

**Authority Level:** Official API Documentation + Industry Best Practices
- URL: https://docs.anthropic.com/en/api/rate-limits (Anthropic Official)
- URL: https://dev.to/hamzakhan/api-rate-limiting-in-nodejs-strategies-and-best-practices-3gef

### Implementation Pattern: Token Bucket with Redis

```typescript
import { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Per-user rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rate-limit',
  points: 10, // 10 batch requests
  duration: 3600, // per hour
});

async function checkRateLimit(userId: string) {
  try {
    await rateLimiter.consume(userId);
    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      retryAfter: Math.ceil(error.msBeforeNext / 1000)
    };
  }
}
```

### Anthropic Claude API Rate Limits (January 2025)

**Standard Tier:**
- 50 requests per minute (RPM)
- Input: ~40,000-200,000 tokens per minute (varies by model)
- Output: ~20,000-80,000 tokens per minute

**Message Batches API:**
- Up to 10,000 queries per batch
- 24-hour completion window
- 50% cost discount vs regular API
- Separate rate limits for batch endpoints

**Source:** Anthropic Official Documentation
- URL: https://docs.anthropic.com/en/api/rate-limits

### Handling Rate Limit Errors

**Response to 429 Error:**
1. Implement exponential backoff: wait 1s, 2s, 4s, 8s, 16s
2. Use `Retry-After` header if provided
3. Queue failed requests for later processing
4. Show user clear message: "Processing paused due to high demand. Resuming in 30 seconds..."

### Best Practice: Batch API for Non-Urgent Requests

For bulk operations (5+ schools), use Anthropic's Message Batches API:
- 50% cost savings
- Higher throughput limits
- 24-hour SLA acceptable for bulk customization

**Source:** Anthropic Message Batches API Documentation
- URL: https://blog.getbind.co/2024/10/10/anthropic-launches-message-batches-api-overview-comparison-with-openai-batch-api/

---

## 7. Storage Patterns for Multiple Essay Versions

### Recommended: Document Versioning Pattern

**Schema Design (Prisma):**

```prisma
model Essay {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  title           String
  baseContent     String   @db.Text
  isBaseVersion   Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  customVersions  EssayCustomVersion[]

  @@index([userId])
}

model EssayCustomVersion {
  id              String   @id @default(cuid())
  essayId         String
  essay           Essay    @relation(fields: [essayId], references: [id], onDelete: Cascade)

  // School-specific information
  schoolName      String
  schoolId        String?  // Optional: link to school database
  majorName       String

  // Customized content
  customContent   String   @db.Text

  // Metadata
  generatedAt     DateTime @default(now())
  tokensUsed      Int      // Track cost
  aiModel         String   @default("claude-3-5-sonnet")

  // Quality/approval
  status          String   @default("draft") // draft, approved, rejected
  userRating      Int?     // 1-5 stars

  @@unique([essayId, schoolName, majorName])
  @@index([essayId])
  @@index([schoolName])
}

model School {
  id              String   @id @default(cuid())
  name            String   @unique
  commonAppId     String?  @unique

  // Cached information
  websiteUrl      String?
  description     String?  @db.Text
  majors          String[] // Array of major names

  // Metadata
  lastUpdated     DateTime @updatedAt

  @@index([name])
}
```

**Authority Level:** Official Pattern Documentation (MongoDB, Azure Cosmos DB)
- URL: https://www.mongodb.com/blog/post/building-with-patterns-the-document-versioning-pattern
- URL: https://learn.microsoft.com/en-us/samples/azure-samples/cosmos-db-design-patterns/document-versioning/

### Storage Strategy Rationale

1. **Separate Collections (Essays vs CustomVersions)**:
   - Base essay remains clean and editable
   - Custom versions are immutable after generation
   - Easy to regenerate all versions if base essay changes

2. **Unique Constraint on (essayId, schoolName, majorName)**:
   - Prevents duplicate customizations
   - Enables caching/memoization
   - Supports incremental batch operations

3. **Metadata Tracking**:
   - `tokensUsed`: Essential for cost tracking and quota management
   - `aiModel`: Important for quality comparison and re-generation
   - `status`: Enables workflow (draft → approved → submitted)

### Query Patterns

```typescript
// Get all customized versions for an essay
const versions = await prisma.essayCustomVersion.findMany({
  where: { essayId },
  include: { essay: { select: { baseContent: true } } }
});

// Get or create custom version (idempotent)
const version = await prisma.essayCustomVersion.upsert({
  where: {
    essayId_schoolName_majorName: {
      essayId,
      schoolName,
      majorName
    }
  },
  update: {}, // Don't update if exists
  create: {
    essayId,
    schoolName,
    majorName,
    customContent,
    tokensUsed
  }
});
```

### Alternative: Diff Storage Pattern

For very large essays, consider storing diffs instead of full content:

```prisma
model EssayCustomVersion {
  // ... other fields
  diffFromBase    Json     // Store only differences
  diffFormat      String   @default("unified") // unified, json-patch
}
```

**Trade-offs:**
- Pro: Reduces storage by 70-90% for similar versions
- Con: Requires diff library (fast-diff, diff-match-patch)
- Con: Slightly slower reads (need to reconstruct)

**Recommendation:** Start with full content storage, optimize to diffs if storage costs become significant (>10,000 versions per user).

---

## 8. Queue-Based vs Synchronous Processing

### Decision Matrix

| Factor | Synchronous | Queue-Based |
|--------|-------------|-------------|
| **Processing Time** | <10 seconds total | >10 seconds total |
| **Number of Schools** | 1-5 schools | 5-50 schools |
| **Deployment** | Any | Requires separate worker (not Vercel) |
| **User Expectation** | Immediate results | Can wait/come back later |
| **Error Handling** | Simple retry | Advanced retry with delays |
| **Cost** | Higher (real-time API) | Lower (can use batch API) |

### Recommended: Queue-Based Processing with BullMQ

**Why BullMQ:**
- Official recommendation for Next.js background jobs
- Redis-backed (already using Redis for caching)
- Supports job priorities, retries, progress tracking
- Works with Prisma for job persistence

**Authority Level:** Official Next.js Community Recommendations
- URL: https://bullmq.io/ (Official Documentation)
- URL: https://medium.com/@asanka_l/integrating-bullmq-with-nextjs-typescript-f41cca347ef8
- URL: https://www.vishalgarg.io/articles/how-to-setup-queue-jobs-in-nextjs-with-bullmq

### Implementation Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Next.js   │ ───> │    Redis    │ <─── │   Worker    │
│   App       │      │    Queue    │      │   Process   │
│  (Vercel)   │      │             │      │  (Railway)  │
└─────────────┘      └─────────────┘      └─────────────┘
     │                                            │
     │                                            │
     └──────────────> PostgreSQL <────────────────┘
                    (Shared Database)
```

### BullMQ Setup for Bulk Customization

```typescript
// lib/queues/essay-customization.queue.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '@/lib/redis';

interface CustomizationJob {
  userId: string;
  essayId: string;
  schools: Array<{ name: string; major: string }>;
}

export const customizationQueue = new Queue<CustomizationJob>(
  'essay-customization',
  { connection: redis }
);

// app/api/essays/customize/route.ts (Next.js API Route)
export async function POST(request: Request) {
  const { essayId, schools } = await request.json();

  const job = await customizationQueue.add('customize-bulk', {
    userId: user.id,
    essayId,
    schools
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });

  return Response.json({ jobId: job.id });
}

// workers/essay-customization.worker.ts (Separate Process)
import { Worker } from 'bullmq';
import { generateCustomEssay } from '@/lib/ai/claude';

const worker = new Worker<CustomizationJob>(
  'essay-customization',
  async (job) => {
    const { userId, essayId, schools } = job.data;

    for (let i = 0; i < schools.length; i++) {
      const { name, major } = schools[i];

      // Update progress
      await job.updateProgress((i / schools.length) * 100);

      // Generate customization
      const customContent = await generateCustomEssay(essayId, name, major);

      // Save to database
      await prisma.essayCustomVersion.create({
        data: { essayId, schoolName: name, majorName: major, customContent }
      });
    }

    return { completed: schools.length };
  },
  { connection: redis }
);
```

### Deployment Considerations

**Important:** BullMQ workers cannot run on Vercel (serverless limitations)

**Recommended Deployment:**
1. **Next.js App**: Deploy to Vercel (or any serverless)
2. **Worker Process**: Deploy to Railway, Render, Fly.io, or traditional server
3. **Redis**: Upstash Redis (serverless-friendly) or Redis Cloud
4. **PostgreSQL**: Already have (Vercel Postgres or Supabase)

**Authority Level:** Next.js + BullMQ Community Documentation
- URL: https://www.nico.fyi/blog/long-running-jobs-nextjs-redis-bull
- URL: https://github.com/vercel/next.js/discussions/33989

### Alternative: Serverless Solutions (If Worker Server Not Possible)

**Option 1: Next.js 15.1 `after()` API**
- Limited to 60 seconds on Vercel
- Good for 1-5 schools only
- No separate deployment needed

```typescript
import { after } from 'next/server';

export async function POST(request: Request) {
  const { essayId, schools } = await request.json();

  after(async () => {
    // Runs after response sent, but limited to 60s
    for (const { name, major } of schools) {
      await generateAndSaveCustomVersion(essayId, name, major);
    }
  });

  return Response.json({ status: 'processing' });
}
```

**Option 2: Trigger.dev or Inngest (Serverless Job Platforms)**
- Managed background job services
- Work with Vercel deployment
- Higher cost than self-hosted
- Good for MVP or smaller scale

**Source:** Trigger.dev and Inngest Documentation
- URL: https://trigger.dev/blog/announcing-trigger-v2-the-self-hostable-background-jobs-framework-for-nextjs
- URL: https://medium.com/@cyri113/background-jobs-for-node-js-using-next-js-inngest-supabase-and-vercel-e5148d094e3f

### Recommendation for EssayDoctor

**Phase 1 (MVP):** Synchronous processing for 1-5 schools, use `after()` API
**Phase 2 (Scale):** BullMQ with separate worker on Railway/Render
**Future:** Consider Anthropic Batch API for 24-hour turnaround batches (50% cost savings)

---

## 9. UI Patterns for Comparing Multiple Versions

### Recommended Pattern: Tabbed View with Side-by-Side Option

**Primary View: Tabs**
- Each tab = School + Major combination
- Active tab shows full customized essay
- Tab label shows school name + major
- Color indicator: green (approved), yellow (draft), red (error)

**Secondary View: Side-by-Side Comparison (2-3 versions)**
- User selects 2-3 versions to compare
- Split panes with synchronized scrolling
- Diff highlighting (green = additions, yellow = modifications)

**Real-World Examples:**
1. **GitHub Diff View**: Side-by-side code comparison with color coding
   - URL: https://ux.stackexchange.com/questions/111074/side-by-side-code-diff-view-ux

2. **Microsoft Word Compare**: Side-by-side document comparison
   - URL: https://support.microsoft.com/en-us/office/view-and-compare-documents-side-by-side-52445547-7c07-475b-bb1d-22a98175ef04

3. **Notion Database Views**: Multiple view types (table, board, calendar)
   - URL: https://www.notion.com/help/guides/using-database-views

**Authority Level:** Official Product Documentation + UX Stack Exchange

### Implementation with NextUI Tabs

```typescript
import { Tabs, Tab } from "@nextui-org/react";

function EssayVersionsView({ baseEssay, customVersions }) {
  return (
    <div className="space-y-4">
      {/* Base Essay (Always Visible) */}
      <Card>
        <CardHeader>Base Essay (Original)</CardHeader>
        <CardBody>{baseEssay.content}</CardBody>
      </Card>

      {/* Custom Versions in Tabs */}
      <Tabs aria-label="Customized versions">
        {customVersions.map((version) => (
          <Tab
            key={version.id}
            title={
              <div className="flex items-center gap-2">
                <span>{version.schoolName}</span>
                <Chip size="sm" color={getStatusColor(version.status)}>
                  {version.status}
                </Chip>
              </div>
            }
          >
            <Card>
              <CardBody>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">
                    Major: {version.majorName}
                  </div>
                  <div className="prose max-w-none">
                    {version.customContent}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="flat">
                      Compare with Base
                    </Button>
                    <Button size="sm" variant="flat">
                      Copy to Clipboard
                    </Button>
                    <Button size="sm" color="primary">
                      Approve
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
```

### Diff/Comparison Library Recommendations

**For Text Diff Highlighting:**
- **diff-match-patch** (Google): Industry standard, used by GitHub
- **react-diff-viewer**: React component with side-by-side view
- **fast-diff**: Lightweight alternative

```typescript
import Diff from 'diff-match-patch';

function highlightDifferences(baseText: string, customText: string) {
  const dmp = new Diff();
  const diffs = dmp.diff_main(baseText, customText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs; // Array of [operation, text] tuples
}
```

### Comparison View Features

**Must-Have:**
1. **Synchronized Scrolling**: Both panes scroll together
2. **Diff Highlighting**: Clear visual indicators of changes
3. **Toggle Diff Mode**: Show all text vs. only differences
4. **Export Comparison**: PDF with highlighted differences

**Nice-to-Have:**
1. **Annotation Mode**: Users can comment on specific changes
2. **Accept/Reject Changes**: Like Word's track changes
3. **Version History**: See how customization evolved over time

### Mobile Considerations

- Use swipeable cards instead of tabs on mobile
- Single column layout for comparison (stacked view)
- Collapsible sections for long essays

**Source:** NextUI Tabs Documentation
- URL: https://www.heroui.com/docs/components/tabs

---

## 10. Web Scraping Best Practices (For School Information)

### Ethical Guidelines (2024)

**Must Follow:**
1. **Respect robots.txt**: Check `https://example.edu/robots.txt` before scraping
2. **Rate Limiting**: 1 request per 3-5 seconds for small sites, max 1-2 req/sec for large
3. **User Agent**: Identify your bot clearly with contact email
4. **Terms of Service**: Review and comply with website ToS

**Authority Level:** Industry Ethics Standards + Legal Guidance
- URL: https://www.hystruct.com/articles/ethical-web-scraping
- URL: https://aiqlabs.ai/blog/is-web-scraping-legal-and-ethical-in-2025

### Legal Considerations (2025)

**Key Ruling:** Bright Data vs Meta (2024) - Court upheld legality of public web scraping
**However:** Scraping without rate limiting or robots.txt adherence can mimic DDoS (illegal)

**Safe Harbor Rules:**
- Only scrape publicly accessible data (no login required)
- Don't scrape personal/sensitive information (GDPR, CCPA)
- Minimize data collection (only what's necessary)
- Provide opt-out mechanism for site owners

**Source:** Legal analysis of web scraping in 2025
- URL: https://aiqlabs.ai/blog/is-web-scraping-legal-and-ethical-in-2025

### Implementation Best Practices

```typescript
import axios from 'axios';
import robotsParser from 'robots-parser';

class EthicalScraper {
  private delays = new Map<string, number>();

  async checkRobotsTxt(url: string): Promise<boolean> {
    const baseUrl = new URL(url).origin;
    const robotsTxtUrl = `${baseUrl}/robots.txt`;

    try {
      const { data } = await axios.get(robotsTxtUrl);
      const robots = robotsParser(robotsTxtUrl, data);
      return robots.isAllowed(url, 'EssayDoctorBot');
    } catch {
      return true; // If no robots.txt, assume allowed
    }
  }

  async scrapeWithRateLimit(url: string): Promise<string> {
    const domain = new URL(url).hostname;
    const lastRequest = this.delays.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;

    // Enforce minimum 3 second delay
    if (timeSinceLastRequest < 3000) {
      await new Promise(resolve =>
        setTimeout(resolve, 3000 - timeSinceLastRequest)
      );
    }

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'EssayDoctorBot/1.0 (+https://essaydoctor.com/bot; contact@essaydoctor.com)'
      }
    });

    this.delays.set(domain, Date.now());
    return data;
  }
}
```

### Recommendation: Use APIs First

**Better Alternatives to Web Scraping:**

1. **IPEDS (Integrated Postsecondary Education Data System)**
   - Official US Department of Education database
   - All accredited colleges/universities
   - Free, no rate limits
   - URL: https://nces.ed.gov/ipeds/
   - API: Urban Institute Education Data Portal
   - URL: https://urban-institute.medium.com/how-we-built-the-api-for-the-education-data-portal-cabbf4814a45

2. **Common App API** (If available)
   - Official college list with standardized data
   - Requires partnership/API key

3. **College Scorecard API**
   - US Department of Education
   - Comprehensive college data
   - Free, public API
   - URL: https://collegescorecard.ed.gov/data/

**Authority Level:** Official Government Data Sources

### Caching Strategy for Scraped Data

**Critical:** Cache aggressively to minimize scraping frequency

```typescript
// School information changes rarely
const SCHOOL_INFO_TTL = 90 * 24 * 60 * 60; // 90 days

await redis.setex(
  `school:${schoolName}:info`,
  SCHOOL_INFO_TTL,
  JSON.stringify(schoolInfo)
);
```

### When Scraping is Necessary

**Use Cases:**
- School program pages (specific major information)
- "Why Major" essay prompts from school websites
- Department faculty/research focus areas

**Best Practice:**
1. Check cache first (90 day TTL)
2. Check if API available (IPEDS, College Scorecard)
3. Only scrape if no alternative exists
4. Store immediately in cache
5. Implement queue system for scraping to enforce rate limits

---

## Architecture Recommendation for EssayDoctor

### Phase 1: MVP (Current - Next 2 months)

**Processing:**
- Synchronous processing for 1-5 schools
- Use Next.js `after()` API for background completion
- Direct Claude API calls (not batch)

**Storage:**
- Implement Essay + EssayCustomVersion schema
- PostgreSQL for all data
- Redis for rate limiting only

**UI:**
- Simple multi-select for schools/majors
- Basic progress indicator
- Tabbed view for versions

**Data Source:**
- Manual school list (CSV import)
- Cache in PostgreSQL School table

**Estimated Development Time:** 2-3 weeks

### Phase 2: Scale (2-6 months)

**Processing:**
- BullMQ queue system
- Separate worker process on Railway
- Support 5-50 schools per batch
- Use Anthropic Batch API for non-urgent requests

**Storage:**
- Add Redis caching layer (school info, rate limits, essay cache)
- Implement diff storage for versions (optimization)

**UI:**
- Advanced progress tracking with notifications
- Side-by-side comparison view
- Bulk actions (retry failed, export all, etc.)

**Data Source:**
- Integrate IPEDS API for school data
- Optional: Ethical web scraping for program-specific info
- 90-day cache for all external data

**Estimated Development Time:** 4-6 weeks

### Phase 3: Polish (6+ months)

**Processing:**
- Predictive pre-generation (common schools)
- Smart batching (group similar majors)
- Cost optimization (batch API, caching, deduplication)

**Storage:**
- Multi-region Redis for global performance
- Archive old versions to cold storage

**UI:**
- AI-powered comparison insights
- Version analytics (which versions perform best)
- Collaborative features (share versions with counselors)

**Data Source:**
- Full integration with Common App API (if partnership secured)
- Real-time updates for school information
- User-contributed school/major database

---

## Cost Analysis

### Assumptions
- Average essay: 500 words = ~650 tokens
- Customization adds: 150 tokens (school/major specific content)
- Total per customization: 800 tokens input + 650 tokens output = 1,450 tokens

### Claude API Costs (January 2025)

**Regular API (Sonnet 3.5):**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- **Cost per customization**: $0.012

**Batch API (50% discount):**
- Input: $1.50 per 1M tokens
- Output: $7.50 per 1M tokens
- **Cost per customization**: $0.006

### Projected Costs

**10 schools per user:**
- Regular API: $0.12 per batch
- Batch API: $0.06 per batch

**1,000 users per month:**
- Regular API: $120/month
- Batch API: $60/month
- **Savings with Batch API: $60/month (50%)**

**Break-even on worker server:**
- Railway/Render: ~$5-10/month
- **ROI positive at 100 users/month**

### Pricing Recommendation

**Free Tier:** 3 schools per essay
**Pro Tier ($9.99/month):** Unlimited customizations
**Enterprise:** Custom pricing

---

## Implementation Checklist

### Week 1-2: Database & Core Logic
- [ ] Create Prisma schema (Essay, EssayCustomVersion, School)
- [ ] Implement school/major selection API
- [ ] Set up Redis for caching and rate limiting
- [ ] Create Claude API integration with retry logic
- [ ] Implement basic customization logic (single school)

### Week 3-4: Batch Processing & UI
- [ ] Multi-school input component (autocomplete + chips)
- [ ] Batch processing endpoint (synchronous initially)
- [ ] Progress indicator component (determinate progress bar)
- [ ] Error handling UI (partial failure display)
- [ ] Tabbed view for multiple versions

### Week 5-6: Polish & Testing
- [ ] Implement rate limiting (per-user and global)
- [ ] Add caching layer for school information
- [ ] Create comparison view (side-by-side diff)
- [ ] Add usage tracking and quotas
- [ ] Load testing with 10-20 schools per batch
- [ ] Error scenario testing (rate limits, API failures, etc.)

### Phase 2 (Future)
- [ ] Deploy BullMQ worker to Railway/Render
- [ ] Integrate Anthropic Batch API
- [ ] Implement school data API (IPEDS)
- [ ] Add advanced features (export, analytics, etc.)

---

## Key Takeaways

1. **Start Synchronous, Scale to Queue:** Begin with simple sync processing, migrate to BullMQ when needed
2. **Embrace Partial Failures:** Design for graceful degradation, not all-or-nothing
3. **Cache Aggressively:** School info rarely changes, cache for 90 days
4. **Use Batch API for Cost Savings:** 50% discount for non-urgent requests
5. **Progress Indicators are Critical:** Users will wait 3x longer with good feedback
6. **Store Full Versions, Not Diffs:** Simpler to implement, optimize later if needed
7. **Rate Limit at Multiple Levels:** User, global, and cost-based quotas
8. **Use APIs Over Scraping:** IPEDS and College Scorecard are authoritative and free
9. **Deploy Workers Separately:** BullMQ requires separate server (Railway, Render, Fly.io)
10. **Tabs for Primary, Side-by-Side for Comparison:** Follow GitHub/Notion patterns

---

## References

### Official Documentation
- Anthropic Claude API Rate Limits: https://docs.anthropic.com/en/api/rate-limits
- BullMQ Documentation: https://bullmq.io/
- NextUI Tabs: https://www.heroui.com/docs/components/tabs
- Redis Caching: https://redis.io/learn/howtos/solutions/caching-architecture/
- Prisma Multi-Schema: https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema

### Industry Best Practices
- AWS Batch Operations: https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/
- Nielsen Norman Group (Progress Indicators): https://www.nngroup.com/articles/progress-indicators/
- MongoDB Document Versioning: https://www.mongodb.com/blog/post/building-with-patterns-the-document-versioning-pattern
- Ethical Web Scraping (2024): https://www.hystruct.com/articles/ethical-web-scraping

### Real-World Examples
- GitHub Diff View: Side-by-side comparison pattern
- Grammarly Docs: Bulk editing and progress indicators
- Notion Database Views: Multiple view types and filtering
- ScholarshipOwl AI Essay Assistant: Similar use case

### Tools & Libraries
- rate-limiter-flexible: https://github.com/animir/node-rate-limiter-flexible
- archiver (zip): https://www.npmjs.com/package/archiver
- diff-match-patch: https://github.com/google/diff-match-patch
- react-diff-viewer: https://www.npmjs.com/package/react-diff-viewer

---

**Research Compiled By:** Claude (Anthropic)
**Date:** January 2025
**Project:** EssayDoctor - College Application Essay Platform
