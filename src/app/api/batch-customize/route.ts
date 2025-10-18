import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { processBatchCustomizations, checkBatchCustomizationQuota } from '@/lib/batch-processor';
import { rateLimit } from '@/lib/redis';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for PRO plan

const batchCustomizeSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters'),
  draftId: z.string().min(1, 'Draft ID is required'),
  schools: z
    .array(
      z.object({
        schoolName: z.string().min(2, 'School name must be at least 2 characters'),
        majorName: z.string().min(2, 'Major name must be at least 2 characters'),
      })
    )
    .min(1, 'At least one school is required')
    .max(10, 'Maximum 10 schools allowed per batch'),
});

export async function POST(request: NextRequest) {
  // 1. Authentication check
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;

  try {
    // 2. Parse and validate request body
    const body = await request.json();
    const validation = batchCustomizeSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: validation.error.errors[0].message,
          details: validation.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { essay, draftId, schools } = validation.data;

    // 3. Check rate limit (5 batches per hour)
    const limit = await rateLimit.check(`batch:customize:${userId}`, 5, 3600);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: limit.resetAt,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Check tier-based quota
    const quotaCheck = await checkBatchCustomizationQuota(userId, schools.length);
    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: quotaCheck.reason,
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          tier: quotaCheck.tier,
          upgradeUrl: '/pricing',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Create Server-Sent Events stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                total: schools.length,
                tier: quotaCheck.tier,
              })}\n\n`
            )
          );

          // Process each school
          for (let i = 0; i < schools.length; i++) {
            const school = schools[i];

            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'progress',
                  current: i + 1,
                  total: schools.length,
                  schoolName: school.schoolName,
                  majorName: school.majorName,
                  status: 'processing',
                })}\n\n`
              )
            );

            // Process single school
            const results = await processBatchCustomizations(userId, essay, [school]);
            const result = results[0];

            // Send result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'result',
                  index: i,
                  ...result,
                })}\n\n`
              )
            );

            // Save to database if successful
            if (result.status === 'success') {
              try {
                const prisma = (await import('@/lib/prisma')).default;
                await prisma.customization.create({
                  data: {
                    userId,
                    draftId,
                    schoolName: result.schoolName,
                    majorName: result.majorName,
                    originalEssay: essay,
                    customizedEssay: result.customizedEssay,
                    responseTime: result.responseTime,
                  },
                });
              } catch (dbError: any) {
                console.error('Failed to save customization:', dbError);
                // Don't fail the stream, just log
              }
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
        } catch (error: any) {
          // Send error
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message || 'An unexpected error occurred',
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('Batch customization error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process batch customization',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
