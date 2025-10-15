import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/openai';
import { generateEssayEvaluationPrompt, ESSAY_PRINCIPLES } from '@/lib/essay-principles';
import { rateLimit } from '@/lib/redis';
import { useUsageStore } from '@/store';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const editSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
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
    const validation = editSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { essay, prompt } = validation.data;
    const userId = session.user.id;

    // Check rate limit
    const limit = await rateLimit.check(`ai:edit:${userId}`, 10, 3600); // 10 per hour
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
      FREE: 2,
      PLUS: Infinity,
      PRO: Infinity,
    };

    if (usage && usage.aiEditsCount >= tierLimits[tier]) {
      return NextResponse.json(
        {
          error: `You've reached your ${tier} tier limit of ${tierLimits[tier]} AI edits per month. Please upgrade to continue.`,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Generate AI feedback
    const startTime = Date.now();
    const evaluationPrompt = generateEssayEvaluationPrompt(essay, prompt);

    const feedback = await generateCompletion(evaluationPrompt, {
      model: 'gpt-4-turbo-preview',
      maxTokens: 3000,
      temperature: 0.7,
      systemMessage: 'You are an expert college essay editor with years of experience helping students craft compelling application essays.',
    });

    const responseTime = Date.now() - startTime;

    // Update usage tracking
    if (usage) {
      await prisma.usageTracking.update({
        where: { id: usage.id },
        data: { aiEditsCount: usage.aiEditsCount + 1 },
      });
    }

    // Log performance
    if (responseTime > 5000) {
      console.warn(`AI response took ${responseTime}ms - exceeds 5s target`);
    }

    return NextResponse.json({
      feedback,
      responseTime,
      remainingEdits: tier === 'FREE' ? tierLimits.FREE - (usage?.aiEditsCount || 0) - 1 : 'unlimited',
    });
  } catch (error) {
    console.error('Essay edit error:', error);
    return NextResponse.json(
      { error: 'Failed to generate essay feedback' },
      { status: 500 }
    );
  }
}
