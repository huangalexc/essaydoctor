import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/openai';
import { generateRewritePrompt } from '@/lib/essay-principles';
import { rateLimit } from '@/lib/redis';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { guardAgainstInjection } from '@/lib/security/prompt-injection-guard';

const rewriteSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  focusAreas: z.array(z.string()).optional().default([]),
  wordLimit: z.number().positive().optional(),
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
    const validation = rewriteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { essay, prompt, focusAreas, wordLimit } = validation.data;
    const userId = session.user.id;

    // Check essay for prompt injection
    const essayGuard = guardAgainstInjection(essay, {
      userId,
      endpoint: '/api/essays/rewrite',
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

    // Check prompt for injection
    const promptGuard = guardAgainstInjection(prompt, {
      userId,
      endpoint: '/api/essays/rewrite',
      maxLength: 1000,
      autoSanitize: true,
      blockOnSeverity: 'critical',
    });

    if (!promptGuard.allowed) {
      return NextResponse.json(
        {
          error: 'Prompt security check failed',
          reason: promptGuard.reason,
          severity: promptGuard.result.severity,
        },
        { status: 400 }
      );
    }

    const safeEssay = essayGuard.sanitizedContent || essay;
    const safePrompt = promptGuard.sanitizedContent || prompt;

    // Check rate limit
    const limit = await rateLimit.check(`ai:rewrite:${userId}`, 5, 3600); // 5 per hour
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
      FREE: 1, // Only 1 rewrite per month for free tier
      PLUS: Infinity,
      PRO: Infinity,
    };

    if (usage && usage.aiEditsCount >= tierLimits[tier]) {
      return NextResponse.json(
        {
          error: `You've reached your ${tier} tier limit of ${tierLimits[tier]} AI rewrites per month. Please upgrade to continue.`,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Generate AI rewrite
    const startTime = Date.now();
    const rewritePrompt = generateRewritePrompt(safeEssay, safePrompt, focusAreas, wordLimit);

    console.log('[REWRITE] Starting AI rewrite request...');
    console.log('[REWRITE] Focus areas:', focusAreas);
    console.log('[REWRITE] Word limit:', wordLimit);

    const rewriteText = await generateCompletion(rewritePrompt, {
      model: 'gpt-4-turbo-preview',
      maxTokens: 2000,
      temperature: 0.8,
      systemMessage: 'You are an expert college essay editor. Rewrite the essay to significantly improve quality while maintaining authenticity.',
    });

    const responseTime = Date.now() - startTime;
    console.log(`[REWRITE] AI response received in ${responseTime}ms`);
    console.log('[REWRITE] Raw response length:', rewriteText.length);
    console.log('[REWRITE] First 200 chars:', rewriteText.substring(0, 200));

    // Parse the rewrite response
    // Expected format:
    // ## Rewritten Essay
    // [essay text]
    // ## Key Changes Made
    // - [change 1]
    // ## Rationale
    // [explanation]

    const sections = {
      rewrittenEssay: '',
      keyChanges: [] as string[],
      rationale: '',
    };

    const rewriteLines = rewriteText.split('\n');
    let currentSection = '';

    for (const line of rewriteLines) {
      // Handle both "## Rewritten Essay" and "Rewritten Essay:" formats
      const trimmedLine = line.trim();

      if (trimmedLine.match(/^#{0,2}\s*Rewritten Essay:?/i)) {
        currentSection = 'essay';
        continue; // Skip the header line itself
      } else if (trimmedLine.match(/^#{0,2}\s*Key Changes( Made)?:?/i)) {
        currentSection = 'changes';
        continue; // Skip the header line itself
      } else if (trimmedLine.match(/^#{0,2}\s*Rationale:?/i)) {
        currentSection = 'rationale';
        continue; // Skip the header line itself
      }

      // Process content based on current section
      if (line.trim()) {
        if (currentSection === 'essay') {
          sections.rewrittenEssay += line + '\n';
        } else if (currentSection === 'changes' && line.startsWith('-')) {
          sections.keyChanges.push(line.substring(1).trim());
        } else if (currentSection === 'rationale') {
          sections.rationale += line + ' ';
        }
      }
    }

    // Log parsed sections
    console.log('[REWRITE] Parsed sections:');
    console.log('[REWRITE]   - Rewritten essay length:', sections.rewrittenEssay.length);
    console.log('[REWRITE]   - Key changes count:', sections.keyChanges.length);
    console.log('[REWRITE]   - Rationale length:', sections.rationale.length);

    // Update usage tracking
    if (usage) {
      await prisma.usageTracking.update({
        where: { id: usage.id },
        data: { aiEditsCount: usage.aiEditsCount + 1 },
      });
    }

    // Log performance
    if (responseTime > 10000) {
      console.warn(`AI rewrite took ${responseTime}ms - exceeds 10s target`);
    }

    const responseData = {
      rewrittenEssay: sections.rewrittenEssay.trim(),
      keyChanges: sections.keyChanges,
      rationale: sections.rationale.trim(),
      responseTime,
      remainingRewrites: tier === 'FREE' ? tierLimits.FREE - (usage?.aiEditsCount || 0) - 1 : 'unlimited',
    };

    console.log('[REWRITE] Sending response with rewritten essay length:', responseData.rewrittenEssay.length);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Essay rewrite error:', error);
    return NextResponse.json(
      { error: 'Failed to rewrite essay' },
      { status: 500 }
    );
  }
}
