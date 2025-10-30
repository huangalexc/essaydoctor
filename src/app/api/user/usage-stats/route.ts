import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/usage-stats
 * Get current usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get subscription info
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const tier = subscription?.tier || 'FREE';

    // Get current period usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let usageTracking = await prisma.usageTracking.findFirst({
      where: {
        userId,
        periodStart: {
          lte: now,
        },
        periodEnd: {
          gte: now,
        },
      },
    });

    // Create usage tracking record if it doesn't exist for current period
    if (!usageTracking) {
      usageTracking = await prisma.usageTracking.create({
        data: {
          userId,
          periodStart,
          periodEnd,
          aiEditsCount: 0,
          customizationsCount: 0,
          schoolFetchesCount: 0,
        },
      });
    }

    // Get draft count
    const draftsCreated = await prisma.draft.count({
      where: { userId },
    });

    // Define limits based on tier
    const limits = {
      FREE: { aiEdits: 2, drafts: 2 },
      PLUS: { aiEdits: Infinity, drafts: Infinity },
      PRO: { aiEdits: Infinity, drafts: Infinity },
    };

    const tierLimits = limits[tier];

    return NextResponse.json({
      data: {
        aiEditsUsed: usageTracking?.aiEditsCount || 0,
        aiEditsLimit: tierLimits.aiEdits,
        draftsCreated,
        draftsLimit: tierLimits.drafts,
        tier,
      },
    });
  } catch (error: any) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}
