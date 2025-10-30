import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/openai';
import { generateCustomizationPrompt } from '@/lib/essay-principles';
import { rateLimit, cache } from '@/lib/redis';
import { CacheKeys } from '@/lib/cache-keys';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { guardAgainstInjection } from '@/lib/security/prompt-injection-guard';

const customizeSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters'),
  schoolName: z.string().min(2, 'School name is required'),
  majorName: z.string().min(2, 'Major name is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = customizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { essay, schoolName, majorName } = validation.data;
    const userId = session.user.id;

    // Check essay for prompt injection
    const essayGuard = guardAgainstInjection(essay, {
      userId,
      endpoint: '/api/essays/customize',
      maxLength: 15000,
      autoSanitize: true,
      blockOnSeverity: 'critical',
    });

    if (!essayGuard.allowed) {
      return NextResponse.json(
        {
          error: 'Content security check failed',
          reason: essayGuard.reason,
          severity: essayGuard.result.severity,
        },
        { status: 400 }
      );
    }

    const safeEssay = essayGuard.sanitizedContent || essay;

    // Check rate limit
    const limit = await rateLimit.check(`ai:customize:${userId}`, 20, 3600); // 20 per hour
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: limit.resetAt,
        },
        { status: 429 }
      );
    }

    // Check usage limits based on tier
    const usage = await prisma.usageTracking.findFirst({
      where: {
        userId,
        periodEnd: { gte: new Date() },
      },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const tier = subscription?.tier || 'FREE';
    const tierLimits = {
      FREE: 1,
      PLUS: 10,
      PRO: Infinity,
    };

    if (usage && usage.customizationsCount >= tierLimits[tier]) {
      return NextResponse.json(
        {
          error: `You've reached your ${tier} tier limit of ${tierLimits[tier]} customizations per month. Please upgrade to continue.`,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Get school/major data from cache or database
    const cacheKey = CacheKeys.school.data(schoolName, majorName);
    let schoolData = await cache.get<any>(cacheKey);

    if (!schoolData) {
      schoolData = await prisma.schoolMajorData.findUnique({
        where: {
          schoolName_majorName: {
            schoolName,
            majorName,
          },
        },
      });

      if (!schoolData) {
        return NextResponse.json(
          {
            error: `No data found for ${schoolName} - ${majorName}. Please fetch school data first.`,
            action: 'fetch',
          },
          { status: 404 }
        );
      }

      // Cache for 1 hour
      await cache.set(cacheKey, schoolData, 3600);
    }

    // Generate customized essay
    const customizationPrompt = generateCustomizationPrompt(safeEssay, schoolName, majorName, {
      programDescription: schoolData.programDescription,
      keyFeatures: schoolData.keyFeatures,
      keywords: schoolData.keywords,
    });

    const startTime = Date.now();
    const customizedEssay = await generateCompletion(customizationPrompt, {
      model: 'gpt-4-turbo-preview',
      maxTokens: 2500,
      temperature: 0.6, // Lower temperature for more consistent customization
      systemMessage: 'You are an expert at tailoring college essays to specific programs while maintaining the student\'s authentic voice.',
    });

    const responseTime = Date.now() - startTime;

    // Update usage tracking
    if (usage) {
      await prisma.usageTracking.update({
        where: { id: usage.id },
        data: { customizationsCount: usage.customizationsCount + 1 },
      });
    }

    return NextResponse.json({
      customizedEssay,
      school: schoolName,
      major: majorName,
      responseTime,
      remainingCustomizations:
        tier === 'FREE' || tier === 'PLUS'
          ? tierLimits[tier] - (usage?.customizationsCount || 0) - 1
          : 'unlimited',
    });
  } catch (error) {
    console.error('Essay customization error:', error);
    return NextResponse.json(
      { error: 'Failed to customize essay' },
      { status: 500 }
    );
  }
}
